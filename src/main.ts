import './style.css';
import './theme.css';
import { icon } from './ui/icons';
import { parseBookLocation } from './domain/shiji-book';
import { createReadingGuide } from './ui/reading-guide';
import { guideHomeUrl } from './exploration/reading';
import { createHistoryJourney } from './ui/history-journey';
import { journeyUrl, journeySourceUrl, journeyEvents } from './domain/history-journey';
import { historyGuideUrl, historyGuideSourceUrl } from './domain/history-guides';
import { modernTextUrl } from './domain/modern-texts';
import { modernGuideUrl } from './domain/modern-guide-location';
import './editorial.css';
import './ui/historical-stage.css';

type ReadingMode = 'journey' | 'guide' | 'histories' | 'library' | 'texts' | 'modern-guides';
function normalizeLocation() {
  const url = new URL(location.href);
  if (url.search && !['question', 'journey', 'library', 'guide', 'reading', 'route', 'histories', 'texts', 'modern-guides'].some(key => url.searchParams.has(key))) {
    url.search = '?journey=';
    if (!parseBookLocation(url.hash)) url.hash = '';
    history.replaceState(history.state, '', url);
  }
}
function modeFromUrl(): ReadingMode {
  const params = new URL(location.href).searchParams;
  if (params.has('texts')) return 'texts';
  if (params.has('modern-guides')) return 'modern-guides';
  if (params.has('library')) return 'library';
  if (params.has('histories')) return 'histories';
  if (params.has('question')) return 'journey';
  if (params.has('journey')) return 'journey';
  return params.has('guide') || params.has('reading') || params.has('route') ? 'guide' : 'journey';
}
normalizeLocation();
let appMode = modeFromUrl();
let bookRequest = 0;
let toastTimer = 0;
let dialogPreviousFocus: HTMLElement | null = null;
let dynasticLibrary: ReturnType<typeof import('./ui/dynastic-library').createDynasticLibrary> | null = null;
let dynasticLoading: Promise<void> | null = null;
let historyGuides: ReturnType<typeof import('./ui/history-guides').createHistoryGuides> | null = null;
let guidesLoading: Promise<void> | null = null;
let modernTexts: ReturnType<typeof import('./ui/modern-texts').createModernTexts> | null = null;
let textsLoading: Promise<void> | null = null;
let modernGuides: ReturnType<typeof import('./ui/modern-guides').createModernGuides> | null = null;
let modernGuidesLoading: Promise<void> | null = null;
type ColorTheme = 'dark' | 'light';
const savedTheme: ColorTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="app-header">
    <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="历史星云首页"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M32 2 37 25 53 11 40 28 62 32 40 37 53 53 36 40 32 62 27 40 11 53 24 36 2 32 25 27 11 11 28 24Z"/><path d="m32 2 0 60m-30-30h60M11 11l42 42M11 53l42-42"/><path d="m32 16 7 16-7 16-7-16Z"/></svg></span><span>历史星云<small>HISTORICAL NEBULA</small></span></a>
    <span class="brand-caption">让历史照亮当下<br>每一个普通人</span>
    <nav class="main-nav" aria-label="主导航"><button class="nav-item" data-action="history-journey">读懂历史</button><button class="nav-item" data-action="reading-guides">史记导读</button><button class="nav-item" data-action="history-guides">二十四史导读</button><button class="nav-item" data-action="modern-guides">清至当代导读</button></nav>
    <div class="theme-switch" role="group" aria-label="页面显示模式"><button type="button" data-action="theme-light" aria-pressed="${savedTheme === 'light'}" title="白天模式" aria-label="白天模式">${icon('sun')}<span>白天</span></button><button type="button" data-action="theme-dark" aria-pressed="${savedTheme === 'dark'}" title="黑夜模式" aria-label="黑夜模式">${icon('moon')}<span>黑夜</span></button></div>
    <details class="source-menu"><summary aria-label="原文书库"><span>历史不远，就在眼前。</span><b><span data-source-label>原文书库</span> <i aria-hidden="true">⌄</i></b></summary><nav aria-label="史料原文"><button data-action="shiji-book">史记原文</button><button data-action="dynastic-library">二十四史原文</button><button data-action="modern-texts">清至当代正文</button></nav></details>
  </header>
  <div id="journey-root"></div>
  <div id="reading-root"></div>
  <div id="history-guides-root"></div>
  <div id="dynastic-root"></div>
  <div id="modern-texts-root"></div>
  <div id="modern-guides-root"></div>
  <footer class="app-footer"><span>${icon('star')}二十四史 3,213 卷可阅读卷次，少数历法表缺录。</span><span>原文整理 · 待审校<button data-action="about-data">关于数据 ${icon('info')}</button></span></footer>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <dialog id="dialog" class="app-dialog" aria-label="关于内容与来源"></dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const sourceMenu = $<HTMLDetailsElement>('.source-menu');
const sourceSummary = sourceMenu.querySelector<HTMLElement>('summary')!;
function closeSourceMenu(restoreFocus = false) {
  if (!sourceMenu.open) return;
  const focusWasInside = sourceMenu.contains(document.activeElement);
  sourceMenu.open = false;
  if (restoreFocus && focusWasInside) sourceSummary.focus({ preventScroll: true });
}
function toast(message: string) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 4000);
}
function setTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#e8edf6' : '#0a0e18');
  for (const option of ['dark', 'light'] as const) {
    $<HTMLButtonElement>(`[data-action="theme-${option}"]`).setAttribute('aria-pressed', String(option === theme));
  }
  try { localStorage.setItem('historical-nebula:theme:v1', theme); } catch { /* Theme still works for this visit. */ }
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
      dynasticLibrary = createDynasticLibrary($('#dynastic-root'), { onShiji: () => void openBook(), onJourney: enterJourney, onGuide: enterHistoryGuides });
      if (appMode === 'library') dynasticLibrary.showFromUrl();
    } catch {
      $('#dynastic-root').innerHTML = '<div class="dynasty-error"><p>目录加载失败，请重试。</p><button class="secondary-button" data-action="retry-library">重新加载</button></div>';
    } finally { dynasticLoading = null; }
  })();
  return dynasticLoading;
}
async function ensureHistoryGuides() {
  if (historyGuides) { historyGuides.showFromUrl(); return; }
  if (guidesLoading) return guidesLoading;
  $('#history-guides-root').innerHTML = '<p class="dynasty-loading">正在打开二十四史导读…</p>';
  guidesLoading = (async () => {
    try {
      const { createHistoryGuides } = await import('./ui/history-guides');
      historyGuides = createHistoryGuides($('#history-guides-root'), {
        onShiji: () => enterGuides(),
        onBook: enterDynasticLibrary,
        onSource: (book, step, source) => {
          prepareNavigation(); appMode = 'library';
          history.pushState({ dynastic: true }, '', historyGuideSourceUrl(book, step, source)); render();
        },
      });
      if (appMode === 'histories') historyGuides.showFromUrl();
    } catch {
      $('#history-guides-root').innerHTML = '<div class="dynasty-error"><p>导读加载失败，请重试。</p><button class="secondary-button" data-action="retry-guides">重新加载</button></div>';
    } finally { guidesLoading = null; }
  })();
  return guidesLoading;
}
function render(refresh = true) {
  for (const [mode, root, action] of [['journey', '#journey-root', 'history-journey'], ['guide', '#reading-root', 'reading-guides'], ['histories', '#history-guides-root', 'history-guides'], ['library', '#dynastic-root', 'dynastic-library'], ['texts', '#modern-texts-root', 'modern-texts'], ['modern-guides', '#modern-guides-root', 'modern-guides']]) {
    $(root).classList.toggle('hidden', appMode !== mode);
    const button = $(`[data-action="${action}"]`);
    button.classList.toggle('active', appMode === mode);
    if (appMode === mode) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  }
  const sourceTitle = appMode === 'library' ? '二十四史原文' : appMode === 'texts' ? '清至当代正文' : '原文书库';
  sourceMenu.querySelector<HTMLElement>('[data-source-label]')!.textContent = sourceTitle;
  sourceSummary.setAttribute('aria-label', sourceTitle === '原文书库' ? sourceTitle : `${sourceTitle}，切换原文书库`);
  if (appMode === 'library' || appMode === 'texts') sourceSummary.setAttribute('aria-current', 'page');
  else sourceSummary.removeAttribute('aria-current');
  if (appMode !== 'histories') historyGuides?.hide();
  const activeNav = document.querySelector<HTMLElement>('.main-nav [aria-current="page"]');
  const nav = document.querySelector<HTMLElement>('.main-nav');
  if (activeNav && nav) {
    const item = activeNav.getBoundingClientRect(), viewport = nav.getBoundingClientRect();
    if (item.right > viewport.right) nav.scrollLeft += item.right - viewport.right + 10;
    else if (item.left < viewport.left) nav.scrollLeft += item.left - viewport.left - 10;
  }
  if (appMode !== 'library') dynasticLibrary?.hide();
  if (appMode !== 'texts') modernTexts?.hide();
  if (appMode !== 'modern-guides') modernGuides?.hide();
  if (!refresh) return;
  if (appMode === 'journey') historyJourney.showFromUrl();
  else if (appMode === 'guide') readingGuide.showFromUrl();
  else if (appMode === 'histories') void ensureHistoryGuides();
  else if (appMode === 'texts') void ensureModernTexts();
  else if (appMode === 'modern-guides') void ensureModernGuides();
  else void ensureDynasticLibrary();
}
function closeDialog() {
  const dialog = $<HTMLDialogElement>('#dialog');
  if (dialog.open) { dialog.close(); dialogPreviousFocus?.focus(); }
}
function prepareNavigation() { bookRequest++; closeSourceMenu(true); closeDialog(); }
async function ensureModernTexts() {
  if (modernTexts) { void modernTexts.showFromUrl(); return; }
  if (textsLoading) return textsLoading;
  $('#modern-texts-root').innerHTML = '<p class="dynasty-loading">正在打开清至当代正文…</p>';
  textsLoading = (async () => {
    try {
      const { createModernTexts } = await import('./ui/modern-texts');
      modernTexts = createModernTexts($('#modern-texts-root'), { onJourney: enterJourney, onGuide: enterModernGuides });
      if (appMode === 'texts') void modernTexts.showFromUrl();
    } catch {
      $('#modern-texts-root').innerHTML = '<p>正文目录加载失败。</p><button data-action="retry-texts">重新加载</button>';
    } finally { textsLoading = null; }
  })();
  return textsLoading;
}
function enterModernTexts(href = modernTextUrl()) {
  prepareNavigation(); appMode = 'texts';
  history.pushState({ texts: true }, '', href); render(); window.scrollTo({ top: 0 });
}
async function ensureModernGuides() {
  if (modernGuides) { modernGuides.showFromUrl(); return; }
  if (modernGuidesLoading) return modernGuidesLoading;
  $('#modern-guides-root').innerHTML = '<p class="dynasty-loading">正在打开清至当代导读…</p>';
  modernGuidesLoading = (async () => {
    try {
      const { createModernGuides } = await import('./ui/modern-guides');
      modernGuides = createModernGuides($('#modern-guides-root'), { onText: enterModernTexts });
      if (appMode === 'modern-guides') modernGuides.showFromUrl();
    } catch {
      $('#modern-guides-root').innerHTML = '<p>导读暂时无法加载。</p><button data-action="retry-modern-guides">重新加载</button>';
    } finally { modernGuidesLoading = null; }
  })();
  return modernGuidesLoading;
}
function enterModernGuides(href = modernGuideUrl()) {
  prepareNavigation(); appMode = 'modern-guides';
  history.pushState({ modernGuide: true }, '', href); render(false);
  void ensureModernGuides().then(() => {
    if (appMode !== 'modern-guides' || location.href !== href) return;
    const lesson = $('#modern-guides-root').querySelector<HTMLElement>('[data-mg-lesson]');
    if (lesson) { lesson.scrollIntoView({ block: 'start' }); lesson.focus({ preventScroll: true }); }
    else window.scrollTo({ top: 0 });
  });
}
function enterJourney(eventId = '') {
  prepareNavigation();
  const scope = new URL(location.href).searchParams.get('scope') ?? 'quick';
  history.pushState({ journey: true }, '', journeyUrl(eventId, '', location.href, scope));
  appMode = 'journey'; render(); window.scrollTo({ top: 0 });
}
function enterGuides(volume?: number) {
  prepareNavigation(); appMode = 'guide';
  if (volume) { render(false); readingGuide.openVolume(volume); }
  else { history.pushState({ reading: true }, '', guideHomeUrl(location.href)); render(); window.scrollTo({ top: 0 }); }
}
function enterHistoryGuides(book = '', step = '') {
  prepareNavigation();
  history.pushState({ historyGuide: true }, '', historyGuideUrl(book, step));
  appMode = 'histories'; render(); window.scrollTo({ top: 0 });
}
function enterDynasticLibrary(book = '', volume?: number) {
  prepareNavigation();
  const url = new URL(location.href); url.search = '?library='; url.hash = '';
  url.searchParams.set('library', book);
  if (volume !== undefined) url.searchParams.set('volume', String(volume));
  history.pushState({ dynastic: true }, '', url);
  appMode = 'library'; render(); window.scrollTo({ top: 0 });
}
function aboutData() {
  const dialog = $<HTMLDialogElement>('#dialog'); dialogPreviousFocus = document.activeElement as HTMLElement;
  dialog.innerHTML = `<div class="dialog-header"><span>关于内容与来源</span><button class="icon-button" data-action="dialog-close" aria-label="关闭">${icon('close')}</button></div><div class="source-content"><h2>沿着事件，回到史书</h2><p>历史主线从上古延伸至当代，选取 ${journeyEvents.length} 个关键事件，用白话说明背景、经过和影响。其中 ${journeyEvents.reduce((count, event) => count + event.sources.length, 0)} 条出处可定位到二十四史的原文；清朝到当代新增34篇站内白话正文、11份近现代文献原文，并接入《清史稿》529卷目录（523卷有正文，卷29星表部分缺录，卷30—35正文缺录）。白话正文与史料原文分别标注，可从事件进入、定位段落再返回。另附署名参考资料，最新事件选至2024年；属于入门选读，不代表全部史实或全部近现代史料。</p><p>《史记》130 卷提供独立入门导读、分段阅读、完整原文与年表。转录来自 <a href="https://zh.wikisource.org/wiki/史記" target="_blank" rel="noopener noreferrer">维基文库及贡献者</a>，来源与许可说明保留在阅读器内。</p><p>另接入《汉书》至《明史》23 部、3,083 卷的转录、卷目与本书检索。新增二十四史导读按时代背景、关键人物、事件经过与影响、阅读重点展开，讲解可往返定位原文；这是书级入门与事件选读，并非新增各卷的逐卷讲解。主要来源是 <a href="https://osf.io/tp729/" target="_blank" rel="noopener noreferrer">Zinin 与 Xu 的二十四史语料</a>；部分短卷与宗室世系表参考维基文库、gujilab 和 hunterhug。至少 12 卷历法表格缺录，阅读页已标示。</p><p>简繁切换只转换字形。转录、卷名与导读仍需结合校勘本核对；卷次覆盖不等于逐字完整。</p><div class="detail-actions"><button class="primary-button" data-action="dynastic-library">二十四史目录</button><button class="secondary-button" data-action="shiji-book">史记原文</button></div></div>`;
  dialog.showModal();
}
const readingGuide = createReadingGuide($('#reading-root'), { onBook: (volume, block) => void openBook(volume, undefined, block), onHistories: () => enterHistoryGuides() });
const historyJourney = createHistoryJourney($('#journey-root'), {
  onLibrary: enterDynasticLibrary,
  onGuide: book => { if (book === 'shiji') enterGuides(); else if (book === 'qingshigao') enterModernGuides(modernGuideUrl('qing')); else enterHistoryGuides(book); },
  onText: enterModernTexts,
  onSource: (event, source) => {
    if (source.book === 'shiji') { void openBook(source.volume, source.cue, source.block); return; }
    prepareNavigation(); appMode = 'library';
    history.pushState({ dynastic: true }, '', journeySourceUrl(event, source)); render();
  },
});
document.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLElement>('[data-action]');
  if (target?.closest('.source-menu')) closeSourceMenu(true);
  else if (!sourceMenu.contains(event.target as Node)) closeSourceMenu();
  switch (target?.dataset.action) {
    case 'theme-dark': setTheme('dark'); break;
    case 'theme-light': setTheme('light'); break;
    case 'history-journey': enterJourney(); break;
    case 'reading-guides': enterGuides(); break;
    case 'history-guides': enterHistoryGuides(); break;
    case 'retry-guides': void ensureHistoryGuides(); break;
    case 'dynastic-library': enterDynasticLibrary(); break;
    case 'retry-library': void ensureDynasticLibrary(); break;
    case 'modern-texts': enterModernTexts(); break;
    case 'modern-guides': enterModernGuides(); break;
    case 'retry-modern-guides': void ensureModernGuides(); break;
    case 'retry-texts': void ensureModernTexts(); break;
    case 'shiji-book': closeDialog(); void openBook(); break;
    case 'about-data': aboutData(); break;
    case 'dialog-close': closeDialog(); break;
  }
});
$('#dialog').addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
sourceMenu.addEventListener('focusout', () => {
  queueMicrotask(() => { if (!sourceMenu.contains(document.activeElement)) closeSourceMenu(); });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && sourceMenu.open) {
    event.preventDefault(); closeSourceMenu(true); return;
  }
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
  event.preventDefault();
  if (document.querySelector('.book-dialog[open]')) { $('#book-query').focus(); return; }
  if (appMode === 'journey' && !document.querySelector('[data-journey-search]')) enterJourney();
  const selector = appMode === 'modern-guides' ? '#modern-guides-root [data-mg-search], #modern-guides-root [data-mg-step][aria-current=step]' : appMode === 'texts' ? '#modern-texts-root [data-text-search], #modern-texts-root [data-text-find]' : appMode === 'library' ? '#dynastic-root [data-library-search], #dynastic-root [data-library-filter]' : appMode === 'guide' ? '#reading-query' : appMode === 'histories' ? '#history-guides-root [data-hg-search], #history-guides-root [data-hg-select]' : '[data-journey-search]';
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
window.addEventListener('hashchange', () => { restoreBook(); if (appMode === 'texts') modernTexts?.locateFromUrl(); });
render(); restoreBook();
