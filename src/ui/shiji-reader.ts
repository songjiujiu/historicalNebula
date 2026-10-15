import { Converter } from 'opencc-js/t2cn';
import { shijiBook, shijiChapters, bookCategories, chapterByVolume, loadChapter, loadBookSearch, searchBook, parseBookLocation, bookUrl, type BookLocation, type BookCategory, type Chapter } from '../domain/shiji-book';
import { chapterGuides } from '../domain/chapter-guides';
import { escapeHtml as esc } from './icons';
import './shiji-reader.css';
import { readingAtmosphere } from './reading-atmosphere';
import './reader-gallery.css';
import { journeyEvent } from '../domain/history-journey';

const simplify = Converter({ from: 'tw', to: 'cn' });
const KEY = 'historical-nebula:shiji-reader:v1';
type ReadingRecord = { recent: BookLocation | null; bookmarks: BookLocation[]; simplified: boolean };
let saved: ReadingRecord = { recent: null, bookmarks: [], simplified: true };
try {
  const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  const valid = (value: BookLocation) => value && parseBookLocation(`#shiji/${value.volume}${value.block ? `/${value.block}` : ''}`);
  if (raw) saved = { recent: valid(raw.recent) || null, bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks.map(valid).filter(Boolean).slice(0, 500) : [], simplified: raw.simplified !== false };
} catch { /* Reading is independent of browser storage. */ }
let dialog: HTMLDialogElement;
let location: BookLocation | null = null;
let query = '';
let category = '';
let page = 0;
let request = 0;
let searchRequest = 0;
let searchTimer = 0;
let previousFocus: HTMLElement | null = null;
let callbacks: { onClose: () => void; onGuide?: (volume: number) => void };
const categoryNotes: Record<BookCategory, { label: string; method: string }> = {
  '本纪': { label: '以重要统治者串起时代', method: '先认出这一卷的主角，再按前后顺序看他做了什么、局面怎样改变。遇到“某年”，它通常是当时君主的在位年数。' },
  '表': { label: '对照同一时期的大事', method: '先看表头的国家或人物，再沿同一行对照同时发生的事。横向滚动可以查看整张表，不必一次记住全部名字。' },
  '书': { label: '解释制度与社会生活', method: '这里按主题讲礼乐、历法、经济等内容。先抓住它在讨论哪件事，再看古人怎样处理这个问题，不必按人物故事读。' },
  '世家': { label: '诸侯家族与重要人物的经历', method: '先认清家族或人物，再留意世代更替和关键选择。篇中也有陈涉、孔子等重要人物，并非每一卷都只写世袭诸侯。' },
  '列传': { label: '从不同人物看历史', method: '先看开头的人物身份，再抓住两三件重要经历。有些篇章合写多人，读到新名字时留意叙述的主角是否已经切换。' },
};
type ReadingGuide = { question: string; summary: string; focus: string; next?: number; note?: string };
// 导读依据本地所收录各卷原文整理；它是本站的阅读辅助，不替代原文。
const readingGuides: Record<number, ReadingGuide> = Object.fromEntries(chapterGuides.map(guide => [guide.volume, { question: guide.question, summary: guide.background, focus: guide.sections.map(section => section.title).join(' → '), note: guide.caution, next: guide.volume < 130 ? guide.volume + 1 : undefined }]));
const recommendedVolumes = [48, 7, 8, 55, 92, 16];
function readingIntro(chapter: Chapter) {
  const guide = readingGuides[chapter.volume];
  const format = categoryNotes[chapter.category as BookCategory];
  return `<section class="book-intro" aria-label="本卷白话导读"><span class="book-kicker">先读懂，再看原文 · 本站导读</span><h3>${esc(guide?.question ?? `怎样读《${chapter.title}》？`)}</h3><p>${esc(guide?.summary ?? format.method)}</p>${guide ? `<p><strong>阅读时留意</strong> ${esc(guide.focus)}</p>` : ''}${guide?.note ? `<p class="book-intro-note">${esc(guide.note)}</p>` : ''}<details class="book-format"><summary>${chapter.category}是什么？${format.label}</summary><p>${esc(format.method)}</p></details>${callbacks.onGuide ? '<button class="secondary-button" data-book="guide">按步骤读这一卷的完整导读 →</button>' : ''}<p class="book-intro-boundary">下面保留《史记》原文。简体只转换字形，不是白话翻译；这段导读也不是逐句译文。</p></section>`;
}
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!;
const status = (text: string) => { $('.book-status').textContent = text; };
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); }
  catch { status('当前浏览器无法保存阅读位置，仍可继续阅读。'); }
}
function setRoute(next: BookLocation | null, replace = false) {
  const url = new URL(window.location.href);
  url.hash = next ? new URL(bookUrl(next, url.href)).hash : '';
  if (url.href !== window.location.href) history[replace ? 'replaceState' : 'pushState'](history.state, '', url);
}
function close() {
  clearTimeout(searchTimer);
  request++; searchRequest++;
  dialog.close(); setRoute(null, true); previousFocus?.focus(); callbacks.onClose();
}
function init() {
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.className = 'book-dialog'; dialog.setAttribute('aria-label', '史记全书');
  document.body.append(dialog);
  dialog.innerHTML = `<div class="book-top"><div><span class="book-kicker">THE RECORDS OF THE GRAND HISTORIAN</span><h1>史记<span>全书 · 130 卷</span></h1></div><button data-book="close" class="secondary-button" aria-label="关闭史记全书，返回阅读">返回阅读 ×</button></div>
    <div class="book-layout"><aside class="book-sidebar"><span class="reader-index-kicker">THE READING ROOM · 藏书索引</span><label for="book-query">搜索篇名或原文</label><div class="book-search"><input id="book-query" type="search" maxlength="100" placeholder="如：孔子、秦始皇、王侯将相" autocomplete="off"><button data-book="search" aria-label="搜索史记全文">搜索</button></div><div class="book-categories" role="group" aria-label="按体例筛选"><button data-category="" class="active">全部 130</button>${bookCategories.map(c => `<button data-category="${c}" title="${categoryNotes[c].label}">${c} ${shijiChapters.filter(v => v.category === c).length}</button>`).join('')}</div><p class="book-category-hint" id="book-category-hint">选一种体例，看看这一类在讲什么。</p><div class="book-library-actions"><button data-book="catalog">全书目录</button><button data-book="recent">继续阅读</button><button data-book="bookmarks">阅读书签</button></div><div id="book-catalog"></div><p class="book-edition">维基文库转录 · 含年表正文<br>上古至汉武帝时期</p></aside>
    <main class="book-main"><div class="book-status" role="status" aria-live="polite"></div><div id="book-content"></div></main></div>`;
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  dialog.addEventListener('click', e => {
    const target = (e.target as Element).closest<HTMLElement>('button, a'); if (!target) return;
    if (target instanceof HTMLAnchorElement && target.getAttribute('href')?.startsWith('#') && !target.getAttribute('href')!.startsWith('#shiji/')) {
      e.preventDefault();
      const anchor = document.getElementById(target.getAttribute('href')!.slice(1));
      if (anchor && dialog.contains(anchor)) anchor.scrollIntoView({ block: 'center' });
      else status('此注释定位未包含在存档中，可在卷末打开维基文库原页核对。');
      return;
    }
    if (target.dataset.volume) { void read({ volume: Number(target.dataset.volume), ...(target.dataset.block ? { block: target.dataset.block } : {}) }); return; }
    if (target.dataset.category !== undefined) { category = target.dataset.category; page = 0; renderCatalog(); void results(); return; }
    if (target.dataset.bookmark) { toggleBookmark(target.dataset.bookmark); return; }
    if (target.dataset.removeBookmark) { const [volume, block] = target.dataset.removeBookmark.split(':'); saved.bookmarks = saved.bookmarks.filter(b => !(b.volume === Number(volume) && b.block === block)); persist(); renderBookmarks(); return; }
    if (target.dataset.shareBlock && location) { void share({ volume: location.volume, block: target.dataset.shareBlock }); return; }
    switch (target.dataset.book) {
      case 'guide': if (location && callbacks.onGuide) { const volume = location.volume; close(); callbacks.onGuide(volume); } break;
      case 'close': close(); break;
      case 'catalog': query = ''; $<HTMLInputElement>('#book-query').value = ''; renderCatalog(); overview(); break;
      case 'search': page = 0; void results(); break;
      case 'recent': if (saved.recent) void read(saved.recent); else status('还没有阅读记录。'); break;
      case 'bookmarks': renderBookmarks(); break;
      case 'prev-page': page--; void results(); break;
      case 'next-page': page++; void results(); break;
      case 'script': saved.simplified = !saved.simplified; persist(); if (location) void read(location, false); break;
      case 'share': if (location) void share(location); break;
      case 'retry': if (location) void read(location, false); break;
    }
  });
  $('#book-query').addEventListener('input', () => { query = $<HTMLInputElement>('#book-query').value; page = 0; renderCatalog(); clearTimeout(searchTimer); searchRequest++; searchTimer = window.setTimeout(() => { void results(); }, 220); });
  $('#book-query').addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(searchTimer); void results(); } });
  const restoreBookRoute = () => {
    const next = parseBookLocation(window.location.hash);
    if (next) {
      if (dialog.open && next.volume === location?.volume && next.block === location?.block) return;
      if (!dialog.open) dialog.showModal(); void read(next, false);
    }
    else if (dialog.open) { request++; searchRequest++; dialog.close(); callbacks.onClose(); }
  };
  window.addEventListener('hashchange', restoreBookRoute);
  window.addEventListener('popstate', restoreBookRoute);
}
function renderCatalog() {
  const needle = simplify(query.trim());
  const chapters = shijiChapters.filter(c => (!category || c.category === category) && (!needle || simplify(c.title).includes(needle) || String(c.volume) === needle));
  $('#book-catalog').innerHTML = chapters.map(c => `<button class="book-chapter ${location?.volume === c.volume ? 'active' : ''}" data-volume="${c.volume}" ${location?.volume === c.volume ? 'aria-current="page"' : ''}><span>${String(c.volume).padStart(3, '0')}</span><strong>${esc(c.title)}</strong><small>${c.category}</small></button>`).join('') || '<p class="book-muted">篇名无匹配，可在右侧检索全文。</p>';
  dialog.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(b => { b.classList.toggle('active', b.dataset.category === category); b.setAttribute('aria-pressed', String(b.dataset.category === category)); });
  $('#book-category-hint').textContent = category ? `${category}：${categoryNotes[category as BookCategory].label}。` : '选一种体例，看看这一类在讲什么。';
}
function overview() {
  clearTimeout(searchTimer);
  request++; searchRequest++; location = null; setRoute(null, true);
  $('#book-content').innerHTML = `<section class="book-overview"><div class="book-overview-hero"><div class="book-overview-copy"><span class="book-kicker">第一次读，也有路可循</span><h2>先认识几个人，再读一段原文</h2><p>不必从第一卷一路读完。先在导读中弄清“谁做了什么、结果怎样”，再来这里核对原文。全书 130 卷都有专属导读，按背景、人物或主题、分段阅读和小结展开。</p><p>首次打开默认简体，随时可以切换原字。<strong>简体只转换字形，不是白话翻译。</strong></p><div class="reader-hero-index"><span><b>130</b>卷原文</span><span><b>05</b>种体例</span><span><b>10</b>篇年表</span></div></div>${readingAtmosphere('archive')}</div><section class="book-reading-route" aria-label="楚汉原文推荐顺序"><h3>入门原文推荐</h3><p>按这个顺序了解反秦起兵、项羽与刘邦的争战，再认识帮助刘邦的人。每次只选一篇、一小段。</p><div class="book-featured">${recommendedVolumes.map((n, i) => { const c = chapterByVolume(n)!; return `<button data-volume="${n}"><small>第 ${i + 1} 步 · 卷 ${n}</small><strong>${esc(c.title)}</strong><span>${esc(readingGuides[n].question)}</span><b>读导读与原文 →</b></button>`; }).join('')}</div></section><section class="book-format-guide" aria-label="五种体例的通俗说明"><h3>目录里的五种体例，是什么意思？</h3><dl>${bookCategories.map(c => `<div><dt>${c}<small>${shijiChapters.filter(v => v.category === c).length} 卷</small></dt><dd>${categoryNotes[c].label}</dd></div>`).join('')}</dl></section><div class="book-provenance"><h3>版本与来源</h3><p>${esc(shijiBook.edition)}。130 卷全文和十篇年表已收录，按卷加载。保留转录中的校勘记与编者小节；小节标题和校勘说明不属于司马迁原文。简体显示由繁体自动转换，核对异文时请使用原字。</p><p><a href="https://zh.wikisource.org/wiki/史記" target="_blank" rel="noopener noreferrer">维基文库与贡献者</a> · <a href="${shijiBook.licenseUrl}" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>（EPUB 标示许可） · 古代原作属公有领域</p></div></section>`;
  status('130 卷原文都在这里 · 可按推荐顺序读，也可查目录或搜索');
}
async function read(next: BookLocation, route = true) {
  clearTimeout(searchTimer);
  const chapter = chapterByVolume(next.volume); if (!chapter) return;
  const token = ++request; searchRequest++; location = next;
  if (route) setRoute(next);
  renderCatalog(); status(`正在加载卷 ${next.volume} · ${chapter.title}…`);
  $('#book-content').innerHTML = '<div class="book-loading">正在打开原文…</div>';
  try {
    const content = await loadChapter(next.volume);
    if (token !== request || !dialog.open) return;
    const display = (s: string) => saved.simplified ? simplify(s) : s;
    $('#book-content').innerHTML = `<article class="book-article"><div class="book-reading-tools"><button class="secondary-button" data-volume="${next.volume - 1}" ${next.volume === 1 ? 'disabled' : ''}>← 上一卷</button><button class="secondary-button" data-book="script">${saved.simplified ? '切换原字' : '切换简体'}</button><button class="secondary-button" data-book="share">分享本卷</button><button class="secondary-button" data-volume="${next.volume + 1}" ${next.volume === 130 ? 'disabled' : ''}>下一卷 →</button></div><span class="book-kicker">卷 ${next.volume} / 130 · ${chapter.category}</span><h2>${esc(display(chapter.originalTitle))}</h2><p class="book-subtitle">司马迁 · ${chapter.characters.toLocaleString()} 字符（含转录校勘与编者说明）</p><p class="book-muted">${saved.simplified ? '简体显示 · 只转换字形，不是白话翻译' : '繁体原字显示'} · 小节与校勘记为编者增补${chapter.tables ? ' · 表格可横向滚动' : ''}</p>${readingIntro(chapter)}<div class="book-text">${content.blocks.map(b => `<section class="book-block ${b.kind}" id="book-${b.id}" data-block="${b.id}"><div class="book-block-tools"><a href="${esc(bookUrl({ volume: next.volume, block: b.id }, window.location.href))}" aria-label="定位${b.id}">${b.id}</a><button data-bookmark="${b.id}" aria-label="收藏段落${b.id}" aria-pressed="${saved.bookmarks.some(s => s.volume === next.volume && s.block === b.id)}">${saved.bookmarks.some(s => s.volume === next.volume && s.block === b.id) ? '已收藏' : '收藏'}</button><button data-share-block="${b.id}" aria-label="分享段落${b.id}">分享</button></div><div class="book-block-content">${display(b.html)}</div></section>`).join('')}</div><footer class="book-provenance"><a href="${esc(chapter.sourceUrl)}" target="_blank" rel="noopener noreferrer">核对维基文库原页与修订历史 ↗</a><p>转录来源：维基文库贡献者；EPUB 标示 <a href="${shijiBook.licenseUrl}" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>。本站移除导航、重排版面并提供简体转换，保留正文、表格和校勘。段落编号为本站定位编号。</p></footer>${readingGuides[next.volume]?.next ? `<div class="book-next-reading"><span>接下来可以读</span><button class="primary-button" data-volume="${readingGuides[next.volume].next}">${esc(chapterByVolume(readingGuides[next.volume].next!)!.title)} →</button></div>` : ''}<div class="book-bottom-nav"><button class="secondary-button" data-volume="${next.volume - 1}" ${next.volume === 1 ? 'disabled' : ''}>← 上一卷</button><button class="secondary-button" data-book="catalog">全书目录</button><button class="primary-button" data-volume="${next.volume + 1}" ${next.volume === 130 ? 'disabled' : ''}>下一卷 →</button></div></article>`;
    saved.recent = next; persist();
    status(`卷 ${next.volume} · ${chapter.title} · ${chapter.blocks} 个阅读段落${chapter.tables ? ` · ${chapter.tables} 张表格` : ''}`);
    $('.book-main').scrollTop = 0;
    if (next.block) {
      const block = $(`#book-${next.block}`); block?.classList.add('book-target');
      const event = journeyEvent(new URL(window.location.href).searchParams.get('journey'));
      const eventSource = event?.sources.find(source => source.book === 'shiji' && source.volume === next.volume && source.block === next.block);
      const needle = simplify((eventSource?.cue ?? query).trim());
      const contentHost = block?.querySelector('.book-block-content');
      if (needle && contentHost) {
        const walker = document.createTreeWalker(contentHost, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = []; while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
        for (const node of textNodes) {
          const original = node.data; const converted = simplify(original);
          const at = converted.indexOf(needle);
          if (at < 0 || converted.length !== original.length) continue;
          const mark = document.createElement('mark'); mark.textContent = original.slice(at, at + needle.length);
          node.replaceWith(document.createTextNode(original.slice(0, at)), mark, document.createTextNode(original.slice(at + needle.length)));
        }
      }
      const match = block?.querySelector('mark');
      (match ?? block)?.scrollIntoView({ block: !match && block?.classList.contains('table') ? 'start' : 'center', inline: match ? 'center' : 'start' });
    }
  } catch (error) {
    if (token !== request || !dialog.open) return;
    status(error instanceof Error ? error.message : '加载失败');
    $('#book-content').innerHTML = '<div class="book-loading">暂时无法读取本卷。<button class="primary-button" data-book="retry">重新加载</button></div>';
  }
}
async function results() {
  query = $<HTMLInputElement>('#book-query').value.trim();
  if (!query) { overview(); return; }
  const token = ++searchRequest; request++; location = null; setRoute(null, true);
  status('正在检索全书…');
  try {
    const index = await loadBookSearch();
    if (token !== searchRequest || !dialog.open) return;
    const needle = simplify(query.normalize('NFKC')).slice(0, 100);
    const { hits, total } = searchBook(index, needle, category, page * 40);
    const mark = (s: string) => s.split(needle).map(esc).join(`<mark>${esc(needle)}</mark>`);
    $('#book-content').innerHTML = `<section class="book-results"><span class="book-kicker">全文检索 · ${category || '全部体例'}</span><h2>“${esc(query)}”</h2><p>找到 ${total} 个匹配段落${total ? ` · 第 ${page + 1} / ${Math.ceil(total / 40)} 页` : ''}，覆盖正文、年表与校勘说明。点击结果定位到原文。</p>${hits.map(h => `<button class="book-hit" data-volume="${h.volume}" data-block="${h.block}"><strong>卷 ${h.volume} · ${esc(chapterByVolume(h.volume)!.title)} <small>${h.block}</small></strong><span>${mark(h.snippet)}</span></button>`).join('') || '<p class="book-empty">没有匹配原文。可尝试篇名、人物的其他称谓或更短的关键词。</p>'}<div class="book-bottom-nav"><button class="secondary-button" data-book="prev-page" ${page === 0 ? 'disabled' : ''}>上一页</button><button class="secondary-button" data-book="next-page" ${(page + 1) * 40 >= total ? 'disabled' : ''}>下一页</button></div></section>`;
    status(`全文检索完成 · ${total} 个匹配段落`); $('.book-main').scrollTop = 0;
  } catch { if (token === searchRequest && dialog.open) { status('全文索引加载失败，请点击搜索重试。'); $('#book-content').innerHTML = '<p class="book-empty">仍可从目录打开单卷阅读。</p>'; } }
}
function toggleBookmark(block: string) {
  if (!location) return;
  const { volume } = location;
  const exists = saved.bookmarks.some(b => b.volume === volume && b.block === block);
  saved.bookmarks = exists ? saved.bookmarks.filter(b => b.volume !== volume || b.block !== block) : [...saved.bookmarks, { volume, block }].slice(-500);
  persist();
  const button = $<HTMLButtonElement>(`[data-bookmark="${block}"]`); button.textContent = exists ? '收藏' : '已收藏'; button.setAttribute('aria-pressed', String(!exists));
  status(exists ? '已移除阅读书签' : '已保存阅读书签');
}
function renderBookmarks() {
  clearTimeout(searchTimer);
  request++; searchRequest++; location = null; setRoute(null, true);
  $('#book-content').innerHTML = `<section class="book-results"><h2>阅读书签</h2><p>仅保存在当前浏览器。</p>${saved.bookmarks.map(b => `<div class="book-saved"><button class="book-hit" data-volume="${b.volume}" data-block="${b.block}"><strong>卷 ${b.volume} · ${esc(chapterByVolume(b.volume)!.title)}</strong><span>段落 ${b.block}</span></button><button class="secondary-button" data-remove-bookmark="${b.volume}:${b.block}" aria-label="删除卷${b.volume}段落${b.block}书签">删除</button></div>`).join('') || '<p class="book-empty">在原文段落旁点击“收藏”，留下阅读位置。</p>'}</section>`;
  status(`${saved.bookmarks.length} 个阅读书签`);
}
async function share(next: BookLocation) {
  const url = bookUrl(next, window.location.href);
  try { await navigator.clipboard.writeText(url); status('原文链接已复制。'); }
  catch { status('请选择并复制链接：'); const input = document.createElement('input'); input.className = 'share-input'; input.readOnly = true; input.value = url; input.setAttribute('aria-label', '原文分享链接'); $('.book-status').append(input); input.select(); }
}
export function openShijiReader(options: { volume?: number; block?: string; query?: string; onClose: () => void; onGuide?: (volume: number) => void }) {
  callbacks = options; init();
  if (!dialog.open) { previousFocus = document.activeElement as HTMLElement; dialog.showModal(); }
  query = options.query ?? ''; category = ''; page = 0; $<HTMLInputElement>('#book-query').value = query; renderCatalog();
  if (options.volume) void read({ volume: options.volume, ...(options.block ? { block: options.block } : {}) });
  else if (query) void results();
  else overview();
}
