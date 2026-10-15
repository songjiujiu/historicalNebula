import { escapeHtml as esc } from './icons';
import type { BookOpeningScene } from './book-opening-scene';
import './book-opening.css';

// These silhouettes belong to the existing 1026 × 334 Blender shelf poster.
const books = {
  shiji: { points: [[56,33],[75,24],[237,8],[271,249],[264,256],[84,263]] },
  hanshu: { points: [[282,36],[301,33],[434,35],[438,246],[282,249]] },
  sanguozhi: { points: [[460,36],[478,34],[609,35],[614,245],[461,248]] },
  jiutangshu: { points: [[636,36],[656,33],[787,35],[790,245],[637,248]] },
  qingshigao: { points: [[811,37],[830,34],[956,35],[961,245],[812,248]] },
} satisfies Record<string, { points: number[][] }>;
const liftMs = 450;
const smooth = (value: number) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); };

/** A real, finite GLB opening; navigation follows the final settled spread. */
export function mountBookOpening(host: HTMLElement, onOpen: (id: string) => void) {
  let disposed = false;
  let cancelCurrent: (() => void) | undefined;

  function open(id: string) {
    if (disposed || cancelCurrent || !Object.hasOwn(books, id)) return;
    const book = books[id as keyof typeof books];
    const stage = host.querySelector<HTMLElement>('.books-stage');
    const poster = stage?.querySelector<HTMLImageElement>(':scope > img');
    const rect = stage?.getBoundingClientRect();
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (!stage || !poster || !rect?.width || !rect.height || preference.matches || document.hidden) {
      onOpen(id); return;
    }
    const originalUrl = location.href;
    const bounds = {
      left: Math.min(...book.points.map(point => point[0])),
      top: Math.min(...book.points.map(point => point[1])),
      right: Math.max(...book.points.map(point => point[0])),
      bottom: Math.max(...book.points.map(point => point[1])),
    };
    const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
    const source = { left: rect.left + bounds.left / 1026 * rect.width, top: rect.top + bounds.top / 334 * rect.height,
      width: width / 1026 * rect.width, height: height / 334 * rect.height };
    const abort = new AbortController();
    let frame = 0, timeout = 0, stopped = false;
    let overlay: HTMLElement | undefined;
    let model: BookOpeningScene | undefined;
    const stillHere = () => host.isConnected && stage.isConnected && location.href === originalUrl;

    function finish(navigate: boolean) {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame); clearTimeout(timeout); abort.abort();
      try { model?.dispose(); } catch { /* Navigation still works if a WebGL context failed. */ }
      model = undefined;
      overlay?.remove();
      delete stage!.dataset.openingBook;
      stage!.style.removeProperty('--book-shelf-mask');
      host.removeAttribute('aria-busy');
      preference.removeEventListener('change', onPreference);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('popstate', onHistory);
      cancelCurrent = undefined;
      if (navigate && !disposed && stillHere()) onOpen(id);
    }
    function onPreference() { if (preference.matches) finish(true); }
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') { event.preventDefault(); finish(false); } }
    function onVisibility() { if (document.hidden) finish(false); }
    function onResize() { finish(false); }
    function onHistory() { finish(false); }
    cancelCurrent = () => finish(false);
    host.setAttribute('aria-busy', 'true');
    preference.addEventListener('change', onPreference);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    window.addEventListener('popstate', onHistory);
    // Slow artwork or unavailable WebGL must never trap a reader on the shelf.
    timeout = window.setTimeout(() => finish(true), 4500);

    void (async () => {
      try {
        await poster.decode();
        if (stopped) return;
        if (!stillHere()) { finish(false); return; }
        const targetWidth = Math.min(780, window.innerWidth * .87, window.innerHeight * .72 * 1.4);
        const target = { left: (window.innerWidth - targetWidth) / 2,
          top: (window.innerHeight - targetWidth / 1.4) / 2, width: targetWidth, height: targetWidth / 1.4 };
        overlay = document.createElement('div');
        overlay.className = 'book-opening-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        // The source poster only bridges the first lift frames, never the open pages.
        const polygon = book.points.map(point => point.join(',')).join(' ');
        overlay.innerHTML = `<div class="book-opening-source"><svg viewBox="${bounds.left} ${bounds.top} ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="opening-source-clip"><polygon points="${polygon}"/></clipPath></defs><image href="${esc(poster.currentSrc || poster.src)}" width="1026" height="334" clip-path="url(#opening-source-clip)"/></svg></div><div class="book-opening-scene"></div>`;
        const scene = overlay.querySelector<HTMLElement>('.book-opening-scene')!;
        const sourcePreview = overlay.querySelector<HTMLElement>('.book-opening-source')!;
        for (const property of ['left','top','width','height'] as const) scene.style[property] = `${target[property]}px`;
        document.body.append(overlay);
        const { createBookOpeningScene } = await import('./book-opening-scene');
        if (stopped) return;
        const loaded = await createBookOpeningScene(scene, { id, signal: abort.signal, onUnavailable: () => finish(true) });
        if (stopped) { loaded.dispose(); return; }
        model = loaded;
        if (!stillHere()) { finish(false); return; }
        clearTimeout(timeout);
        const hole = `M0 0H1026V334H0Z M${book.points.map(point => point.join(' ')).join('L')}Z`;
        const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1026 334"><path fill="white" fill-rule="evenodd" d="${hole}"/></svg>`;
        stage.style.setProperty('--book-shelf-mask', `url("data:image/svg+xml,${encodeURIComponent(mask)}")`);
        stage.dataset.openingBook = id;
        stage.dispatchEvent(new Event('bookopeningstart'));
        overlay.classList.add('is-ready');

        // The closed mesh occupies the center 1.6 / 3.65 of the renderer's width.
        const initialWidth = source.width * 3.65 / 1.6;
        const initialHeight = source.height * (3.65 / 1.4) / 2.2;
        const initial = { left: source.left + (source.width - initialWidth) / 2,
          top: source.top + (source.height - initialHeight) / 2, width: initialWidth, height: initialHeight };
        const previewTarget = { left: target.left + (target.width - target.width * 1.6 / 3.65) / 2,
          top: target.top + (target.height - target.height * 2.2 / (3.65 / 1.4)) / 2,
          width: target.width * 1.6 / 3.65, height: target.height * 2.2 / (3.65 / 1.4) };
        const duration = Math.max(liftMs + 500, loaded.durationMs);
        function paint(progress: number) {
          const elapsed = progress * duration, lift = smooth(elapsed / liftMs);
          for (const property of ['left','top','width','height'] as const) {
            scene.style[property] = `${initial[property] + (target[property] - initial[property]) * lift}px`;
            sourcePreview.style[property] = `${source[property] + (previewTarget[property] - source[property]) * lift}px`;
          }
          overlay!.style.setProperty('--book-backdrop', String(smooth(elapsed / 360)));
          sourcePreview.style.opacity = String(1 - smooth(elapsed / 190));
          scene.style.opacity = String(smooth(elapsed / 190));
          loaded.render(progress);
        }
        paint(0);
        if (stopped) return;
        let start: number | undefined;
        const tick = (now: number) => {
          if (stopped) return;
          if (!stillHere()) { finish(false); return; }
          start ??= now;
          const progress = Math.min(1, (now - start) / duration);
          try { paint(progress); } catch { finish(true); return; }
          if (stopped) return;
          if (progress === 1) finish(true);
          else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        timeout = window.setTimeout(() => finish(true), duration + 900);
      } catch { finish(true); }
    })();
  }
  return { open, dispose() { disposed = true; cancelCurrent?.(); } };
}
