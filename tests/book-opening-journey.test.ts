// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHistoryJourney } from '../src/ui/history-journey';

// These tests cover journey routing during a book transition, not the separate scroll entrance.
vi.mock('../src/ui/scroll-entrance', () => ({
  mountScrollEntrance: () => ({ finished: Promise.resolve(), dispose: vi.fn() }),
}));
vi.mock('../src/ui/history-model-viewer', () => ({ mountHistoryModels: async () => vi.fn() }));

let readers: ReturnType<typeof createHistoryJourney>[];
let frameCallbacks: Map<number, FrameRequestCallback>;
let nextFrame: number;

function fixture() {
  const host = document.createElement('div');
  document.body.append(host);
  const onGuide = vi.fn();
  const reader = createHistoryJourney(host, { onSource: vi.fn(), onLibrary: vi.fn(), onGuide });
  readers.push(reader);
  reader.showFromUrl();
  return { host, onGuide, reader };
}

function advanceFrame(now: number) {
  const callbacks = [...frameCallbacks.values()];
  frameCallbacks.clear();
  callbacks.forEach(callback => callback(now));
}

async function decodeSettles() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  history.replaceState({}, '', '/');
  readers = [];
  frameCallbacks = new Map();
  nextFrame = 0;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.matches('.books-stage') ? new DOMRect(240, 360, 1026, 334) : new DOMRect();
  });
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue();
  const preference = Object.assign(new EventTarget(), { matches: false, media: '(prefers-reduced-motion: reduce)' });
  vi.stubGlobal('matchMedia', vi.fn(() => preference));
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frameCallbacks.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frameCallbacks.delete(id)));
});

afterEach(() => {
  readers.forEach(reader => reader.hide());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it.each(['.book-hotspots', '.shelf-links'])('opens the selected guide after clicking its book control in %s', async controls => {
  const { host, onGuide } = fixture();
  const book = host.querySelector<HTMLAnchorElement>(`${controls} [data-stage-book="hanshu"]`)!;
  const click = new MouseEvent('click', { bubbles: true, cancelable: true });
  book.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(book.href).toContain('histories=hanshu');
  await decodeSettles();
  expect(document.querySelector('.book-opening-overlay')).not.toBeNull();
  expect(onGuide).not.toHaveBeenCalled();
  advanceFrame(1000);
  advanceFrame(1800);
  expect(onGuide).not.toHaveBeenCalled();
  advanceFrame(3000);
  expect(onGuide).toHaveBeenCalledExactlyOnceWith('hanshu');
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
});

it.each([
  { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 },
])('preserves native book links for a modified click: %j', async modifiers => {
  const { host, onGuide } = fixture();
  const book = host.querySelector<HTMLAnchorElement>('.book-hotspots [data-stage-book="shiji"]')!;
  let preventedByJourney: boolean | undefined;
  // Stop native navigation only after the application's delegated listener has run.
  document.addEventListener('click', event => {
    preventedByJourney = event.defaultPrevented;
    event.preventDefault();
  }, { once: true });
  book.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers }));
  await decodeSettles();
  expect(preventedByJourney).toBe(false);
  expect(book.getAttribute('href')).toBeTruthy();
  expect(onGuide).not.toHaveBeenCalled();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(frameCallbacks.size).toBe(0);
});

it('cancels an opening when the journey is hidden and ignores its already queued frame', async () => {
  const { host, onGuide, reader } = fixture();
  host.querySelector<HTMLAnchorElement>('.book-hotspots [data-stage-book="sanguozhi"]')!.click();
  await decodeSettles();
  advanceFrame(1000);
  const staleFrame = [...frameCallbacks.values()][0];
  reader.hide();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  staleFrame(3000);
  expect(onGuide).not.toHaveBeenCalled();
  expect(frameCallbacks.size).toBe(0);
  expect(host.hasAttribute('aria-busy')).toBe(false);
});

it('cancels a stale opening on route refresh and can open a new book after returning home', async () => {
  const { host, onGuide, reader } = fixture();
  host.querySelector<HTMLAnchorElement>('.book-hotspots [data-stage-book="jiutangshu"]')!.click();
  await decodeSettles();
  advanceFrame(1000);
  history.replaceState({}, '', '/?journey=qin-unifies');
  reader.showFromUrl();
  expect(host.querySelector('.journey-detail')).not.toBeNull();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  advanceFrame(3000);
  expect(onGuide).not.toHaveBeenCalled();
  history.replaceState({}, '', '/');
  reader.showFromUrl();
  host.querySelector<HTMLAnchorElement>('.shelf-links [data-stage-book="qingshigao"]')!.click();
  await decodeSettles();
  advanceFrame(4000);
  advanceFrame(6000);
  expect(onGuide).toHaveBeenCalledExactlyOnceWith('qingshigao');
});

it('keeps a deliberately selected history event instead of redirecting to an earlier book', async () => {
  const { host, onGuide } = fixture();
  host.querySelector<HTMLAnchorElement>('.book-hotspots [data-stage-book="shiji"]')!.click();
  await decodeSettles();
  advanceFrame(1000);
  host.querySelector<HTMLButtonElement>('.stage-event')!.click();
  expect(location.search).toContain('journey=qin-unifies');
  expect(host.querySelector('.journey-detail')).not.toBeNull();
  advanceFrame(3000);
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(onGuide).not.toHaveBeenCalled();
});
