// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mountScrollEntrance } from '../src/ui/scroll-entrance';

class MotionPreference extends EventTarget {
  matches = false;
  readonly media = '(prefers-reduced-motion: reduce)';
  setReduced(reduced: boolean) {
    this.matches = reduced;
    this.dispatchEvent(new Event('change'));
  }
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

let preference: MotionPreference;
let frameCallbacks: Map<number, FrameRequestCallback>;
let nextFrame: number;
let controllers: ReturnType<typeof mountScrollEntrance>[];

function fixture(decodePromise = Promise.resolve()) {
  const host = document.createElement('div');
  host.innerHTML = `<section class="immersive-hero" data-scroll-state="waiting">
    <div class="scroll-stage" style="--scroll-front:14%">
      <div class="scroll-art"><img src="/scroll-poster.png" alt="历史卷轴"></div>
      <div class="scroll-turn" aria-hidden="true"></div>
    </div>
    <div class="scroll-eras"><button data-stage-era="qin">秦汉</button></div>
  </section>`;
  document.body.append(host);
  const poster = host.querySelector('img')!;
  const decode = vi.fn(() => decodePromise);
  Object.defineProperty(poster, 'decode', { value: decode, configurable: true });
  const controller = mountScrollEntrance(host);
  controllers.push(controller);
  return {
    host,
    hero: host.querySelector<HTMLElement>('.immersive-hero')!,
    stage: host.querySelector<HTMLElement>('.scroll-stage')!,
    button: host.querySelector<HTMLButtonElement>('button')!,
    decode,
    controller,
  };
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
  preference = new MotionPreference();
  frameCallbacks = new Map();
  nextFrame = 0;
  controllers = [];
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

it('shows the full scroll immediately for reduced motion without waiting for the poster', async () => {
  preference.matches = true;
  const poster = deferred();
  const { hero, decode, controller } = fixture(poster.promise);
  expect(hero.dataset.scrollState).toBe('open');
  expect(decode).not.toHaveBeenCalled();
  expect(requestAnimationFrame).not.toHaveBeenCalled();
  await controller.finished;
});

it('waits for the poster to decode before starting the opening animation', async () => {
  const poster = deferred();
  const { hero, stage, controller } = fixture(poster.promise);
  expect(hero.dataset.scrollState).toBe('waiting');
  expect(parseFloat(stage.style.getPropertyValue('--scroll-front'))).toBe(14);
  expect(frameCallbacks.size).toBe(0);
  poster.resolve();
  await decodeSettles();
  expect(hero.dataset.scrollState).toBe('opening');
  expect(frameCallbacks.size).toBe(1);
  controller.dispose();
  await controller.finished;
});

it('leaves the full scroll available when poster decoding fails', async () => {
  const poster = deferred();
  const { hero, controller } = fixture(poster.promise);
  poster.reject(new Error('poster unavailable'));
  await controller.finished;
  expect(hero.dataset.scrollState).toBe('open');
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

it('opens progressively and resolves once the full artwork is available', async () => {
  const { hero, stage, button, controller } = fixture();
  await decodeSettles();
  let finished = false;
  void controller.finished.then(() => { finished = true; });
  advanceFrame(1000);
  const initialFront = parseFloat(stage.style.getPropertyValue('--scroll-front'));
  advanceFrame(2200);
  const middleFront = parseFloat(stage.style.getPropertyValue('--scroll-front'));
  expect(middleFront).toBeGreaterThan(initialFront);
  expect(middleFront).toBeLessThan(100);
  expect(hero.dataset.scrollState).toBe('opening');
  expect(button.classList.contains('scroll-era-visible')).toBe(true);
  expect(finished).toBe(false);
  advanceFrame(4600);
  await controller.finished;
  expect(hero.dataset.scrollState).toBe('open');
  expect(frameCallbacks.size).toBe(0);
});

it('stops updating the DOM after disposal, including an already queued frame', async () => {
  const { host, hero, controller } = fixture();
  await decodeSettles();
  advanceFrame(1000);
  advanceFrame(1800);
  const staleFrame = [...frameCallbacks.values()][0];
  expect(staleFrame).toBeDefined();
  controller.dispose();
  await controller.finished;
  expect(hero.dataset.scrollState).toBe('open');
  const settledMarkup = host.innerHTML;
  staleFrame(3000);
  preference.setReduced(true);
  expect(host.innerHTML).toBe(settledMarkup);
  expect(frameCallbacks.size).toBe(0);
});

it('finishes on button focus while preserving the button click', async () => {
  const { hero, button, controller } = fixture();
  await decodeSettles();
  const onClick = vi.fn();
  button.addEventListener('click', onClick);
  button.focus();
  await controller.finished;
  expect(hero.dataset.scrollState).toBe('open');
  expect(document.activeElement).toBe(button);
  button.click();
  expect(onClick).toHaveBeenCalledOnce();
});

it('finishes immediately if reduced motion is enabled during the opening', async () => {
  const { hero, controller } = fixture();
  await decodeSettles();
  advanceFrame(1000);
  expect(hero.dataset.scrollState).toBe('opening');
  preference.setReduced(true);
  await controller.finished;
  expect(hero.dataset.scrollState).toBe('open');
  expect(frameCallbacks.size).toBe(0);
});
