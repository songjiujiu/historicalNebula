import { escapeHtml as esc } from './icons';
import './book-opening.css';

// The cover silhouettes in the existing 1026 × 334 Blender poster.
const books = {
  shiji: { name: '史记', era: '上古至西汉', tone: '#715336', points: [[56,33],[75,24],[237,8],[271,249],[264,256],[84,263]] },
  hanshu: { name: '汉书', era: '西汉', tone: '#343d34', points: [[282,36],[301,33],[434,35],[438,246],[282,249]] },
  sanguozhi: { name: '三国志', era: '魏 · 蜀 · 吴', tone: '#67362c', points: [[460,36],[478,34],[609,35],[614,245],[461,248]] },
  jiutangshu: { name: '旧唐书', era: '唐', tone: '#86623e', points: [[636,36],[656,33],[787,35],[790,245],[637,248]] },
  qingshigao: { name: '清史稿', era: '清', tone: '#263b45', points: [[811,37],[830,34],[956,35],[961,245],[812,248]] },
} satisfies Record<string, { name: string; era: string; tone: string; points: number[][] }>;
const duration = 1850;

/** A finite, cancellable book transition; routing happens only after the last page settles. */
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
    let frame = 0, timeout = 0, stopped = false;
    let overlay: HTMLElement | undefined;
    const stillHere = () => host.isConnected && stage.isConnected && location.href === originalUrl;

    function finish(navigate: boolean) {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame); clearTimeout(timeout);
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
    // Missing/slow artwork must not trap a reader on the bookshelf.
    timeout = window.setTimeout(() => finish(true), 4500);

    void (async () => {
      try { await poster.decode(); }
      catch { finish(true); return; }
      if (stopped) return;
      if (!stillHere()) { finish(false); return; }
      clearTimeout(timeout);
      const polygon = book.points.map(point => point.join(',')).join(' ');
      const hole = `M0 0H1026V334H0Z M${book.points.map(point => point.join(' ')).join('L')}Z`;
      const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1026 334"><path fill="white" fill-rule="evenodd" d="${hole}"/></svg>`;
      stage.style.setProperty('--book-shelf-mask', `url("data:image/svg+xml,${encodeURIComponent(mask)}")`);
      stage.dataset.openingBook = id;
      // Freeze the source frame while removing only the selected book from the shelf.
      stage.dispatchEvent(new Event('bookopeningstart'));
      overlay = document.createElement('div');
      overlay.className = 'book-opening-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = `<div class="book-opening-scene" style="--book-tone:${book.tone}">
        <div class="book-opening-volume">
          <div class="book-opening-board"></div>
          <div class="book-opening-paper"><div class="book-opening-reading"><span>${book.era} · 入门导读</span><h2>${book.name}</h2><i></i><p>先看懂时代<br>再走进故事</p><small>局面 · 人物 · 事件 · 原文</small></div></div>
          ${[0,1,2].map(index => `<div class="book-opening-leaf" data-leaf="${index}"><div class="book-opening-leaf-front"></div><div class="book-opening-leaf-back"></div></div>`).join('')}
          <div class="book-opening-cover"><div class="book-opening-cover-front"><svg viewBox="${bounds.left} ${bounds.top} ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="opening-cover-clip"><polygon points="${polygon}"/></clipPath></defs><image href="${esc(poster.currentSrc || poster.src)}" width="1026" height="334" clip-path="url(#opening-cover-clip)"/></svg></div><div class="book-opening-cover-inside"><span>历史星云</span><i></i><small>从一本史书<br>走进一个时代</small></div></div>
        </div>
      </div>`;
      document.body.append(overlay);
      const scene = overlay.querySelector<HTMLElement>('.book-opening-scene')!;
      const volume = overlay.querySelector<HTMLElement>('.book-opening-volume')!;
      const cover = overlay.querySelector<HTMLElement>('.book-opening-cover')!;
      const paper = overlay.querySelector<HTMLElement>('.book-opening-paper')!;
      const board = overlay.querySelector<HTMLElement>('.book-opening-board')!;
      const leaves = Array.from(overlay.querySelectorAll<HTMLElement>('.book-opening-leaf'));
      const reading = overlay.querySelector<HTMLElement>('.book-opening-reading')!;
      const targetWidth = Math.min(260, window.innerWidth * .43, window.innerHeight * .52 * width / height);
      const target = { left: window.innerWidth / 2 - targetWidth * .07, top: (window.innerHeight - targetWidth * height / width) / 2,
        width: targetWidth, height: targetWidth * height / width };
      const smooth = (value: number) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); };
      function paint(progress: number) {
        const lift = smooth(progress / .36), unfold = smooth((progress - .18) / .49);
        for (const property of ['left','top','width','height'] as const) scene.style[property] = `${source[property] + (target[property] - source[property]) * lift}px`;
        overlay!.style.setProperty('--book-backdrop', String(smooth(progress / .24)));
        volume.style.transform = `rotateX(${lift * 7}deg) rotateY(${-lift * 5}deg)`;
        cover.style.transform = `translateZ(4px) rotateY(${-unfold * 166}deg)`;
        paper.style.opacity = board.style.opacity = String(smooth(progress / .15));
        leaves.forEach((leaf, index) => {
          const turn = smooth((progress - .40 - index * .10) / .30);
          leaf.style.opacity = String(smooth(progress / .16));
          leaf.style.transform = `translateZ(${3 - index * .55}px) rotateY(${-turn * (160 - index * 3)}deg)`;
        });
        reading.style.opacity = String(smooth((progress - .70) / .19));
      }
      paint(0);
      let start: number | undefined;
      const tick = (now: number) => {
        if (stopped) return;
        if (!stillHere()) { finish(false); return; }
        start ??= now;
        const progress = Math.min(1, (now - start) / duration);
        paint(progress);
        if (progress === 1) finish(true);
        else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      timeout = window.setTimeout(() => finish(true), duration + 900);
    })();
  }
  return { open, dispose() { disposed = true; cancelCurrent?.(); } };
}
