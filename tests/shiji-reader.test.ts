// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { shijiChapters } from '../src/domain/shiji-book';

const chapter = (n: number) => JSON.parse(readFileSync(new NodeURL(`../public/data/shiji/${String(n).padStart(3, '0')}.json`, import.meta.url), 'utf8'));
const click = (selector: string) => { const button = document.querySelector<HTMLButtonElement>(selector)!; expect(button).toBeTruthy(); button.click(); };
const content = () => document.querySelector('#book-content')!.textContent!;
const loadReader = async () => (await import('../src/ui/shiji-reader')).openShijiReader;
const options = () => ({ onClose: vi.fn() });
beforeEach(() => {
  vi.resetModules(); document.body.replaceChildren(); localStorage.clear();
  // Happy DOM emits hashchange for pushState; browsers do not. Routing is exercised in browser QA.
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(history, 'replaceState').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(chapter(Number(url.match(/(\d{3})\.json$/)?.[1])))))));
});
afterEach(() => { if (document.querySelector<HTMLDialogElement>('.book-dialog')?.open) click('[data-book="close"]'); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('full-book reader interaction', () => {
  it('rejects stale loads, retries failures, preserves bookmarks and prevents late reopening', async () => {
    const openShijiReader = await loadReader();
    let resolveFirst: (value: Response) => void = () => {};
    let resolveLast: (value: Response) => void = () => {};
    let thirdAttempts = 0;
    const fetcher = vi.fn((url: string) => {
      if (url.endsWith('001.json')) return new Promise<Response>(resolve => { resolveFirst = resolve; });
      if (url.endsWith('004.json')) return new Promise<Response>(resolve => { resolveLast = resolve; });
      if (url.endsWith('003.json') && thirdAttempts++ === 0) return Promise.resolve(new Response('', { status: 503 }));
      const n = Number(url.match(/(\d{3})\.json$/)?.[1]);
      return Promise.resolve(new Response(JSON.stringify(chapter(n))));
    });
    vi.stubGlobal('fetch', fetcher);
    const onClose = vi.fn();
    const options = { onClose };
    openShijiReader({ ...options, volume: 1 });
    openShijiReader({ ...options, volume: 2, block: 'p2' });
    await vi.waitFor(() => expect(content(), document.querySelector('.book-status')?.textContent ?? '').toContain(shijiChapters[1].title));
    expect(document.querySelector('#book-p2')?.classList.contains('book-target')).toBe(true);
    resolveFirst(new Response(JSON.stringify(chapter(1))));
    await Promise.resolve(); await Promise.resolve();
    expect(document.querySelector('.book-article > h2')?.textContent).toBe(shijiChapters[1].title);
    click('[data-bookmark="p2"]');
    expect(document.querySelector('[data-bookmark="p2"]')?.getAttribute('aria-pressed')).toBe('true');
    click('[data-book="bookmarks"]');
    expect(content()).toContain('夏本纪');
    expect(content()).toContain('段落 p2');
    openShijiReader({ ...options, volume: 3 });
    await vi.waitFor(() => expect(content()).toContain('重新加载'));
    click('[data-book="retry"]');
    await vi.waitFor(() => expect(document.querySelector('.book-article > h2')?.textContent).toBe(shijiChapters[2].title));
    expect(thirdAttempts).toBe(2);
    openShijiReader({ ...options, volume: 4 });
    click('[data-book="close"]');
    resolveLast(new Response(JSON.stringify(chapter(4))));
    await Promise.resolve(); await Promise.resolve();
    expect(document.querySelector<HTMLDialogElement>('.book-dialog')?.open).toBe(false);
    expect(document.querySelector('.book-article')).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });

  it('starts beginners with a reading route, format explanations, and simplified original text', async () => {
    const openShijiReader = await loadReader();
    openShijiReader(options());
    expect(content()).toContain('先认识几个人，再读一段原文');
    expect(document.querySelectorAll('.book-format-guide dt')).toHaveLength(5);
    expect([...document.querySelectorAll('.book-featured [data-volume]')].map(el => (el as HTMLElement).dataset.volume)).toEqual(['48', '7', '8', '55', '92', '16']);
    click('.book-featured [data-volume="48"]');
    await vi.waitFor(() => expect(document.querySelector('.book-intro')?.textContent).toContain('陈涉就是陈胜'));
    expect(document.querySelector('.book-article > h2')?.textContent).toBe('陈涉世家');
    expect(document.querySelector('.book-intro')?.textContent).toContain('不是白话翻译');
    expect(document.querySelector('.book-text')?.textContent).toContain('陈胜者');
    expect(document.querySelector('[data-book="script"]')?.textContent).toBe('切换原字');
    click('[data-category="表"]');
    expect(document.querySelector('#book-category-hint')?.textContent).toContain('对照同一时期的大事');
    expect(document.querySelectorAll('#book-catalog [data-volume]')).toHaveLength(10);
  });

  it('preserves an existing original-script preference and identifies ancient accounts as uncertain', async () => {
    localStorage.setItem('historical-nebula:shiji-reader:v1', JSON.stringify({ simplified: false, bookmarks: [] }));
    const openShijiReader = await loadReader();
    openShijiReader({ ...options(), volume: 1 });
    await vi.waitFor(() => expect(document.querySelector('.book-article > h2')?.textContent).toBe('五帝本紀'));
    expect(document.querySelector('.book-intro-note')?.textContent).toContain('上古传说');
    expect(document.querySelector('.book-intro-note')?.textContent).toContain('无法确定到具体年份');
    click('[data-book="script"]');
    await vi.waitFor(() => expect(document.querySelector('.book-article > h2')?.textContent).toBe('五帝本纪'));
    expect(JSON.parse(localStorage.getItem('historical-nebula:shiji-reader:v1')!).simplified).toBe(true);
  });

  it('retains chapter reading without the retired graph indexes and actions', async () => {
    const openShijiReader = await loadReader();
    const handlers = options();
    openShijiReader({ ...handlers, volume: 7 });
    await vi.waitFor(() => expect(document.querySelector('.book-article > h2')?.textContent).toBe('项羽本纪'));
    expect(document.querySelector('.book-related-disclosure')).toBeNull();
    expect(document.querySelector('[data-reader-entity]')).toBeNull();
    expect(document.querySelector('.book-text')?.textContent).toContain('项籍');
  });

  it('opens a full guide from a late volume and closes the original reader', async () => {
    const openShijiReader = await loadReader();
    const handlers = { ...options(), onGuide: vi.fn() };
    openShijiReader({ ...handlers, volume: 130 });
    await vi.waitFor(() => expect(document.querySelector('[data-book="guide"]')).toBeTruthy());
    expect(document.querySelector('.book-intro')?.textContent).toContain('司马迁');
    click('[data-book="guide"]');
    expect(handlers.onGuide).toHaveBeenCalledWith(130);
    expect(handlers.onClose).toHaveBeenCalledOnce();
    expect(document.querySelector<HTMLDialogElement>('.book-dialog')?.open).toBe(false);
  });
});
