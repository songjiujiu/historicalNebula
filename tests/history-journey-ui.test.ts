// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHistoryJourney } from '../src/ui/history-journey';
import { journeyEvent, journeyEvents, journeyEras, quickJourneyIds } from '../src/domain/history-journey';
const click = (selector: string) => document.querySelector<HTMLButtonElement>(selector)!.click();
function setup() {
  const host = document.createElement('div'); document.body.append(host);
  const onSource = vi.fn(), onLibrary = vi.fn();
  const reader = createHistoryJourney(host, { onSource, onLibrary }); reader.showFromUrl();
  return { reader, onSource, onLibrary };
}
beforeEach(() => {
  document.body.replaceChildren(); localStorage.clear(); history.replaceState(null, '', '/');
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
it('starts small, includes every era, and lets readers find all events by era or name', () => {
  setup();
  expect(document.querySelectorAll('.journey-event-card')).toHaveLength(quickJourneyIds.length);
  expect(new Set(quickJourneyIds.map(id => journeyEvent(id)!.era)).size).toBe(journeyEras.length);
  click('[data-journey-scope="all"]');
  expect(document.querySelectorAll('.journey-event-card')).toHaveLength(journeyEvents.length);
  click('[data-journey-era="northsouth"]');
  expect(document.querySelector('.journey-results')!.textContent).toContain('两条北方支线曾同时存在');
  expect(document.querySelectorAll('.journey-event-card')).toHaveLength(journeyEvents.filter(event => event.era === 'northsouth').length);
  click('[data-journey-era=""]');
  const search = document.querySelector<HTMLInputElement>('[data-journey-search]')!;
  search.value = '不存在的历史人名xyz'; search.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('.journey-empty')).toBeTruthy();
  search.value = '赤壁'; search.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('[data-journey-event="red-cliffs"]')).toBeTruthy();
});
it('opens exact sources, preserves reading order and only marks progress on request', () => {
  history.replaceState(null, '', '/?journey=sui-unifies');
  const { onSource, reader } = setup();
  expect(document.querySelectorAll('[data-journey-source]')).toHaveLength(3);
  expect(document.querySelector('[data-journey-progress]')!.textContent).toContain('0 /');
  click('[data-journey-source="1"]');
  expect(onSource).toHaveBeenCalledWith(journeyEvent('sui-unifies'), journeyEvent('sui-unifies')!.sources[1]);
  click('[data-journey-action="complete"]');
  expect(JSON.parse(localStorage.getItem('historical-nebula:journey:v1')!).read).toEqual(['sui-unifies']);
  click('.journey-next');
  expect(location.search).toContain('journey=an-lushan');
  history.replaceState(null, '', '/?journey=sui-unifies'); reader.showFromUrl();
  expect(document.querySelector('[data-journey-action="complete"]')!.getAttribute('aria-pressed')).toBe('true');
});
it('restores direct links and offers a useful fallback for invalid events', () => {
  history.replaceState(null, '', '/?journey=not-real');
  const { reader } = setup();
  expect(document.querySelector('.journey-hero')).toBeTruthy();
  history.replaceState(null, '', '/?journey=ming-falls&scope=all'); reader.showFromUrl();
  expect(document.querySelector('h1')!.textContent).toContain('北京失守');
  expect(document.querySelector('[data-journey-source]')!.getAttribute('href')).toContain('library=mingshi&volume=24&from=ming-falls');
  expect(document.querySelector('.journey-next')).toBeNull();
  click('[data-journey-action="home"]');
  expect(location.search).toContain('scope=all');
});
it('switches eras and reading scope in place, keeping the selected control focused instead of jumping to the hero', () => {
  const { reader } = setup();
  const search = document.querySelector<HTMLInputElement>('[data-journey-search]')!;
  const rail = document.querySelector<HTMLElement>('.journey-rail nav')!;
  rail.scrollLeft = 160;
  const era = document.querySelector<HTMLButtonElement>('[data-journey-era="threejin"]')!;
  era.focus(); era.click();
  expect(document.activeElement).toBe(era);
  expect(document.querySelector('[data-journey-search]')).toBe(search);
  expect(document.querySelector('.journey-rail nav')).toBe(rail);
  expect(rail.scrollLeft).toBe(160);
  expect(era.getAttribute('aria-current')).toBe('page');
  expect(document.querySelector('[data-journey-scope="all"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(location.search).toContain('era=threejin');
  expect(document.querySelectorAll('.journey-event-card')).toHaveLength(4);
  click('[data-journey-scope="quick"]');
  expect(document.querySelectorAll('.journey-event-card')).toHaveLength(3);
  expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  // Popstate restores the filters without replacing the mounted sidebar either.
  history.replaceState(null, '', '/?journey=&era=northsouth&scope=all'); reader.showFromUrl();
  expect(document.querySelector('.journey-rail nav')).toBe(rail);
  expect(document.querySelector('[data-journey-era="northsouth"]')!.getAttribute('aria-current')).toBe('page');
  click('[data-journey-event="liu-song"]');
  expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(document.querySelector('h1'));
});
