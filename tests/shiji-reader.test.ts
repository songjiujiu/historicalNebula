// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import { shijiChapters } from '../src/domain/shiji-book';
vi.mock('../src/domain/data', () => ({ entities: [] }));
vi.mock('../src/domain/shiji-full-data', () => ({ shijiGraphReport: { people: 5297, events: 3197 } }));
import { openShijiReader } from '../src/ui/shiji-reader';

const chapter = (n: number) => JSON.parse(readFileSync(new NodeURL(`../public/data/shiji/${String(n).padStart(3, '0')}.json`, import.meta.url), 'utf8'));
const click = (selector: string) => { const button = document.querySelector<HTMLButtonElement>(selector)!; expect(button).toBeTruthy(); button.click(); };
const content = () => document.querySelector('#book-content')!.textContent!;
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('full-book reader interaction', () => {
  it('rejects stale loads, retries failures, preserves bookmarks and prevents late reopening', async () => {
    // Happy DOM emits hashchange for pushState; browsers do not. Routing is exercised in browser QA.
    vi.spyOn(history, 'pushState').mockImplementation(() => {});
    vi.spyOn(history, 'replaceState').mockImplementation(() => {});
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
    const options = { onEntity: vi.fn(), onClose };
    openShijiReader({ ...options, volume: 1 });
    openShijiReader({ ...options, volume: 2, block: 'p2' });
    await vi.waitFor(() => expect(content(), document.querySelector('.book-status')?.textContent ?? '').toContain(shijiChapters[1].originalTitle));
    expect(document.querySelector('#book-p2')?.classList.contains('book-target')).toBe(true);
    resolveFirst(new Response(JSON.stringify(chapter(1))));
    await Promise.resolve(); await Promise.resolve();
    expect(document.querySelector('.book-article > h2')?.textContent).toBe(shijiChapters[1].originalTitle);
    click('[data-bookmark="p2"]');
    expect(document.querySelector('[data-bookmark="p2"]')?.getAttribute('aria-pressed')).toBe('true');
    click('[data-book="bookmarks"]');
    expect(content()).toContain('夏本纪');
    expect(content()).toContain('段落 p2');
    openShijiReader({ ...options, volume: 3 });
    await vi.waitFor(() => expect(content()).toContain('重新加载'));
    click('[data-book="retry"]');
    await vi.waitFor(() => expect(document.querySelector('.book-article > h2')?.textContent).toBe(shijiChapters[2].originalTitle));
    expect(thirdAttempts).toBe(2);
    openShijiReader({ ...options, volume: 4 });
    click('[data-book="close"]');
    resolveLast(new Response(JSON.stringify(chapter(4))));
    await Promise.resolve(); await Promise.resolve();
    expect(document.querySelector<HTMLDialogElement>('.book-dialog')?.open).toBe(false);
    expect(document.querySelector('.book-article')).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
