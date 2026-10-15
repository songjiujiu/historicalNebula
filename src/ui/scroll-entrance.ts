import './scroll-entrance.css';

const duration = 3600;
const closedFront = .14;
// Upper and lower paper edges, measured in the existing 1256 × 364 artwork.
const paperEdges = [
  [.14, .17, .80], [.20, .16, .84], [.30, .26, .87],
  [.40, .34, .90], [.50, .37, .92], [.60, .39, .95],
  [.70, .34, .96], [.80, .38, .96], [.90, .35, .90], [1, .36, .90],
];

/** One finite entrance, shared by the mobile poster and the Blender canvas. */
export function mountScrollEntrance(host: HTMLElement): { finished: Promise<void>; dispose: () => void } {
  const hero = host.querySelector<HTMLElement>('.immersive-hero');
  const stage = hero?.querySelector<HTMLElement>('.scroll-stage');
  const poster = stage?.querySelector<HTMLImageElement>('.scroll-art > img');
  if (!hero || !stage || !poster) return { finished: Promise.resolve(), dispose: () => {} };
  const eras = Array.from(hero.querySelectorAll<HTMLElement>('[data-stage-era]'));
  const thresholds = [.22, .36, .48, .61, .73, .78, .91];
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, timeout = 0, stopped = false;
  let resolveFinished!: () => void;
  const finished = new Promise<void>(resolve => { resolveFinished = resolve; });

  function finish() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    hero!.dataset.scrollState = 'open';
    for (const property of ['--scroll-front', '--roll-top', '--roll-height', '--roll-opacity', '--roll-grain']) stage!.style.removeProperty(property);
    eras.forEach(era => era.classList.remove('scroll-era-visible'));
    hero!.removeEventListener('focusin', onInteraction);
    hero!.removeEventListener('pointerdown', onInteraction);
    preference.removeEventListener('change', onPreference);
    document.removeEventListener('visibilitychange', onVisibility);
    resolveFinished();
  }
  function onInteraction(event: Event) {
    // Opening the page focuses its heading. Only a deliberate control interaction skips the entrance.
    if ((event.target as Element).closest('button, a, input')) finish();
  }
  function onPreference() { if (preference.matches) finish(); }
  function onVisibility() { if (document.hidden) finish(); }
  function paint(front: number) {
    const right = paperEdges.findIndex(point => point[0] >= front);
    const a = paperEdges[Math.max(0, right - 1)], b = paperEdges[Math.max(0, right)];
    const mix = a === b ? 0 : (front - a[0]) / (b[0] - a[0]);
    const top = a[1] + (b[1] - a[1]) * mix;
    const bottom = a[2] + (b[2] - a[2]) * mix;
    stage!.style.setProperty('--scroll-front', `${(front * 100).toFixed(3)}%`);
    stage!.style.setProperty('--roll-top', `${top * 100}%`);
    stage!.style.setProperty('--roll-height', `${(bottom - top) * 100}%`);
    stage!.style.setProperty('--roll-opacity', String(Math.min(1, (1 - front) / .10)));
    stage!.style.setProperty('--roll-grain', `${front * 100}%`);
    eras.forEach((era, index) => era.classList.toggle('scroll-era-visible', front >= thresholds[index]));
  }
  hero.addEventListener('focusin', onInteraction);
  hero.addEventListener('pointerdown', onInteraction);
  preference.addEventListener('change', onPreference);
  document.addEventListener('visibilitychange', onVisibility);
  if (preference.matches || document.hidden) finish();
  else {
    paint(closedFront);
    // A slow or unavailable poster must never leave navigation hidden indefinitely.
    timeout = window.setTimeout(finish, 6000);
    void (async () => {
      try {
        await poster.decode();
        if (stopped) return;
        if (!hero.isConnected) { finish(); return; }
        clearTimeout(timeout);
        hero.dataset.scrollState = 'opening';
        let start: number | undefined;
        const tick = (now: number) => {
          if (stopped) return;
          if (!hero.isConnected) { finish(); return; }
          start ??= now;
          const elapsed = Math.min(1, (now - start) / duration);
          // A gentle start and settle rather than a constant-speed curtain.
          const eased = elapsed * elapsed * (3 - 2 * elapsed);
          paint(closedFront + (1 - closedFront) * eased);
          if (elapsed === 1) finish();
          else frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch { finish(); }
    })();
  }
  return { finished, dispose: finish };
}
