// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest';
import { mountBookOpening } from '../src/ui/book-opening';

const { createBookOpeningScene } = vi.hoisted(() => ({ createBookOpeningScene: vi.fn() }));
vi.mock('../src/ui/book-opening-scene', () => ({ createBookOpeningScene }));

type Scene = { render: Mock<(progress: number) => void>; durationMs: number; dispose: Mock<() => void> };
type SceneOptions = { id: string; signal: AbortSignal; onUnavailable: () => void };
function scene(): Scene { return { render: vi.fn(), durationMs: 3200, dispose: vi.fn() }; }

class MotionPreference extends EventTarget {
  matches = false;
  readonly media = '(prefers-reduced-motion: reduce)';
  setReduced(reduced: boolean) {
    this.matches = reduced;
    this.dispatchEvent(new Event('change'));
  }
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

let preference: MotionPreference;
let frameCallbacks: Map<number, FrameRequestCallback>;
let nextFrame: number;
let controllers: ReturnType<typeof mountBookOpening>[];
let scenes: Scene[];

function fixture(options: { decode?: Promise<void>; width?: number; withStage?: boolean } = {}) {
  const host = document.createElement('div');
  host.innerHTML = options.withStage === false ? '' : `<div class="shelf-display">
    <div class="books-stage" data-history-model="history-books">
      <img src="/models/history/history-books-poster.png" width="1026" height="334" alt="史书书架">
      <div class="stage-canvas" aria-hidden="true"></div>
      <div class="book-hotspots">
        <a data-stage-book="shiji" href="/?mode=guide">史记</a>
        <a data-stage-book="hanshu" href="/?mode=history-guide&book=hanshu">汉书</a>
        <a data-stage-book="sanguozhi" href="/?mode=history-guide&book=sanguozhi">三国志</a>
        <a data-stage-book="jiutangshu" href="/?mode=history-guide&book=jiutangshu">旧唐书</a>
        <a data-stage-book="qingshigao" href="/?mode=modern-guide">清史稿</a>
      </div>
    </div>
  </div>`;
  document.body.append(host);
  const stage = host.querySelector<HTMLElement>('.books-stage');
  const poster = host.querySelector<HTMLImageElement>('img');
  const bounds = new DOMRect(240, 360, options.width ?? 1026, 334);
  if (stage) vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(bounds);
  const decode = vi.fn(() => options.decode ?? Promise.resolve());
  if (poster) {
    Object.defineProperty(poster, 'decode', { value: decode, configurable: true });
    Object.defineProperty(poster, 'complete', { value: true, configurable: true });
    Object.defineProperty(poster, 'naturalWidth', { value: 2052, configurable: true });
    Object.defineProperty(poster, 'naturalHeight', { value: 668, configurable: true });
    vi.spyOn(poster, 'getBoundingClientRect').mockReturnValue(bounds);
  }
  const onOpen = vi.fn();
  const controller = mountBookOpening(host, onOpen);
  controllers.push(controller);
  return { host, stage, poster, decode, onOpen, controller };
}

function advanceFrame(now: number) {
  const callbacks = [...frameCallbacks.values()];
  frameCallbacks.clear();
  callbacks.forEach(callback => callback(now));
}

async function decodeSettles() {
  await vi.waitFor(() => expect(createBookOpeningScene).toHaveBeenCalled(), { timeout: 1000 });
  for (let count = 0; count < 8; count++) await Promise.resolve();
}

async function flushAsync() {
  for (let count = 0; count < 12; count++) await Promise.resolve();
}

beforeEach(() => {
  document.body.replaceChildren();
  history.replaceState({}, '', '/');
  preference = new MotionPreference();
  frameCallbacks = new Map();
  nextFrame = 0;
  controllers = [];
  scenes = [];
  createBookOpeningScene.mockReset().mockImplementation(async () => {
    const model = scene(); scenes.push(model); return model;
  });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('matchMedia', vi.fn(() => preference));
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frameCallbacks.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frameCallbacks.delete(id)));
});

afterEach(() => {
  controllers.forEach(controller => controller.dispose());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it.each(['shiji', 'hanshu', 'sanguozhi', 'jiutangshu', 'qingshigao'])(
  'opens %s once, only after the animation and its temporary UI are cleaned up',
  async id => {
    const { host, stage, onOpen, controller } = fixture();
    onOpen.mockImplementation(() => {
      expect(document.querySelector('.book-opening-overlay')).toBeNull();
      expect(stage!.dataset.openingBook).toBeUndefined();
      expect(host.hasAttribute('aria-busy')).toBe(false);
      expect(frameCallbacks.size).toBe(0);
      expect(scenes[0].dispose).toHaveBeenCalledOnce();
    });
    controller.open(id);
    await decodeSettles();
    expect(stage!.dataset.openingBook).toBe(id);
    expect(document.querySelector('.book-opening-overlay')).not.toBeNull();
    expect(onOpen).not.toHaveBeenCalled();
    advanceFrame(1000);
    advanceFrame(1800);
    expect(onOpen).not.toHaveBeenCalled();
    expect(scenes[0].render).not.toHaveBeenLastCalledWith(1);
    advanceFrame(7000);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(id);
    expect(scenes[0].render).toHaveBeenLastCalledWith(1);
    expect(scenes[0].dispose).toHaveBeenCalledOnce();
    preference.setReduced(true);
    advanceFrame(6000);
    expect(onOpen).toHaveBeenCalledOnce();
  },
);

it('keeps the first selected book when another book is clicked during the opening', async () => {
  const { stage, onOpen, controller } = fixture();
  controller.open('hanshu');
  controller.open('qingshigao');
  await decodeSettles();
  advanceFrame(1000);
  controller.open('sanguozhi');
  expect(stage!.dataset.openingBook).toBe('hanshu');
  expect(document.querySelectorAll('.book-opening-overlay')).toHaveLength(1);
  advanceFrame(7000);
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('hanshu');
});

it('cancels a pending opening on disposal even if poster decoding finishes later', async () => {
  const pending = deferred();
  const { stage, onOpen, controller } = fixture({ decode: pending.promise });
  controller.open('shiji');
  controller.dispose();
  pending.resolve();
  await flushAsync();
  advanceFrame(3000);
  expect(onOpen).not.toHaveBeenCalled();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(frameCallbacks.size).toBe(0);
});

it('does not navigate or recreate temporary UI from an already queued frame after disposal', async () => {
  const { stage, onOpen, controller } = fixture();
  controller.open('shiji');
  await decodeSettles();
  advanceFrame(1000);
  const staleFrame = [...frameCallbacks.values()][0];
  expect(staleFrame).toBeDefined();
  controller.dispose();
  staleFrame(3000);
  preference.setReduced(true);
  controller.open('hanshu');
  expect(onOpen).not.toHaveBeenCalled();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(frameCallbacks.size).toBe(0);
});

it.each(['escape', 'resize', 'detached host', 'changed URL', 'browser history', 'hidden page'])(
  'cancels without redirecting when there is a %s during the opening',
  async reason => {
    const { host, stage, onOpen, controller } = fixture();
    controller.open('jiutangshu');
    await decodeSettles();
    advanceFrame(1000);
    if (reason === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (reason === 'resize') window.dispatchEvent(new Event('resize'));
    if (reason === 'detached host') host.remove();
    if (reason === 'changed URL') history.replaceState({}, '', '/?mode=guide');
    if (reason === 'browser history') window.dispatchEvent(new PopStateEvent('popstate'));
    if (reason === 'hidden page') {
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
    }
    advanceFrame(1200);
    advanceFrame(6000);
    expect(onOpen).not.toHaveBeenCalled();
    expect(document.querySelector('.book-opening-overlay')).toBeNull();
    expect(stage!.dataset.openingBook).toBeUndefined();
    expect(frameCallbacks.size).toBe(0);
  },
);

it.each(['reduced motion', 'hidden page'])('enters directly for %s without creating animated UI', async reason => {
  if (reason === 'reduced motion') preference.matches = true;
  if (reason === 'hidden page') vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  const { stage, decode, onOpen, controller } = fixture();
  controller.open('sanguozhi');
  await flushAsync();
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('sanguozhi');
  expect(decode).not.toHaveBeenCalled();
  expect(createBookOpeningScene).not.toHaveBeenCalled();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it('completes immediately when reduced motion is enabled during the opening', async () => {
  const { stage, onOpen, controller } = fixture();
  controller.open('hanshu');
  await decodeSettles();
  advanceFrame(1000);
  preference.setReduced(true);
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('hanshu');
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(frameCallbacks.size).toBe(0);
});

it('still enters the chosen guide when the cover poster cannot be decoded', async () => {
  const pending = deferred();
  const { stage, onOpen, controller } = fixture({ decode: pending.promise });
  controller.open('qingshigao');
  pending.reject(new Error('poster unavailable'));
  await flushAsync();
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('qingshigao');
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(frameCallbacks.size).toBe(0);
});

it.each([{ withStage: false }, { width: 0 }])('falls back to the guide when the stage cannot be displayed: %j', async options => {
  const { onOpen, controller } = fixture(options);
  controller.open('shiji');
  await flushAsync();
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('shiji');
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it.each(['missing-book', '__proto__'])('ignores unknown book %s instead of constructing an invalid opening or redirect', async id => {
  const { onOpen, controller } = fixture();
  controller.open(id);
  await flushAsync();
  expect(onOpen).not.toHaveBeenCalled();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it('releases a late model after cancellation without starting its animation or following its old route', async () => {
  const pending = deferred<Scene>();
  createBookOpeningScene.mockImplementationOnce(() => pending.promise);
  const { host, stage, onOpen, controller } = fixture();
  controller.open('shiji');
  await decodeSettles();
  const options = createBookOpeningScene.mock.calls[0][1] as SceneOptions;
  expect(options.id).toBe('shiji');
  expect(options.signal.aborted).toBe(false);
  controller.dispose();
  expect(options.signal.aborted).toBe(true);
  const late = scene(); pending.resolve(late);
  await flushAsync();
  advanceFrame(7000);
  expect(late.dispose).toHaveBeenCalledOnce();
  expect(late.render).not.toHaveBeenCalled();
  expect(onOpen).not.toHaveBeenCalled();
  expect(host.hasAttribute('aria-busy')).toBe(false);
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
});

it('honors reduced motion while a model is loading and releases the late model without replaying the opening', async () => {
  const pending = deferred<Scene>();
  createBookOpeningScene.mockImplementationOnce(() => pending.promise);
  const { onOpen, controller } = fixture();
  controller.open('hanshu');
  await decodeSettles();
  preference.setReduced(true);
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('hanshu');
  expect((createBookOpeningScene.mock.calls[0][1] as SceneOptions).signal.aborted).toBe(true);
  const late = scene(); pending.resolve(late);
  await flushAsync();
  expect(late.dispose).toHaveBeenCalledOnce();
  expect(late.render).not.toHaveBeenCalled();
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(onOpen).toHaveBeenCalledOnce();
});

it('keeps a new book opening alive when the previous cancelled model resolves later', async () => {
  const pending = deferred<Scene>();
  createBookOpeningScene.mockImplementationOnce(() => pending.promise);
  const { stage, onOpen, controller } = fixture();
  controller.open('shiji');
  await decodeSettles();
  const previousOptions = createBookOpeningScene.mock.calls[0][1] as SceneOptions;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(previousOptions.signal.aborted).toBe(true);
  controller.open('hanshu');
  await vi.waitFor(() => expect(createBookOpeningScene).toHaveBeenCalledTimes(2));
  await flushAsync();
  const currentOptions = createBookOpeningScene.mock.calls[1][1] as SceneOptions;
  const current = scenes[0];
  expect(stage!.dataset.openingBook).toBe('hanshu');
  const late = scene(); pending.resolve(late);
  await flushAsync();
  expect(late.dispose).toHaveBeenCalledOnce();
  expect(current.dispose).not.toHaveBeenCalled();
  expect(currentOptions.signal.aborted).toBe(false);
  expect(stage!.dataset.openingBook).toBe('hanshu');
  expect(document.querySelectorAll('.book-opening-overlay')).toHaveLength(1);
  advanceFrame(1000); advanceFrame(7000);
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('hanshu');
  expect(current.dispose).toHaveBeenCalledOnce();
});

it.each(['WebGL unavailable', 'model download failed'])('opens the guide once when %s prevents the modeled animation', async reason => {
  createBookOpeningScene.mockRejectedValueOnce(new Error(reason));
  const { host, stage, onOpen, controller } = fixture();
  controller.open('qingshigao');
  await vi.waitFor(() => expect(onOpen).toHaveBeenCalledExactlyOnceWith('qingshigao'));
  const options = createBookOpeningScene.mock.calls[0][1] as SceneOptions;
  expect(options.signal.aborted).toBe(true);
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(host.hasAttribute('aria-busy')).toBe(false);
  expect(frameCallbacks.size).toBe(0);
  options.onUnavailable();
  expect(onOpen).toHaveBeenCalledOnce();
});

it('cleans up before navigating once after a WebGL context loss', async () => {
  const { host, stage, onOpen, controller } = fixture();
  controller.open('sanguozhi');
  await decodeSettles();
  const model = scenes[0];
  const options = createBookOpeningScene.mock.calls[0][1] as SceneOptions;
  advanceFrame(1000); advanceFrame(1800);
  options.onUnavailable();
  expect(model.dispose).toHaveBeenCalledOnce();
  expect(options.signal.aborted).toBe(true);
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('sanguozhi');
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(stage!.dataset.openingBook).toBeUndefined();
  expect(host.hasAttribute('aria-busy')).toBe(false);
  expect(frameCallbacks.size).toBe(0);
  options.onUnavailable(); advanceFrame(7000);
  expect(onOpen).toHaveBeenCalledOnce();
  expect(model.dispose).toHaveBeenCalledOnce();
});

it('does not let an old graphics failure cancel a later opening', async () => {
  const { stage, onOpen, controller } = fixture();
  controller.open('shiji');
  await decodeSettles();
  const previousOptions = createBookOpeningScene.mock.calls[0][1] as SceneOptions;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  controller.open('hanshu');
  await vi.waitFor(() => expect(createBookOpeningScene).toHaveBeenCalledTimes(2));
  await flushAsync();
  previousOptions.onUnavailable();
  expect(stage!.dataset.openingBook).toBe('hanshu');
  expect(scenes[1].dispose).not.toHaveBeenCalled();
  expect(onOpen).not.toHaveBeenCalled();
  advanceFrame(1000); advanceFrame(7000);
  expect(onOpen).toHaveBeenCalledExactlyOnceWith('hanshu');
});

it('still opens the guide if rendering or GPU cleanup fails', async () => {
  const model = scene();
  model.render.mockImplementation(() => { throw new Error('lost graphics device'); });
  model.dispose.mockImplementation(() => { throw new Error('GPU cleanup failed'); });
  createBookOpeningScene.mockResolvedValueOnce(model);
  const { host, onOpen, controller } = fixture();
  controller.open('jiutangshu');
  await vi.waitFor(() => expect(onOpen).toHaveBeenCalledExactlyOnceWith('jiutangshu'));
  expect(model.dispose).toHaveBeenCalledOnce();
  expect(host.hasAttribute('aria-busy')).toBe(false);
  expect(document.querySelector('.book-opening-overlay')).toBeNull();
  expect(frameCallbacks.size).toBe(0);
});

it('does not trap the reader behind a model download that never finishes', async () => {
  const pending = deferred<Scene>();
  createBookOpeningScene.mockImplementationOnce(() => pending.promise);
  vi.useFakeTimers();
  try {
    const { host, onOpen, controller } = fixture();
    controller.open('shiji');
    await decodeSettles();
    const options = createBookOpeningScene.mock.calls[0][1] as SceneOptions;
    await vi.advanceTimersByTimeAsync(4600);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('shiji');
    expect(options.signal.aborted).toBe(true);
    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(document.querySelector('.book-opening-overlay')).toBeNull();
    const late = scene(); pending.resolve(late);
    await flushAsync();
    expect(late.dispose).toHaveBeenCalledOnce();
    expect(late.render).not.toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalledOnce();
  } finally { vi.useRealTimers(); }
});
