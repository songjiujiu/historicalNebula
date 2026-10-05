// @vitest-environment happy-dom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createHistoryComparison } from '../src/ui/history-comparison';
import { comparisonPeriods, worldEvents } from '../src/domain/world-history';

const click = (selector: string) => document.querySelector<HTMLElement>(selector)!.click();
function setup() {
  const host = document.createElement('div'); document.body.append(host);
  const onJourney = vi.fn();
  const view = createHistoryComparison(host, { onJourney }); view.showFromUrl();
  return { host, onJourney, view };
}
function change(selector: string, value: string, type = 'change') {
  const input = document.querySelector<HTMLInputElement>(selector)!;
  input.value = value; input.dispatchEvent(new Event(type, { bubbles: true }));
}
beforeEach(() => {
  document.body.replaceChildren(); history.replaceState(null, '', '/?compare=');
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it('renders both lanes, complete source links and meaningful scope information', () => {
  const { host } = setup();
  expect(host.querySelectorAll('.comparison-period')).toHaveLength(comparisonPeriods.length);
  expect(host.querySelectorAll('[data-world-event]')).toHaveLength(worldEvents.length);
  expect(host.textContent).toContain('同期发生不等于互有因果');
  for (const source of host.querySelectorAll<HTMLAnchorElement>('.comparison-source')) {
    expect(source.target).toBe('_blank'); expect(source.rel).toContain('noopener');
  }
});
it('restores direct links and changing filters preserves a usable keyboard focus', () => {
  history.replaceState(null, '', '/?compare=industrial');
  const { view } = setup();
  expect(document.querySelectorAll('.comparison-period')).toHaveLength(1);
  expect(document.querySelector('[data-world-event="meiji"]')).toBeTruthy();
  change('[data-compare-era]', 'qin-han');
  expect(location.search).toContain('compare=qin-han');
  expect(document.activeElement).toBe(document.querySelector('[data-compare-era]'));
  history.replaceState(null, '', '/?compare=industrial'); view.showFromUrl();
  expect(document.querySelector('[data-world-event="meiji"]')).toBeTruthy();
});
it('searches without replacing the input and provides an empty state and reset', () => {
  setup();
  const input = document.querySelector<HTMLInputElement>('[data-compare-search]')!; input.focus();
  change('[data-compare-search]', '屋大维', 'input');
  expect(document.querySelector('[data-compare-search]')).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(document.querySelector('[data-china-event="qin-unifies"]')).toBeTruthy();
  expect(document.querySelectorAll('.comparison-match')).toHaveLength(1);
  change('[data-compare-search]', '<img src=x onerror=alert(1)>', 'input');
  expect(document.querySelector('.comparison-empty')).toBeTruthy();
  expect(document.querySelector('img')).toBeNull();
  click('[data-compare-reset]');
  expect(document.querySelectorAll('.comparison-period')).toHaveLength(comparisonPeriods.length);
  expect(new URL(location.href).searchParams.has('q')).toBe(false);
});
it('keeps Chinese context during region filtering and supports native modified links', () => {
  const { onJourney } = setup();
  change('[data-compare-region]', '非洲');
  expect(document.querySelectorAll('[data-world-event]')).toHaveLength(1);
  expect(document.querySelector('[data-china-event="song-founded"]')).toBeTruthy();
  const anchor = document.querySelector<HTMLAnchorElement>('[data-compare-journey="song-founded"]')!;
  expect(anchor.href).toContain('journey=song-founded&scope=all');
  anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true, cancelable: true }));
  expect(onJourney).not.toHaveBeenCalled();
  anchor.click(); expect(onJourney).toHaveBeenCalledWith('song-founded');
});
it('copies the current comparison URL and exposes a manual fallback when clipboard fails', async () => {
  const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  setup(); change('[data-compare-era]', 'qin-han');
  click('[data-compare-share]'); await Promise.resolve();
  expect(clipboard).toHaveBeenCalledWith(location.href);
  expect(document.querySelector('[data-compare-share-status]')!.textContent).toContain('已复制');
  clipboard.mockRejectedValue(new Error('denied'));
  click('[data-compare-share]'); await Promise.resolve(); await Promise.resolve();
  expect(document.querySelector<HTMLInputElement>('[aria-label="对照链接"]')!.value).toBe(location.href);
});
