import './reading-atmosphere.css';

export type ReadingAtmosphereKind = 'desk' | 'archive' | 'modern';
const scenes = {
  desk: { model: 'reading-desk', label: '摊开的线装书、毛笔与墨砚', caption: '一册在手，慢慢读懂' },
  archive: { model: 'archive-books', label: '古籍、卷轴与书签的藏书陈列', caption: '循着书页，找到时代' },
  modern: { model: 'modern-archive', label: '古籍与近现代纸本文献的档案陈列', caption: '从王朝，读到今天' },
};

/** Modelled in Blender; historical content stays in native text. */
export function readingAtmosphere(kind: ReadingAtmosphereKind, compact = false): string {
  const scene = scenes[kind];
  return `<figure class="reading-atmosphere${compact ? ' reading-atmosphere-compact' : ''}" data-atmosphere="${kind}">
    <div class="reading-model" data-reading-model="${scene.model}">
      <img src="${import.meta.env.BASE_URL}models/reading/${scene.model}-poster.png" width="1200" height="800" alt="${scene.label}" loading="lazy" decoding="async">
      <div class="reading-model-canvas" aria-hidden="true"></div>
    </div>
    ${compact ? '' : `<figcaption><span>${scene.caption}</span><button type="button" data-reading-preview aria-pressed="false" aria-label="转动${scene.label}">转动陈列 ↗</button></figcaption><span class="reading-model-status" role="status" aria-live="polite"></span>`}
  </figure>`;
}

/** Model loading is optional. Release a scene as soon as its page is left. */
export function attachReadingModelPreviews(root: HTMLElement) {
  const active = new Map<HTMLElement, { cancel: () => void }>();
  const isVisible = (figure: HTMLElement) => figure.isConnected && !figure.closest('.hidden') &&
    (!figure.closest('dialog') || figure.closest('dialog')!.open);
  function stop(figure: HTMLElement) { active.get(figure)?.cancel(); active.delete(figure); }
  async function onClick(event: MouseEvent) {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-reading-preview]');
    const figure = button?.closest<HTMLElement>('.reading-atmosphere');
    const stage = figure?.querySelector<HTMLElement>('.reading-model');
    if (!button || !figure || !stage) return;
    if (active.has(figure)) { stop(figure); return; }
    const status = figure.querySelector<HTMLElement>('.reading-model-status');
    if (!('WebGLRenderingContext' in window)) {
      if (status) status.textContent = '当前浏览器支持陈列图欣赏。';
      return;
    }
    const abort = new AbortController();
    let cancelled = false, dispose: (() => void) | undefined;
    const cancel = () => {
      if (cancelled) return;
      cancelled = true; abort.abort(); dispose?.();
      button.disabled = false; button.textContent = '转动陈列 ↗'; button.setAttribute('aria-pressed', 'false');
      stage.removeAttribute('aria-busy'); if (status) status.textContent = '';
    };
    const stopCurrent = () => { if (active.get(figure)?.cancel === cancel) stop(figure); };
    active.set(figure, { cancel });
    button.disabled = true; stage.setAttribute('aria-busy', 'true');
    if (status) status.textContent = '正在打开陈列…';
    try {
      const module = await import('./reading-models');
      if (cancelled || !isVisible(figure)) { stopCurrent(); return; }
      dispose = await module.openReadingModel(stage, abort.signal);
      if (cancelled || !isVisible(figure)) { dispose(); stopCurrent(); return; }
      button.disabled = false; button.textContent = '还原陈列 ↙'; button.setAttribute('aria-pressed', 'true');
      stage.removeAttribute('aria-busy'); if (status) status.textContent = '拖动转动 · 方向键查看';
    } catch {
      if (cancelled) return;
      stopCurrent(); if (status) status.textContent = '暂时无法转动，仍可欣赏陈列图。';
    }
  }
  function onKey(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    const figure = (event.target as Element).closest<HTMLElement>('.reading-atmosphere');
    if (figure && active.has(figure)) { event.preventDefault(); event.stopPropagation(); stop(figure); }
  }
  function onUnavailable(event: Event) {
    const figure = (event.target as Element).closest<HTMLElement>('.reading-atmosphere');
    if (!figure) return;
    stop(figure);
    const status = figure.querySelector<HTMLElement>('.reading-model-status');
    if (status) status.textContent = '已恢复陈列图，可以重新尝试转动。';
  }
  const observer = new MutationObserver(() => {
    active.forEach((_, figure) => { if (!isVisible(figure)) stop(figure); });
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'open'] });
  root.addEventListener('click', onClick); root.addEventListener('keydown', onKey); root.addEventListener('reading-model-unavailable', onUnavailable);
  return () => { active.forEach((_, figure) => stop(figure)); observer.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); root.removeEventListener('reading-model-unavailable', onUnavailable); };
}
