import { Converter } from 'opencc-js/t2cn';
import { historyBookGuides, historyBookGuide, historyGuideGroups, historyGuideSteps, historyGuideLocation, historyGuideUrl, guideBookName, type HistoryGuideLocation } from '../domain/history-guides';
import { dynasticBook, loadDynasticChapter, type DynasticBook } from '../domain/dynastic-library';
import type { JourneySource } from '../domain/history-journey';
import { escapeHtml as esc } from './icons';
import { readingAtmosphere } from './reading-atmosphere';
import './history-guides.css';
import './guide-gallery.css';

interface Options {
  onShiji: () => void;
  onSource: (book: string, step: string, source: JourneySource) => void;
  onBook: (book: string, volume?: number) => void;
}
const simplify = Converter({ from: 'tw', to: 'cn' });
const KEY = 'historical-nebula:history-book-guides:v1';
const methods: Record<string, string> = {
  '本纪': '先认君主，再按年号串起事件。这是建立全书时间顺序的入口。',
  '列传': '先认人物的身份与处境，再看选择和结局。同一事件可能在多篇传中出现。',
  '志': '按制度和主题阅读。带着赋税、官制、地理等具体问题来查，比一口气背下来更容易。',
  '表': '先看表头，辨认时间与人物，再对照同一行或同一列。手机上原表可以横向滑动。',
  '世家': '围绕人物、家族或政权展开，留意不同史书对这种体例的使用差别。',
  '载记': '先弄清是哪个政权，再把它放回与其他政权并存的年代。',
};

export function createHistoryGuides(host: HTMLElement, options: Options) {
  let state = historyGuideLocation(location.href);
  let query = '', group = '', chapterQuery = '', chapterCategory = '', limit = 24;
  let previewRequest = 0, sourceIndex = 0;
  let recent: HistoryGuideLocation | null = null;
  let completed = new Set<string>();
  const validProgress = new Set(historyBookGuides.flatMap(item => historyGuideSteps(item.book).map(step => `${item.book}:${step.event.id}`)));
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved?.recent && historyBookGuide(saved.recent.book)) recent = historyGuideLocation(historyGuideUrl(saved.recent.book, saved.recent.step));
    if (Array.isArray(saved?.completed)) completed = new Set(saved.completed.filter((item: unknown) => typeof item === 'string' && validProgress.has(item)));
  } catch { /* Reading works without saved progress. */ }
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const steps = () => historyGuideSteps(state.book);
  const selected = () => steps().find(item => item.event.id === state.step)!;
  function persist() {
    if (state.book) recent = { ...state };
    try { localStorage.setItem(KEY, JSON.stringify({ recent, completed: [...completed] })); } catch { /* Optional. */ }
  }
  function navigate(book = '', step = '') {
    const sameBook = book === state.book && !!book;
    history.pushState({ historyGuide: true }, '', historyGuideUrl(book, step));
    showFromUrl();
    const target = sameBook ? host.querySelector<HTMLElement>('.hg-event') : host.querySelector<HTMLElement>('h1');
    target?.scrollIntoView({ block: 'start' }); target?.focus({ preventScroll: true });
  }
  function home() {
    host.innerHTML = `<div class="hg-home guide-gallery"><header class="hg-hero guide-gallery-hero"><div class="guide-hero-copy"><span class="story-kicker">二十四史 · 全书入门导读</span><h1 tabindex="-1">一部一部，<br>读懂中国历史。</h1><p class="guide-hero-lead">朝代会更替，故事会接着发生。<br>先看这部书写什么，再从关键事件进入原文。</p><ol class="guide-reading-method" aria-label="每部史书的阅读顺序"><li><span>01</span>当时的局面</li><li><span>02</span>人物与主题</li><li><span>03</span>事件分段讲解</li><li><span>04</span>读完记住什么</li></ol><p class="hg-scope">《史记》有 130 卷逐卷导读；其余 23 部提供全书入门导读和关键事件选读，均可进入原文核对。</p>${recent ? `<button class="text-button" data-hg-action="resume">继续上次：《${guideBookName(recent.book)}》 · ${esc(historyGuideSteps(recent.book).find(item => item.event.id === recent!.step)!.event.title)} →</button>` : ''}</div><div class="guide-model-exhibit">${readingAtmosphere('archive')}<p class="guide-exhibit-label"><span>跨越时代的书架</span><small>24 部史书 · 前后接续，也有同时并立</small></p></div></header><section class="hg-start guide-first-route"><div><span class="story-kicker">不知道从哪本开始？</span><h2>读过《史记》，可以接着读《汉书》。</h2><p>《史记》写到汉武帝时期；《汉书》补上西汉后半段，再由《后汉书》接到东汉。遇到并立的朝代，导读会先帮你分清两条线。</p></div><button class="primary-button" data-hg-book="hanshu">开始《汉书》导读 →</button></section><section class="hg-directory"><div class="hg-section-head"><h2>选择你想读懂的史书</h2><span>24 部史书 · 随时可以跳读</span></div><label class="reading-search"><input data-hg-search type="search" aria-label="搜索史书导读" maxlength="100" placeholder="搜书名、人物或问题，如：三国、刘秀、统一" value="${esc(query)}"></label><div class="reading-category-tabs" role="group" aria-label="按时代筛选导读"><button data-hg-group="" aria-pressed="${!group}">全部史书</button>${historyGuideGroups.map(item => `<button data-hg-group="${item}" aria-pressed="${group === item}">${item}</button>`).join('')}</div><div data-hg-results></div></section><p class="hg-footnote">这是帮助理解的入门选读，不是逐句翻译，也不代表已经讲完每一卷。原文目录继续保留，可按问题展开阅读。</p></div>`;
    renderCards();
  }
  function renderCards() {
    const needle = simplify(query.trim()).toLowerCase();
    const matches = (text: string) => !needle || simplify(text).toLowerCase().includes(needle);
    const shiji = (!group || group === '秦汉') && matches('史记 上古 先秦 秦汉 刘邦 项羽 孔子 司马迁 130 卷');
    const books = historyBookGuides.filter(item => (!group || item.group === group) && matches([guideBookName(item.book), item.era, item.question, item.background, ...historyGuideSteps(item.book).flatMap(step => [step.event.title, ...step.event.people])].join(' ')));
    $('[data-hg-results]').innerHTML = `<p class="reading-results-caption" role="status">找到 ${books.length + Number(shiji)} 部史书${group ? ' · ' + group : ''}</p><div class="hg-cards">${shiji ? `<button class="hg-card" data-hg-book="shiji"><span>上古至汉武帝时期</span><h3>《史记》</h3><p>从许多邦国到秦汉统一，人物的选择怎样改变历史？</p><small>130 卷专属导读 · 8 条路线</small><b>阅读《史记》导读 →</b></button>` : ''}${books.map(item => {
      const list = historyGuideSteps(item.book), count = list.filter(step => completed.has(`${item.book}:${step.event.id}`)).length;
      return `<button class="hg-card" data-hg-book="${item.book}"><span>${esc(item.era)}</span><h3>《${guideBookName(item.book)}》</h3><p>${esc(item.question)}</p><small>全书入门 · ${list.length} 个事件选读 · ${dynasticBook(item.book)!.volumes} 卷原文</small><b>${count ? `已读 ${count} / ${list.length} 节 · 继续导读` : '从导读开始'} →</b></button>`;
    }).join('')}</div>${!books.length && !shiji ? '<div class="hg-empty"><p>没有找到，试试较短的书名或人物名。</p><button class="secondary-button" data-hg-action="clear-search">清除搜索与筛选</button></div>' : ''}`;
  }
  function detail() {
    const introduction = historyBookGuide(state.book)!, book = dynasticBook(state.book)!;
    const list = steps(), current = selected(), event = current.event;
    const position = list.findIndex(item => item.event.id === event.id);
    const read = list.filter(item => completed.has(`${state.book}:${item.event.id}`)).length;
    const people = [...new Set(list.flatMap(item => item.event.people))];
    const source = current.sources[sourceIndex];
    const guideIndex = historyBookGuides.indexOf(introduction), nextBook = historyBookGuides[guideIndex + 1];
    host.innerHTML = `<div class="story-shell reading-detail hg-detail guide-gallery"><div class="reading-detail-top"><button class="text-button" data-hg-action="home">← 二十四史导读</button><span>《${book.name}》 · 已读 ${read} / ${list.length} 节事件导读</span><button class="text-button" data-hg-action="share">分享当前导读 ↗</button></div><div data-hg-status role="status" aria-live="polite"></div><div class="hg-layout"><nav class="hg-side" aria-label="本书事件导读路线"><label>切换史书<select data-hg-select aria-label="选择史书导读"><option value="shiji">《史记》</option>${historyBookGuides.map(item => `<option value="${item.book}"${item.book === state.book ? ' selected' : ''}>《${guideBookName(item.book)}》</option>`).join('')}</select></label><p>先用 ${list.length} 个事件认识这本书</p><ol>${list.map((item, i) => `<li><button data-hg-step="${item.event.id}"${item.event.id === state.step ? ' aria-current="step"' : ''}><span>${completed.has(`${state.book}:${item.event.id}`) ? '✓' : i + 1}</span><div><strong>${esc(item.event.title)}</strong><small>${esc(item.event.year)}</small></div></button></li>`).join('')}</ol><button class="text-button" data-hg-action="chapters">展开全书 ${book.volumes} 卷目录 ↓</button><p class="hg-side-note">这里讲解关键节点，不必先把整部书读完。原文目录保留全部已收录卷次。</p></nav><main class="story-reading"><header class="story-chapter-heading"><div class="story-chapter-meta"><span>${esc(introduction.era)}</span><span>全书入门导读 · ${book.volumes} 卷原文</span></div><h1 tabindex="-1">《${book.name}》导读</h1><p class="story-question">${esc(introduction.question)}</p></header><section class="story-background"><h3><span>01</span>先知道，当时是什么局面</h3><p>${esc(introduction.background)}</p><div class="hg-connection"><strong>与前后史书怎么连起来？</strong><p>${esc(introduction.connection)}</p></div></section><section class="story-cast"><h3><span>02</span>先认识这些人物</h3><div class="reading-cast">${people.map(person => { const separator = person.indexOf('：'); return `<div><strong>${esc(separator < 0 ? person : person.slice(0, separator))}</strong><p>${esc(separator < 0 ? '' : person.slice(separator + 1))}</p></div>`; }).join('')}</div></section><section class="story-scene-reading"><h3><span>03</span>按这个顺序读事件</h3><div class="story-step-tabs" role="group" aria-label="本书事件选读">${list.map((item, i) => `<button data-hg-step="${item.event.id}" aria-current="${item.event.id === state.step ? 'step' : 'false'}"><span>${i + 1}</span>${esc(item.event.title)}</button>`).join('')}</div><article class="story-current-step hg-event" tabindex="-1"><span class="story-kicker">事件 ${position + 1} / ${list.length} · ${esc(event.year)}</span><h2>${esc(event.title)}</h2><p class="hg-event-lead">${esc(event.summary)}</p><div class="hg-explanation"><h4>之前发生了什么？</h4><p>${esc(event.before)}</p><h4>这次到底发生了什么？</h4><p>${esc(event.happening)}</p><h4>后来有什么变化？</h4><p>${esc(event.after)}</p></div>${event.caution ? `<p class="reading-caution">${esc(event.caution)}</p>` : ''}<div class="story-takeaway"><span>这件事，先记住一句话</span><p>${esc(event.remember)}</p></div><div class="reading-source-actions"><button class="text-button" data-hg-action="source">打开对应原文段落 →</button><span>卷 ${source.volume} · ${source.block}</span></div></article><div class="story-next-bar"><button class="secondary-button" data-hg-step="${list[Math.max(0, position - 1)].event.id}" ${position === 0 ? 'disabled' : ''}>← 上一节</button><button class="primary-button" data-hg-action="next">${position < list.length - 1 ? '读懂了，进入下一节 →' : completed.has(`${state.book}:${state.step}`) ? '✓ 这一节已读懂' : '✓ 读懂了，记录这一节'}</button></div></section><section class="story-outcome"><h3><span>04</span>读完这份导读，记住什么</h3><p>${esc(introduction.takeaway)}</p><small>本书事件导读进度：${read} / ${list.length} 节${read === list.length ? ' · 已完成，可以回看原文或继续读其他书。' : ''}</small></section><details class="story-terms"><summary>不熟悉的词，点这里解释<span>${introduction.terms.length} 个</span></summary><dl>${introduction.terms.map(term => `<div><dt>${esc(term.word)}</dt><dd>${esc(term.definition)}</dd></div>`).join('')}</dl></details><section class="hg-read-on"><h3>接下来，怎样读这本书？</h3><p>${esc(introduction.approach)}</p><details class="hg-chapters"><summary>展开《${book.name}》全书 ${book.volumes} 卷目录</summary><p class="hg-catalog-note">以下进入原文；上方事件已有白话讲解，其余卷次可按体例和篇名选读。</p><label class="reading-search"><input data-hg-chapter-search type="search" maxlength="100" aria-label="搜索本书卷目" placeholder="搜卷名、人物或卷号" value="${esc(chapterQuery)}"></label><div class="reading-category-tabs" role="group" aria-label="按体例选读原文"><button data-hg-category="" aria-pressed="${!chapterCategory}">全部</button>${[...new Set(book.chapters.map(item => item.category))].map(category => `<button data-hg-category="${esc(category)}" aria-pressed="${chapterCategory === category}">${esc(category)}</button>`).join('')}</div><div data-hg-chapters></div></details></section><section class="hg-related"><h3>接着读，或对照着读</h3><p>这些书有前后接续，也有同时期的不同视角。</p><div>${introduction.related.map(id => `<button class="secondary-button" data-hg-book="${id}">《${guideBookName(id)}》导读 →</button>`).join('')}</div>${nextBook ? `<button class="text-button" data-hg-book="${nextBook.book}">按书目继续：《${guideBookName(nextBook.book)}》 →</button>` : ''}</section></main><aside class="reading-companion hg-companion guide-source-exhibit">${readingAtmosphere('archive', true)}<div class="reading-companion-heading"><span class="story-kicker">对照着读，慢慢理解</span><h2>这一段，回到原文看</h2><p>《${book.name}》 · ${esc(source.label)}</p></div>${current.sources.length > 1 ? `<div class="hg-source-tabs" role="group" aria-label="选择原文出处">${current.sources.map((item, i) => `<button data-hg-source="${i}" aria-pressed="${sourceIndex === i}">卷 ${item.volume} · ${item.block}</button>`).join('')}</div>` : ''}<div class="reading-source-preview" aria-live="polite">正在打开对应原文…</div><div class="reading-companion-actions"><button class="primary-button" data-hg-action="source">阅读这一段原文 ↗</button><button class="secondary-button" data-hg-volume="${source.volume}">阅读本卷完整原文</button></div><p class="hg-preview-note">节选只转换简体字形；打开原文后可切换字形、查看上下文，并返回这一节导读。</p></aside></div><footer class="story-page-note">本站导读是综合讲解，不是逐句译文；每个节点附本书原文，便于核对。<button data-hg-action="book">打开《${book.name}》原文目录 →</button></footer></div>`;
    renderChapters(book); void preview();
  }
  function renderChapters(book = dynasticBook(state.book)!) {
    const needle = simplify(chapterQuery.trim());
    const chapters = book.chapters.filter(chapter => (!chapterCategory || chapter.category === chapterCategory) && (!needle || simplify(chapter.title).includes(needle) || String(chapter.volume) === needle));
    $('[data-hg-chapters]').innerHTML = `<p class="hg-catalog-note">${esc(methods[chapterCategory] ?? '先从感兴趣的篇章开始；原文中的人物和事件，可结合上方导读回看。')}</p><p class="reading-results-caption" role="status">${chapters.length} 个卷目${chapters.length > limit ? ` · 显示前 ${limit} 个` : ''}</p><div class="hg-chapter-list">${chapters.slice(0, limit).map(chapter => `<button data-hg-volume="${chapter.volume}"><span>${chapter.volume === 0 ? '序' : '卷 ' + chapter.volume} · ${esc(chapter.category)}</span><strong>${esc(chapter.title)}</strong><small>${chapter.incomplete ? '含缺录提示 · ' : ''}阅读原文 →</small></button>`).join('')}</div>${!chapters.length ? '<p class="hg-catalog-note">没有匹配卷目，试试更短的名字或“全部”体例。</p>' : ''}${chapters.length > limit ? '<button class="secondary-button hg-more" data-hg-action="more">再显示 24 个卷目</button>' : ''}`;
  }
  async function preview() {
    const token = ++previewRequest, book = dynasticBook(state.book)!, source = selected().sources[sourceIndex];
    try {
      const content = await loadDynasticChapter(book, source.volume);
      if (token !== previewRequest) return;
      const block = content.blocks.find(item => item.id === source.block);
      const text = simplify(block?.text ?? ''), at = text.indexOf(source.cue);
      if (!block || at < 0) throw new Error('原文定位暂不可用');
      const start = Math.max(0, at - 55), end = Math.min(text.length, at + source.cue.length + 150);
      $('.reading-source-preview').innerHTML = `<span>原文节选 · 简体字形</span><blockquote>${start ? '…' : ''}${esc(text.slice(start, at))}<mark>${esc(text.slice(at, at + source.cue.length))}</mark>${esc(text.slice(at + source.cue.length, end))}${end < text.length ? '…' : ''}</blockquote><small>《${book.name}》卷 ${source.volume} · ${source.block}</small>`;
    } catch {
      if (token !== previewRequest) return;
      $('.reading-source-preview').innerHTML = '<p>原文暂未加载，导读仍可阅读。</p><button class="text-button" data-hg-action="retry">重新加载原文</button>';
    }
  }
  function showFromUrl() {
    previewRequest++;
    const next = historyGuideLocation(location.href);
    if (next.book !== state.book) { chapterQuery = ''; chapterCategory = ''; limit = 24; }
    state = next; sourceIndex = 0; persist();
    if (state.book) detail(); else home();
  }
  function openBookGuide(book: string) { if (book === 'shiji') options.onShiji(); else navigate(book); }
  host.addEventListener('change', event => {
    const input = event.target as HTMLSelectElement;
    if (input.matches('[data-hg-select]')) openBookGuide(input.value);
  });
  host.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-hg-search]')) { query = input.value; renderCards(); }
    if (input.matches('[data-hg-chapter-search]')) { chapterQuery = input.value; limit = 24; renderChapters(); }
  });
  host.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (button.dataset.hgBook) return openBookGuide(button.dataset.hgBook);
    if (button.dataset.hgStep) return navigate(state.book, button.dataset.hgStep);
    if (button.dataset.hgGroup !== undefined) { group = button.dataset.hgGroup; home(); return; }
    if (button.dataset.hgVolume !== undefined) return options.onBook(state.book, Number(button.dataset.hgVolume));
    if (button.dataset.hgCategory !== undefined) {
      chapterCategory = button.dataset.hgCategory; limit = 24;
      host.querySelectorAll<HTMLElement>('[data-hg-category]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.hgCategory === chapterCategory)));
      renderChapters(); return;
    }
    if (button.dataset.hgSource !== undefined) {
      sourceIndex = Number(button.dataset.hgSource); previewRequest++; detail(); return;
    }
    switch (button.dataset.hgAction) {
      case 'home': navigate(); break;
      case 'resume': if (recent) navigate(recent.book, recent.step); break;
      case 'clear-search': query = ''; group = ''; home(); break;
      case 'source': options.onSource(state.book, state.step, selected().sources[sourceIndex]); break;
      case 'book': options.onBook(state.book); break;
      case 'chapters': { const catalog = $<HTMLDetailsElement>('.hg-chapters'); catalog.open = true; catalog.scrollIntoView({ block: 'start' }); catalog.querySelector('input')?.focus({ preventScroll: true }); break; }
      case 'more': limit += 24; renderChapters(); break;
      case 'retry': void preview(); break;
      case 'next': {
        completed.add(`${state.book}:${state.step}`); persist();
        const list = steps(), next = list[list.findIndex(item => item.event.id === state.step) + 1];
        if (next) navigate(state.book, next.event.id);
        else { previewRequest++; detail(); $('[data-hg-status]').textContent = '已记录这一节的阅读进度。'; $('.story-outcome').scrollIntoView({ block: 'center' }); }
        break;
      }
      case 'share': {
        const url = historyGuideUrl(state.book, state.step);
        void (navigator.clipboard?.writeText(url) ?? Promise.reject(new Error('Clipboard unavailable'))).then(() => { if (host.contains(button)) button.textContent = '链接已复制'; }).catch(() => { if (host.contains(button)) button.outerHTML = `<input class="share-input" readonly aria-label="当前导读链接" value="${esc(url)}">`; });
        break;
      }
    }
  });
  return { showFromUrl, hide() { previewRequest++; } };
}
