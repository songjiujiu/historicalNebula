// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';

vi.mock('../src/ui/reading-atmosphere', () => ({ attachReadingModelPreviews: vi.fn(), readingAtmosphere: () => '' }));

it('opens the comparison through the real app router, enters a Chinese event and restores filters on popstate', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  document.documentElement.dataset.theme = 'light';
  history.replaceState(null, '', '/?compare=qin-han&q=屋大维');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  await import('../src/main');
  await vi.waitFor(() => expect(document.querySelector('[data-world-event="rome"]')).toBeTruthy());
  expect(document.querySelector('[data-action="history-comparison"]')!.getAttribute('aria-current')).toBe('page');
  expect(document.querySelector('.skip-link')!.getAttribute('href')).toBe('#comparison-root');
  expect(document.querySelector('#journey-root')!.classList.contains('hidden')).toBe(true);
  const comparisonHref = location.href;
  document.querySelector<HTMLAnchorElement>('[data-compare-journey="qin-unifies"]')!.click();
  expect(location.search).toContain('journey=qin-unifies');
  expect(document.querySelector('#comparison-root')!.classList.contains('hidden')).toBe(true);
  expect(document.querySelector('#journey-root h1')!.textContent).toContain('秦统一六国');
  expect(document.querySelector('#journey-root [data-journey-source]')).toBeTruthy();
  history.replaceState(null, '', comparisonHref); window.dispatchEvent(new PopStateEvent('popstate'));
  expect(document.querySelector('#comparison-root')!.classList.contains('hidden')).toBe(false);
  expect(document.querySelector<HTMLInputElement>('[data-compare-search]')!.value).toBe('屋大维');
  expect(document.querySelectorAll('.comparison-period')).toHaveLength(1);
  document.querySelector<HTMLElement>('[data-action="history-comparison"]')!.click();
  expect(location.search).toBe('?compare=');
  expect(document.querySelectorAll('.comparison-period')).toHaveLength(12);
  vi.restoreAllMocks();
});
