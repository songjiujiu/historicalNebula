// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi, type Mock } from 'vitest';
import { attachReadingModelPreviews, readingAtmosphere } from '../src/ui/reading-atmosphere';

const { openReadingModel } = vi.hoisted(() => ({ openReadingModel: vi.fn() }));
vi.mock('../src/ui/reading-models', () => ({ openReadingModel }));

type Scene = { dispose: Mock<() => void>; canvas: HTMLCanvasElement };
let sessions: Scene[];
let detach: (() => void)[];

function liveScene(stage: HTMLElement): Scene {
  const canvas = document.createElement('canvas');
  stage.querySelector('.reading-model-canvas')!.append(canvas);
  stage.classList.add('is-interactive');
  const dispose = vi.fn(() => { canvas.remove(); stage.classList.remove('is-interactive'); });
  const scene = { canvas, dispose }; sessions.push(scene);
  return scene;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}

function setup(dialog = false) {
  const page = document.createElement(dialog ? 'dialog' : 'section');
  if (dialog) page.setAttribute('open', '');
  page.innerHTML = readingAtmosphere('desk');
  document.body.append(page);
  detach.push(attachReadingModelPreviews(document.body));
  return {
    page,
    stage: page.querySelector<HTMLElement>('.reading-model')!,
    poster: page.querySelector<HTMLImageElement>('img')!,
    button: page.querySelector<HTMLButtonElement>('[data-reading-preview]')!,
    status: page.querySelector<HTMLElement>('[role=status]')!,
  };
}

beforeEach(() => {
  document.body.replaceChildren(); sessions = []; detach = [];
  vi.stubGlobal('WebGLRenderingContext', class {});
  openReadingModel.mockReset().mockImplementation(async (stage: HTMLElement) => liveScene(stage).dispose);
});

afterEach(() => {
  detach.forEach(dispose => dispose());
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it('keeps the readable poster until the visitor requests the model', async () => {
  const { button, stage, poster, status } = setup();
  expect(poster.alt).toBeTruthy();
  expect(openReadingModel).not.toHaveBeenCalled();
  button.click();
  expect(button.disabled).toBe(true);
  expect(stage.getAttribute('aria-busy')).toBe('true');
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  expect(openReadingModel).toHaveBeenCalledExactlyOnceWith(stage, expect.any(AbortSignal));
  expect(poster.isConnected).toBe(true);
  expect(stage.contains(sessions[0].canvas)).toBe(true);
  expect(status.textContent).toContain('方向键');
  expect(stage.hasAttribute('aria-busy')).toBe(false);
});

it.each(['toggle', 'Escape'] as const)('restores the same poster and releases the scene with %s', async action => {
  const { button, stage, poster, status } = setup();
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  if (action === 'toggle') button.click();
  else {
    const key = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    stage.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);
  }
  expect(sessions[0].dispose).toHaveBeenCalledOnce();
  expect(stage.querySelector('canvas')).toBeNull();
  expect(stage.querySelector('img')).toBe(poster);
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(button.disabled).toBe(false);
  expect(status.textContent).toBe('');
  button.click();
  await vi.waitFor(() => expect(openReadingModel).toHaveBeenCalledTimes(2));
  expect(sessions[0].dispose).toHaveBeenCalledOnce();
  expect(sessions[1].dispose).not.toHaveBeenCalled();
});

it('disposes the previous page and still handles a newly rendered page through delegation', async () => {
  const { page, button } = setup();
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  const previous = sessions[0];
  page.innerHTML = readingAtmosphere('archive');
  await vi.waitFor(() => expect(previous.dispose).toHaveBeenCalledOnce());
  expect(previous.canvas.isConnected).toBe(false);
  const nextButton = page.querySelector<HTMLButtonElement>('[data-reading-preview]')!;
  const nextStage = page.querySelector<HTMLElement>('.reading-model')!;
  nextButton.click();
  await vi.waitFor(() => expect(nextButton.getAttribute('aria-pressed')).toBe('true'));
  expect(openReadingModel).toHaveBeenLastCalledWith(nextStage, expect.any(AbortSignal));
  expect(previous.dispose).toHaveBeenCalledOnce();
  expect(page.querySelectorAll('canvas')).toHaveLength(1);
});

it.each(['hidden page', 'closed dialog'] as const)('releases an active scene when its container becomes a %s', async reason => {
  const { page, button, stage } = setup(reason === 'closed dialog');
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  if (reason === 'closed dialog') (page as HTMLDialogElement).open = false;
  else page.classList.add('hidden');
  await vi.waitFor(() => expect(sessions[0].dispose).toHaveBeenCalledOnce());
  expect(stage.querySelector('canvas')).toBeNull();
  expect(button.getAttribute('aria-pressed')).toBe('false');
});

it('releases a late loading result after navigation without mounting it on the new page', async () => {
  const pending = deferred<() => void>();
  openReadingModel.mockImplementationOnce(() => pending.promise);
  const { page, button, stage } = setup();
  button.click();
  await vi.waitFor(() => expect(openReadingModel).toHaveBeenCalledOnce());
  page.innerHTML = readingAtmosphere('modern');
  await vi.waitFor(() => expect(button.disabled).toBe(false));
  const late = liveScene(stage); pending.resolve(late.dispose);
  await vi.waitFor(() => expect(late.dispose).toHaveBeenCalledOnce());
  expect(page.querySelector('canvas')).toBeNull();
  expect(stage.querySelector('canvas')).toBeNull();
  expect(page.querySelector('[data-reading-preview]')?.getAttribute('aria-pressed')).toBe('false');
});

it('does not stack model loads when the preview button is clicked twice during loading', async () => {
  const pending = deferred<() => void>();
  openReadingModel.mockImplementationOnce(() => pending.promise);
  const { button, stage } = setup();
  button.click(); button.click();
  await vi.waitFor(() => expect(openReadingModel).toHaveBeenCalledOnce());
  expect(button.disabled).toBe(true);
  const scene = liveScene(stage); pending.resolve(scene.dispose);
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  expect(openReadingModel).toHaveBeenCalledOnce();
  expect(stage.querySelectorAll('canvas')).toHaveLength(1);
  expect(scene.dispose).not.toHaveBeenCalled();
});

it('cancels a pending preview with Escape and disposes its late result once', async () => {
  const pending = deferred<() => void>();
  openReadingModel.mockImplementationOnce(() => pending.promise);
  const { button, stage, poster, status } = setup();
  button.click();
  await vi.waitFor(() => expect(openReadingModel).toHaveBeenCalledOnce());
  stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  expect(button.disabled).toBe(false);
  expect(stage.hasAttribute('aria-busy')).toBe(false);
  expect((openReadingModel.mock.calls[0][1] as AbortSignal).aborted).toBe(true);
  const late = liveScene(stage); pending.resolve(late.dispose);
  await vi.waitFor(() => expect(late.dispose).toHaveBeenCalledOnce());
  expect(stage.querySelector('img')).toBe(poster);
  expect(stage.querySelector('canvas')).toBeNull();
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(status.textContent).toBe('');
});

it('keeps the poster readable after a failed load and allows another attempt', async () => {
  openReadingModel.mockRejectedValueOnce(new Error('Network unavailable'));
  const { button, poster, stage, status } = setup();
  button.click();
  await vi.waitFor(() => expect(status.textContent).toContain('仍可欣赏陈列图'));
  expect(stage.querySelector('img')).toBe(poster);
  expect(button.disabled).toBe(false);
  expect(button.getAttribute('aria-pressed')).toBe('false');
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  expect(openReadingModel).toHaveBeenCalledTimes(2);
});

it('keeps the new preview alive when an earlier cancelled load finishes on the same figure', async () => {
  const pending = deferred<() => void>();
  openReadingModel.mockImplementationOnce(() => pending.promise);
  const { button, stage } = setup();
  button.click();
  await vi.waitFor(() => expect(openReadingModel).toHaveBeenCalledOnce());
  stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const previousSignal = openReadingModel.mock.calls[0][1] as AbortSignal;
  expect(previousSignal.aborted).toBe(true);
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  const current = sessions[0], lateDispose = vi.fn();
  pending.resolve(lateDispose);
  await vi.waitFor(() => expect(lateDispose).toHaveBeenCalledOnce());
  expect(current.dispose).not.toHaveBeenCalled();
  expect((openReadingModel.mock.calls[1][1] as AbortSignal).aborted).toBe(false);
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(stage.contains(current.canvas)).toBe(true);
});

it('restores the poster after graphics become unavailable and permits a fresh preview', async () => {
  const { button, stage, poster, status } = setup();
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  const previous = sessions[0];
  stage.dispatchEvent(new Event('reading-model-unavailable', { bubbles: true }));
  expect(previous.dispose).toHaveBeenCalledOnce();
  expect((openReadingModel.mock.calls[0][1] as AbortSignal).aborted).toBe(true);
  expect(stage.querySelector('canvas')).toBeNull();
  expect(stage.querySelector('img')).toBe(poster);
  expect(button.disabled).toBe(false);
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(status.textContent).toContain('可以重新尝试');
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  expect(openReadingModel).toHaveBeenCalledTimes(2);
  expect(previous.dispose).toHaveBeenCalledOnce();
  expect(stage.querySelectorAll('canvas')).toHaveLength(1);
});

it('detaches the controller, releases live resources, and stops responding to later clicks', async () => {
  const { button, stage } = setup();
  button.click();
  await vi.waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
  detach[0]();
  expect(sessions[0].dispose).toHaveBeenCalledOnce();
  expect(stage.querySelector('canvas')).toBeNull();
  button.click();
  await Promise.resolve();
  expect(openReadingModel).toHaveBeenCalledOnce();
});

it('leaves the poster and native reading content usable without WebGL', () => {
  vi.stubGlobal('WebGLRenderingContext', undefined);
  delete (window as unknown as { WebGLRenderingContext?: unknown }).WebGLRenderingContext;
  const { button, poster, stage, status } = setup();
  button.click();
  expect(openReadingModel).not.toHaveBeenCalled();
  expect(poster.isConnected).toBe(true);
  expect(stage.querySelector('canvas')).toBeNull();
  expect(status.textContent).toContain('陈列图欣赏');
});
