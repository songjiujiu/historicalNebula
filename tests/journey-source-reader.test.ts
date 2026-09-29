// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createDynasticLibrary } from '../src/ui/dynastic-library';
const chapter = JSON.parse(readFileSync('public/data/histories/mingshi/024.json', 'utf8'));
const fetcher = vi.fn();
beforeEach(() => {
  document.body.replaceChildren(); localStorage.clear();
  history.replaceState(null, '', '/?library=mingshi&volume=24&from=ming-falls&scope=all#p6');
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  fetcher.mockReset().mockResolvedValue({ ok: true, json: async () => chapter });
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('keeps the exact sentence visible in simplified and traditional text, with a return to the event', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const onJourney = vi.fn();
  const reader = createDynasticLibrary(host, { onJourney, onShiji: vi.fn() }); reader.showFromUrl();
  await vi.waitFor(() => expect(host.querySelector('mark')?.textContent).toBe('帝崩于万岁山'));
  expect(host.querySelector('#dynasty-p6')?.classList.contains('book-target')).toBe(true);
  expect(host.querySelector('[data-library-status]')?.textContent).toContain('已定位');
  host.querySelector<HTMLButtonElement>('[data-library="script"]')!.click();
  await vi.waitFor(() => expect(host.querySelector('mark')?.textContent).toBe('帝崩於萬歲山'));
  expect(location.hash).toBe('#p6');
  host.querySelector<HTMLButtonElement>('[data-library="return-event"]')!.click();
  expect(onJourney).toHaveBeenCalledWith('ming-falls');
});
it('does not attach an unrelated event to a different paragraph', async () => {
  history.replaceState(null, '', '/?library=mingshi&volume=24&from=ming-falls#p1');
  const host = document.createElement('div'); document.body.append(host);
  createDynasticLibrary(host, { onJourney: vi.fn(), onShiji: vi.fn() }).showFromUrl();
  await vi.waitFor(() => expect(host.querySelector('#dynasty-p1.book-target')).toBeTruthy());
  expect(host.querySelector('.dynasty-event-return')).toBeNull();
  expect(host.querySelector('mark')).toBeNull();
});
