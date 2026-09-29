// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHistoryGuides } from '../src/ui/history-guides';
import { loadDynasticChapter, type DynasticText } from '../src/domain/dynastic-library';
import { historyBookGuides, historyGuideSteps } from '../src/domain/history-guides';

vi.mock('../src/domain/dynastic-library', async importOriginal => ({
  ...await importOriginal<typeof import('../src/domain/dynastic-library')>(), loadDynasticChapter: vi.fn(),
}));
const chapter = (book: string, volume: number): DynasticText => JSON.parse(readFileSync(`public/data/histories/${book}/${String(volume).padStart(3, '0')}.json`, 'utf8'));
let host: HTMLElement;
const callbacks = () => ({ onShiji: vi.fn(), onSource: vi.fn(), onBook: vi.fn() });
const click = (selector: string) => host.querySelector<HTMLButtonElement>(selector)!.click();
const input = (selector: string, value: string) => { const element = host.querySelector<HTMLInputElement>(selector)!; element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); };
beforeEach(() => {
  history.replaceState(null, '', '/?histories='); localStorage.clear();
  document.body.innerHTML = '<div id="guide-test"></div>'; host = document.querySelector('#guide-test')!;
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.mocked(loadDynasticChapter).mockReset().mockImplementation(async (book, volume) => chapter(book.id, volume));
});
afterEach(() => { vi.restoreAllMocks(); });
it('offers all 24 books, searches traditional names, resets empty filters and enters existing Shiji guides', () => {
  const actions = callbacks(), ui = createHistoryGuides(host, actions); ui.showFromUrl();
  expect(host.querySelectorAll('.hg-card')).toHaveLength(24);
  click('[data-hg-book="shiji"]'); expect(actions.onShiji).toHaveBeenCalledOnce();
  input('[data-hg-search]', '後漢書'); expect(host.querySelectorAll('.hg-card')).toHaveLength(1);
  click('[data-hg-group="明"]'); expect(host.querySelectorAll('.hg-card')).toHaveLength(0);
  click('[data-hg-action="clear-search"]'); expect(host.querySelectorAll('.hg-card')).toHaveLength(24);
});
it('renders every book with background, people, explanation, takeaway and an actual source preview', async () => {
  const ui = createHistoryGuides(host, callbacks());
  for (const guide of historyBookGuides) {
    history.replaceState(null, '', `/?histories=${guide.book}`); ui.showFromUrl();
    const step = historyGuideSteps(guide.book)[0];
    expect(host.querySelector('.story-background')?.textContent).toContain(guide.background);
    expect(host.querySelector('.reading-cast')?.textContent).toBeTruthy();
    expect(host.querySelector('.hg-event')?.textContent).toContain(step.event.happening);
    expect(host.querySelector('.story-outcome')?.textContent).toContain(guide.takeaway);
    await vi.waitFor(() => expect(host.querySelector('.reading-source-preview mark')?.textContent).toBe(step.sources[0].cue));
  }
});
it('keeps book-specific event progress, source selection, original catalog and resumed deep links', async () => {
  history.replaceState(null, '', '/?histories=yuanshi');
  const actions = callbacks(), ui = createHistoryGuides(host, actions); ui.showFromUrl();
  click('[data-hg-action="next"]');
  expect(location.search).toContain('step=yuan-unifies');
  expect(host.querySelector('.reading-detail-top')?.textContent).toContain('已读 1 / 2');
  click('[data-hg-source="1"]');
  await vi.waitFor(() => expect(host.querySelector('.reading-source-preview mark')?.textContent).toBe('张弘范将兵追宋二王至崖山寨'));
  click('[data-hg-action="source"]');
  expect(actions.onSource).toHaveBeenCalledWith('yuanshi', 'yuan-unifies', expect.objectContaining({ book: 'yuanshi', volume: 10, block: 'p14' }));
  click('[data-hg-action="chapters"]'); expect(host.querySelector<HTMLDetailsElement>('.hg-chapters')?.open).toBe(true);
  input('[data-hg-chapter-search]', '210'); click('.hg-chapter-list [data-hg-volume="210"]');
  expect(actions.onBook).toHaveBeenCalledWith('yuanshi', 210);
  click('[data-hg-action="home"]'); click('[data-hg-action="resume"]');
  expect(location.search).toContain('step=yuan-unifies');
  history.replaceState(null, '', '/?histories=mingshi&step=ming-falls'); ui.showFromUrl();
  expect(host.querySelector('.reading-detail-top')?.textContent).toContain('已读 0 / 4');
  click('[data-hg-action="next"]');
  expect(host.querySelector('.reading-detail-top')?.textContent).toContain('已读 1 / 4');
  expect(host.querySelector('.story-outcome')?.textContent).not.toContain('已完成');
});
it('does not show stale previews after navigation and lets failed loads retry', async () => {
  let resolveOld!: (value: DynasticText) => void;
  vi.mocked(loadDynasticChapter).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  history.replaceState(null, '', '/?histories=hanshu');
  const ui = createHistoryGuides(host, callbacks()); ui.showFromUrl();
  history.replaceState(null, '', '/?histories=jinshu'); ui.showFromUrl();
  await vi.waitFor(() => expect(host.querySelector('.reading-source-preview mark')?.textContent).toBe('孙皓大惧'));
  resolveOld(chapter('hanshu', 4)); await Promise.resolve(); await Promise.resolve();
  expect(host.querySelector('.reading-source-preview mark')?.textContent).toBe('孙皓大惧');
  vi.mocked(loadDynasticChapter).mockRejectedValueOnce(new Error('Offline'));
  history.replaceState(null, '', '/?histories=mingshi'); ui.showFromUrl();
  await vi.waitFor(() => expect(host.querySelector('[data-hg-action="retry"]')).toBeTruthy());
  click('[data-hg-action="retry"]');
  await vi.waitFor(() => expect(host.querySelector('.reading-source-preview mark')?.textContent).toBe('定有天下之号曰明'));
});
