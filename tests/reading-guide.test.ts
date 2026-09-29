// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chapterGuide } from '../src/domain/chapter-guides';
import { createReadingGuide } from '../src/ui/reading-guide';
import type { ChapterText } from '../src/domain/shiji-book';
const { loadChapter } = vi.hoisted(() => ({ loadChapter: vi.fn() }));
vi.mock('../src/domain/shiji-book', async importOriginal => ({ ...await importOriginal<typeof import('../src/domain/shiji-book')>(), loadChapter }));
const KEY = 'historical-nebula:full-book-guides:v1';
const click = (selector: string) => { const button = document.querySelector<HTMLButtonElement>(selector); expect(button, selector).toBeTruthy(); button!.click(); };
const text = (selector: string) => document.querySelector(selector)?.textContent ?? '';
const setup = () => {
  const host = document.createElement('div'); document.body.append(host);
  const handlers = { onBook: vi.fn() };
  const reader = createReadingGuide(host, handlers); reader.showFromUrl();
  return { reader, ...handlers };
};
beforeEach(() => {
  document.body.replaceChildren(); localStorage.clear(); vi.clearAllMocks();
  history.replaceState(null, '', '/');
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  loadChapter.mockImplementation((volume: number) => Promise.resolve({ volume, blocks: chapterGuide(volume)!.sections.map(s => ({ id: s.block, kind: volume === 16 ? 'table' : 'paragraph', html: '', text: '这是对应的原文内容' })) }));
});
afterEach(() => vi.restoreAllMocks());

describe('full-book guided reading interaction', () => {
  it('filters all 130 guides by route, category and search, and pages the full directory', () => {
    setup();
    expect(document.querySelectorAll('.reading-route-cards button')).toHaveLength(8);
    expect(document.querySelectorAll('[data-reading-volume]')).toHaveLength(8);
    expect(document.querySelector('.reading-start')).toBeNull();
    expect(document.querySelector('[data-reading-action="stories"]')).toBeNull();
    click('[data-reading-route="complete"]');
    expect(text('.reading-results-caption')).toContain('130 卷');
    expect(document.querySelectorAll('[data-reading-volume]')).toHaveLength(24);
    click('[data-reading-action="more"]'); expect(document.querySelectorAll('[data-reading-volume]')).toHaveLength(48);
    click('[data-reading-category="表"]');
    expect(document.querySelectorAll('[data-reading-volume]')).toHaveLength(10);
    expect(text('.reading-category-explanation')).toContain('同一时期');
    click('[data-reading-category=""]');
    const query = document.querySelector<HTMLInputElement>('#reading-query')!;
    query.value = '孔子'; query.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('[data-reading-volume="47"]')).toBeTruthy();
    expect(text('.reading-results-caption')).toContain('全书搜索');
    query.value = '不存在的名字xyz'; query.dispatchEvent(new Event('input', { bubbles: true }));
    expect(text('.reading-empty')).toContain('没有找到');
  });

  it('moves through guides, preserves progress and opens exact original paragraphs', async () => {
    const { reader, onBook } = setup();
    click('[data-reading-volume="48"]');
    expect(text('h1')).toBe('陈涉世家');
    click('[data-reading-action="next"]');
    expect(text('.story-current-step h2')).toBe(chapterGuide(48)!.sections[1].title);
    expect(reader.readingUrl).toContain('reading=48&section=1');
    click('[data-reading-action="source"]');
    expect(onBook).toHaveBeenLastCalledWith(48, chapterGuide(48)!.sections[1].block);
    expect(document.querySelector('[data-reading-action="explore"]')).toBeNull();
    click('[data-reading-action="whole"]'); expect(onBook).toHaveBeenLastCalledWith(48);
    click('[data-reading-action="next"]');
    expect(text('.story-outcome')).toContain(chapterGuide(48)!.takeaway);
    click('[data-reading-action="next"]');
    expect(text('h1')).toBe('项羽本纪');
    expect(JSON.parse(localStorage.getItem(KEY)!).completed).toEqual([48]);
    click('[data-reading-action="prev"]');
    expect(text('.story-current-step h2')).toBe(chapterGuide(48)!.sections[2].title);
    click('[data-reading-action="catalog"]'); click('[data-reading-action="resume"]');
    expect(reader.readingUrl).toContain('reading=48&section=2');
    await vi.waitFor(() => expect(text('.reading-source-preview')).toContain('这是对应的原文内容'));
  });

  it('keeps a late preview from replacing a newer volume and recovers a failed load', async () => {
    let resolveFirst!: (value: ChapterText) => void;
    loadChapter.mockImplementationOnce(() => new Promise<ChapterText>(resolve => { resolveFirst = resolve; })).mockRejectedValueOnce(new Error('offline'));
    const { reader } = setup(); reader.openVolume(1); reader.openVolume(2);
    await vi.waitFor(() => expect(text('.reading-source-preview')).toContain('重新加载原文'));
    click('[data-reading-action="retry-source"]');
    await vi.waitFor(() => expect(text('.reading-source-preview')).toContain('这是对应的原文内容'));
    resolveFirst({ volume: 1, blocks: [{ id: chapterGuide(1)!.sections[0].block, kind: 'paragraph', html: '', text: '过期的第一卷内容' }] });
    await Promise.resolve(); await Promise.resolve();
    expect(text('.reading-source-preview')).not.toContain('过期');
    reader.openVolume(16);
    await vi.waitFor(() => expect(text('.reading-source-preview')).toContain('先认表头'));
    expect(text('.reading-source-preview')).not.toContain('这是对应的原文内容');
  });

  it('restores valid progress and distinguishes reaching the last guide from finishing all guides', () => {
    localStorage.setItem(KEY, JSON.stringify({ recent: { volume: 130, section: 999, route: 'complete' }, completed: [1, 131] }));
    setup(); click('[data-reading-action="resume"]');
    expect(text('.story-current-step h2')).toBe(chapterGuide(130)!.sections[2].title);
    click('[data-reading-action="next"]');
    expect(text('.reading-completion')).toContain('2 / 130');
    expect(JSON.parse(localStorage.getItem(KEY)!).completed).toEqual([1, 130]);
    expect(document.querySelector('.reading-completion')?.classList.contains('hidden')).toBe(false);
  });
});
