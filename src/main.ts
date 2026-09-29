import './style.css';
import { icon } from './ui/icons';
import { parseBookLocation } from './domain/shiji-book';
import { createReadingGuide } from './ui/reading-guide';
import { createHistoryJourney } from './ui/history-journey';
import { journeyUrl, journeySourceUrl } from './domain/history-journey';

type ReadingMode = 'journey' | 'guide' | 'library';
function normalizeLocation() {
  const url = new URL(location.href);
  if (url.search && !['journey', 'library', 'reading', 'route'].some(key => url.searchParams.has(key))) {
    url.search = '?journey=';
    if (!parseBookLocation(url.hash)) url.hash = '';
    history.replaceState(history.state, '', url);
  }
}
function modeFromUrl(): ReadingMode {
  const params = new URL(location.href).searchParams;
  if (params.has('library')) return 'library';
  if (params.has('journey')) return 'journey';
  return params.has('reading') || params.has('route') ? 'guide' : 'journey';
}
normalizeLocation();
let appMode = modeFromUrl();
let bookRequest = 0;
let toastTimer = 0;
let dialogPreviousFocus: HTMLElement | null = null;
let dynasticLibrary: ReturnType<typeof import('./ui/dynastic-library').createDynasticLibrary> | null = null;
let dynasticLoading: Promise<void> | null = null;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="app-header">
    <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="历史星云首页"><span class="brand-mark">${icon('star')}</span><span>历史星云<small>HISTORICAL NEBULA</small></span></a>
    <nav class="main-nav" aria-label="主导航"><button class="nav-item" data-action="history-journey">读懂历史</button><button class="nav-item" data-action="reading-guides">史记导读</button><button class="nav-item" data-action="shiji-book">史记原文</button><button class="nav-item" data-action="dynastic-library">二十四史原文</button></nav>
  </header>
  <div id="journey-root"></div>
  <div id="reading-root"></div>
  <div id="dynastic-root"></div>
  <footer class="app-footer"><span>${icon('star')}二十四史 3,213 卷可阅读卷次，少数历法表缺录。</span><span>原文整理 · 待审校<button data-action="about-data">关于数据 ${icon('info')}</button></span></footer>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <dialog id="dialog" class="app-dialog" aria-label="关于内容与来源"></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function toast(message: string) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 4000);
}
async function openBook(volume?: number, query?: string, block?: string) {
  const request = ++bookRequest;
  try {
    const { openShijiReader } = await import('./ui/shiji-reader');
    if (request !== bookRequest) return;
    openShijiReader({ volume, query, block, onGuide: enterGuides, onClose: () => {} });
  } catch { if (request === bookRequest) toast('原文阅读器加载失败，请重试。'); }
}
async function ensureDynasticLibrary() {
  if (dynasticLibrary) { dynasticLibrary.showFromUrl(); return; }
  if (dynasticLoading) return dynasticLoading;
  $('#dynastic-root').innerHTML = '<p class="dynasty-loading">正在打开二十四史目录…</p>';
  dynasticLoading = (async () => {
    try {
      const { createDynasticLibrary } = await import('./ui/dynastic-library');
      dynasticLibrary = createDynasticLibrary($('#dynastic-root'), { onShiji: () => void openBook(), onJourney: enterJourney });
      if (appMode === 'library') dynasticLibrary.showFromUrl();
    } catch {
      $('#dynastic-root').innerHTML = '<div class="dynasty-error"><p>目录加载失败，请重试。</p><button class="secondary-button" data-action="retry-library">重新加载</button></div>';
    } finally { dynasticLoading = null; }
  })();
  return dynasticLoading;
}
function render(refresh = true) {
  for (const [mode, root, action] of [['journey', '#journey-root', 'history-journey'], ['guide', '#reading-root', 'reading-guides'], ['library', '#dynastic-root', 'dynastic-library']]) {
    $(root).classList.toggle('hidden', appMode !== mode);
    const button = $(`[data-action="${action}"]`);
    button.classList.toggle('active', appMode === mode);
    if (appMode === mode) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  }
  if (!refresh) return;
  if (appMode === 'journey') historyJourney.showFromUrl();
  else if (appMode === 'guide') readingGuide.showFromUrl();
  else void ensureDynasticLibrary();
}
function closeDialog() {
  const dialog = $<HTMLDialogElement>('#dialog');
  if (dialog.open) { dialog.close(); dialogPreviousFocus?.focus(); }
}
function prepareNavigation() { bookRequest++; closeDialog(); }
function enterJourney(eventId = '') {
  prepareNavigation();
  const scope = new URL(location.href).searchParams.get('scope') ?? 'quick';
  history.pushState({ journey: true }, '', journeyUrl(eventId, '', location.href, scope));
  appMode = 'journey'; render(); window.scrollTo({ top: 0 });
}
function enterGuides(volume?: number) {
  prepareNavigation(); appMode = 'guide';
  if (volume) { render(false); readingGuide.openVolume(volume); }
  else { history.pushState({ reading: true }, '', readingGuide.readingUrl); render(); window.scrollTo({ top: 0 }); }
}
function enterDynasticLibrary() {
  prepareNavigation();
  const url = new URL(location.href); url.search = '?library='; url.hash = '';
  history.pushState({ dynastic: true }, '', url);
  appMode = 'library'; render(); window.scrollTo({ top: 0 });
}
function aboutData() {
  const dialog = $<HTMLDialogElement>('#dialog'); dialogPreviousFocus = document.activeElement as HTMLElement;
  dialog.innerHTML = `<div class="dialog-header"><span>关于内容与来源</span><button class="icon-button" data-action="dialog-close" aria-label="关闭">${icon('close')}</button></div><div class="source-content"><h2>沿着事件，回到史书</h2><p>历史主线选取 40 个关键事件，用白话说明背景、经过和影响，53 条出处可定位到二十四史的原文。它是入门选读，不是全部史实或逐句翻译。</p><p>《史记》130 卷提供独立入门导读、分段阅读、完整原文与年表。转录来自 <a href="https://zh.wikisource.org/wiki/史記" target="_blank" rel="noopener noreferrer">维基文库及贡献者</a>，来源与许可说明保留在阅读器内。</p><p>另接入《汉书》至《明史》23 部、3,083 卷的转录、卷目、书级导读与本书检索。主要来源是 <a href="https://osf.io/tp729/" target="_blank" rel="noopener noreferrer">Zinin 与 Xu 的二十四史语料</a>；部分短卷与宗室世系表参考维基文库、gujilab 和 hunterhug。至少 12 卷历法表格缺录，阅读页已标示。</p><p>简繁切换只转换字形。转录、卷名与导读仍需结合校勘本核对；卷次覆盖不等于逐字完整。</p><div class="detail-actions"><button class="primary-button" data-action="dynastic-library">二十四史目录</button><button class="secondary-button" data-action="shiji-book">史记原文</button></div></div>`;
  dialog.showModal();
}
const readingGuide = createReadingGuide($('#reading-root'), { onBook: (volume, block) => void openBook(volume, undefined, block) });
const historyJourney = createHistoryJourney($('#journey-root'), {
  onLibrary: enterDynasticLibrary,
  onSource: (event, source) => {
    if (source.book === 'shiji') { void openBook(source.volume, source.cue, source.block); return; }
    prepareNavigation(); appMode = 'library';
    history.pushState({ dynastic: true }, '', journeySourceUrl(event, source)); render();
  },
});
document.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action]');
  switch (target?.dataset.action) {
    case 'history-journey': enterJourney(); break;
    case 'reading-guides': enterGuides(); break;
    case 'dynastic-library': enterDynasticLibrary(); break;
    case 'retry-library': void ensureDynasticLibrary(); break;
    case 'shiji-book': closeDialog(); void openBook(); break;
    case 'about-data': aboutData(); break;
    case 'dialog-close': closeDialog(); break;
  }
});
$('#dialog').addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
  event.preventDefault();
  if (document.querySelector('.book-dialog[open]')) { $('#book-query').focus(); return; }
  if (appMode === 'journey' && !document.querySelector('[data-journey-search]')) enterJourney();
  const selector = appMode === 'library' ? '#dynastic-root [data-library-search], #dynastic-root [data-library-filter]' : appMode === 'guide' ? '#reading-query' : '[data-journey-search]';
  document.querySelector<HTMLInputElement>(selector)?.focus();
});
function restoreBook() {
  const book = parseBookLocation(location.hash);
  // Once initialized, the reader handles its own Back/Forward and hash changes.
  if (book && !document.querySelector('.book-dialog')) void openBook(book.volume, undefined, book.block);
}
window.addEventListener('popstate', () => {
  prepareNavigation(); normalizeLocation(); appMode = modeFromUrl(); render(); restoreBook();
});
window.addEventListener('hashchange', restoreBook);
render(); restoreBook();
