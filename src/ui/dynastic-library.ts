import { Converter } from 'opencc-js';
import { dynasticBooks, dynasticBook, dynasticChapter, dynasticUrl, loadDynasticChapter, loadDynasticSearch, parseDynasticLocation, type DynasticBook, type DynasticChapter, type DynasticBlock } from '../domain/dynastic-library';
import './dynastic-library.css';

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const simplify = Converter({ from: 'tw', to: 'cn' });
const groups = ['西汉与东汉', '三国与晋', '南北朝与隋', '唐与五代', '宋辽金元明'];
const groupDescription: Record<string, string> = {
  '西汉与东汉': '汉朝前后两段：先认皇帝更替，再读人物与制度。',
  '三国与晋': '从魏蜀吴的分立读到晋的统一与再次分裂。',
  '南北朝与隋': '南北并存，阅读时先确定人物属于哪一边、哪个朝代。',
  '唐与五代': '唐朝之后政权更替很快，可对照新旧两种史书。',
  '宋辽金元明': '宋、辽、金一度并立；元、明接续其后，不能把它们读成一条单线。',
};
const readingMethod: Record<string, string> = {
  '本纪': '本纪常围绕君主和政权。先认主角，再按年号或事件顺序读。',
  '列传': '列传记录人物。先找姓名、身份和处境，再看他做了什么，结局如何。',
  '世家': '世家多从家族或重要人物切入。留意世代更替与地位变化。',
  '载记': '载记记录特定政权与人物。先确定它与当时其他政权的关系。',
  '表': '表用来对照时间、官职或人物；可横向寻找同一时期的记录。',
  '志': '志按制度或主题编排。先确定主题，再看它如何随时间变化。',
  '篇章': '先看开头说的是谁或什么事，再从原文中找时间、地点和结果。',
};
const route = [
  { title: '先认识汉朝', ids: ['hanshu', 'houhanshu'], prompt: '为什么汉朝会分为前后两段？' },
  { title: '看分裂与统一', ids: ['sanguozhi', 'jinshu'], prompt: '三国之后，统一为什么没有维持？' },
  { title: '分清南朝与北朝', ids: ['songshu', 'weishu', 'nanshi', 'beishi', 'suishu'], prompt: '同一时期，南方和北方各由谁统治？' },
  { title: '从唐读到五代', ids: ['jiutangshu', 'xintangshi', 'jiuwudaishi', 'xinwudaishi'], prompt: '同一段历史，旧史和新史如何取舍？' },
  { title: '读并立与接续', ids: ['songshi', 'liaoshi', 'jinshi', 'yuanshi', 'mingshi'], prompt: '宋、辽、金哪些时期并存？随后又怎样变化？' },
];
const sourceNote = '本站提供整理后的原文阅读与机器生成的卷目索引。少数历法表仍有缺录；导读并非逐句白话译文。原文转录与卷名可能有讹误，请按来源核对。';

export function createDynasticLibrary(host: HTMLElement, callbacks: { onShiji: () => void }) {
  let currentBook: DynasticBook | null = null;
  let currentVolume: number | null = null;
  let catalogPage = 0;
  let searchPage = 0;
  let searchTerm = '';
  let currentQuery = '';
  let request = 0;
  let simplified = true;
  try { simplified = localStorage.getItem('historical-nebula:dynastic-script') !== 'traditional'; } catch { /* Optional preference. */ }

  const text = (value: string) => esc(simplified ? simplify(value) : value);
  const setStatus = (value: string) => { const status = host.querySelector<HTMLElement>('[data-library-status]'); if (status) status.textContent = value; };
  const chapterButton = (book: DynasticBook, chapter: DynasticChapter, selected = false) => `<button class="dynasty-volume${selected ? ' active' : ''}" data-history="${book.id}" data-volume="${chapter.volume}"><span>卷 ${chapter.volume}</span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.category)}</small></button>`;

  function shell(content: string, side = '') {
    host.innerHTML = `<div class="dynasty-shell"><div class="dynasty-top"><div><span class="book-kicker">二十四史 · 从《史记》读到《明史》</span><h1>沿着史书，读懂中国历史</h1><p>24 部正史 · 3,213 卷可阅读卷次，少数历法表缺录。先选时代，再从一本书、一卷原文开始。</p></div><div class="dynasty-top-actions"><button class="secondary-button" data-library="home">全书目录</button><button class="secondary-button" data-library="shiji">读《史记》</button></div></div><div class="dynasty-layout">${side ? `<aside class="dynasty-side">${side}</aside>` : ''}<main class="dynasty-main"><div class="dynasty-status" data-library-status role="status" aria-live="polite"></div>${content}</main></div></div>`;
  }

  function home() {
    currentBook = null; currentVolume = null; request++;
    const cards = groups.map((group, index) => `<section class="dynasty-era"><div class="dynasty-era-heading"><span>${String(index + 1).padStart(2, '0')}</span><div><h2>${group}</h2><p>${groupDescription[group]}</p></div></div><div class="dynasty-book-grid">${dynasticBooks.filter(book => book.group === group).map(book => `<button class="dynasty-book-card" data-history="${book.id}"><span>${esc(book.era)}</span><strong>《${esc(book.name)}》</strong><p>${esc(book.intro)}</p><small>${book.volumes} 卷原文 →</small></button>`).join('')}</div></section>`).join('');
    const path = route.map((step, i) => `<li><span>${i + 1}</span><div><strong>${step.title}</strong><p>${step.prompt}</p><div>${step.ids.map(id => `<button data-history="${id}">《${dynasticBook(id)!.name}》</button>`).join('')}</div></div></li>`).join('');
    shell(`<section class="dynasty-welcome"><div><span class="book-kicker">给第一次读史的人</span><h2>先找一条线，再展开一部书</h2><p>这些史书跨越多个朝代，也有同一时期的不同写法。你可以跟着下面五段路线阅读；每本书都有一句入门导读，正文仍保留原文。</p><button class="primary-button" data-history="hanshu">从《汉书》开始 →</button></div><div class="dynasty-welcome-stats"><b>23</b><span>新增史书</span><b>3,083</b><span>新增原文卷次</span></div></section><section class="dynasty-route"><h2>推荐阅读路线</h2><ol>${path}</ol></section><div class="dynasty-catalog-heading"><h2>按朝代找史书</h2><label>筛选书名或朝代<input data-library-filter type="search" placeholder="如：唐、宋史、辽" autocomplete="off"></label></div><div data-library-books>${cards}</div><p class="dynasty-disclaimer">${sourceNote}</p>`);
    setStatus('从史记接着读，共 23 部新增史书。');
  }

  function side(book: DynasticBook, volume?: number) {
    const pageSize = 40;
    catalogPage = volume !== undefined ? Math.floor((Math.max(1, volume) - 1) / pageSize) : catalogPage;
    const start = catalogPage * pageSize;
    const chapters = book.chapters.filter(chapter => chapter.volume > 0);
    return `<div class="dynasty-side-head"><button data-library="home">← 全书目录</button><h2>《${esc(book.name)}》</h2><p>${esc(book.era)} · ${book.volumes} 卷</p></div><label class="dynasty-search-label">在本书原文中搜索<div class="dynasty-search"><input data-library-search type="search" maxlength="100" value="${esc(searchTerm)}" placeholder="人物、地名或事件"><button data-library="search">检索</button></div></label><div class="dynasty-side-actions"><button data-library="book-home">本书导读</button><button data-library="recent">继续阅读</button></div><div class="dynasty-catalog-pages"><button data-library="catalog-prev" ${catalogPage === 0 ? 'disabled' : ''}>上一组</button><span>${start + 1}–${Math.min(start + pageSize, chapters.length)} / ${chapters.length}</span><button data-library="catalog-next" ${(catalogPage + 1) * pageSize >= chapters.length ? 'disabled' : ''}>下一组</button></div><div class="dynasty-volume-list">${chapters.slice(start, start + pageSize).map(chapter => chapterButton(book, chapter, chapter.volume === volume)).join('')}</div>${book.chapters.some(chapter => chapter.volume === 0) ? `<button class="dynasty-preface" data-history="${book.id}" data-volume="0">另读本书序言 →</button>` : ''}`;
  }

  function bookHome(book: DynasticBook) {
    if (currentBook?.id !== book.id) catalogPage = 0;
    currentBook = book; currentVolume = null; request++;
    const first = book.chapters.find(chapter => chapter.volume === 1)!;
    const categoryCounts = ['本纪', '表', '志', '世家', '列传', '载记', '篇章'].map(name => ({ name, count: book.chapters.filter(chapter => chapter.volume > 0 && chapter.category === name).length })).filter(item => item.count);
    shell(`<article class="dynasty-book-intro"><span class="book-kicker">先读懂这本书</span><h2>《${esc(book.name)}》讲什么？</h2><p class="dynasty-lead">${esc(book.intro)}</p><div class="dynasty-question"><strong>从哪里开始？</strong><p>先读第一卷，认出时代和主角。遇到不懂的称谓，可以先跳过，读完一段后再回看卷名和上下文。</p><button class="primary-button" data-history="${book.id}" data-volume="1">读第一卷 · ${esc(first.title)} →</button></div><h3>这本书怎样安排？</h3><p>共 ${book.volumes} 卷。左侧目录按每 40 卷分组；也可以搜索这本书的原文，点击结果直接回到所在段落。</p><div class="dynasty-genre-grid">${categoryCounts.map(item => `<div><strong>${item.name} · ${item.count} 卷</strong><span>${readingMethod[item.name]}</span></div>`).join('')}</div><div class="dynasty-intro-list">${book.chapters.filter(chapter => chapter.volume > 0).slice(0, 8).map(chapter => chapterButton(book, chapter)).join('')}</div><h3>与哪些书对照？</h3><div class="dynasty-neighbors">${neighborBooks(book).map(other => `<button data-history="${other.id}">《${esc(other.name)}》<span>${esc(other.era)}</span></button>`).join('')}</div><p class="dynasty-disclaimer">${sourceNote}</p></article>`, side(book));
    setStatus(`《${book.name}》 · ${book.volumes} 卷 · ${book.characters.toLocaleString()} 字符`);
  }

  function neighborBooks(book: DynasticBook) {
    const index = dynasticBooks.findIndex(candidate => candidate.id === book.id);
    const sameEra = dynasticBooks.filter(candidate => candidate.id !== book.id && candidate.era === book.era);
    return [...new Map([...sameEra, ...[dynasticBooks[index - 1], dynasticBooks[index + 1]].filter(Boolean)].map(item => [item.id, item])).values()] as DynasticBook[];
  }

  async function read(book: DynasticBook, volume: number, block?: string) {
    const chapter = dynasticChapter(book, volume);
    if (!chapter) { bookHome(book); return; }
    currentBook = book; currentVolume = volume;
    const token = ++request;
    shell('<div class="dynasty-loading">正在打开原文…</div>', side(book, volume));
    try {
      const content = await loadDynasticChapter(book, volume);
      if (token !== request) return;
      const script = simplified ? '简体字形' : '繁体原字';
      const next = volume < book.volumes ? volume + 1 : undefined;
      const previous = volume > 1 ? volume - 1 : undefined;
      const opening = chapter.excerpt;
      const blockHtml = (block: DynasticBlock) => block.kind === 'table' ? (simplified ? simplify(block.html) : block.html) : text(block.text).replaceAll('\n', '<br>');
      host.querySelector('.dynasty-main')!.innerHTML = `
        <div class="dynasty-status" data-library-status role="status" aria-live="polite"></div>
        <article class="dynasty-reader">
          <div class="dynasty-breadcrumb"><button data-library="book-home">《${esc(book.name)}》导读</button><span>›</span><span>卷 ${volume}</span></div>
          <div class="dynasty-reader-heading"><span class="book-kicker">${esc(book.era)} · ${esc(chapter.category)}</span><h2>${esc(chapter.title)}</h2><p>《${esc(book.name)}》卷 ${volume} · ${chapter.characters.toLocaleString()} 字符 · ${content.blocks.length} 段${content.blocks.some(block => block.kind === 'table') ? ' · 含原文表格' : ''}</p></div>
          <section class="dynasty-reading-note"><span class="book-kicker">读前提示</span><h3>这一卷从哪里读起？</h3><p>${readingMethod[chapter.category] ?? readingMethod['篇章']}</p><p><strong>开头原文：</strong>“${esc(opening)}${opening.length >= 95 ? '…' : ''}”</p>${chapter.incomplete ? '<p class="dynasty-incomplete">此卷底本注明表格省略，本站尚缺原表。请打开卷末来源页核对，不能把这里视为全卷全文。</p>' : ''}<small>下面是原文。提示只教你怎样读，不代替原文，也不是逐句译文。</small></section>
          <div class="dynasty-reading-actions"><button data-library="script" aria-pressed="${simplified}">${script} · 点击切换</button><button data-library="share">分享本卷</button></div>
          <div class="book-text">${content.blocks.map(block => `<section class="book-block ${block.kind}" id="dynasty-${block.id}"><div class="book-block-tools"><a href="${esc(dynasticUrl({ book: book.id, volume, block: block.id }))}" data-library-block="${block.id}">${block.id}</a><button data-library="share-block" data-block="${block.id}">分享此段</button></div><div class="book-block-content">${blockHtml(block)}</div></section>`).join('')}</div>
          <footer class="book-provenance"><a href="${esc(chapter.sourceUrl)}" target="_blank" rel="noopener noreferrer">核对本卷转录来源 ↗</a>${chapter.comparisonUrl ? ` · <a href="${esc(chapter.comparisonUrl)}" target="_blank" rel="noopener noreferrer">查看维基文库同卷 ↗</a>` : ''}<p>${esc(chapter.edition)}。段落编号由本站生成；原文简体显示只转换字形。${sourceNote}</p></footer>
          <div class="book-bottom-nav"><button class="secondary-button" data-history="${book.id}" data-volume="${previous ?? ''}" ${previous === undefined ? 'disabled' : ''}>← 上一卷</button><button class="secondary-button" data-library="book-home">本书导读</button><button class="primary-button" data-history="${book.id}" data-volume="${next ?? ''}" ${next === undefined ? 'disabled' : ''}>下一卷 →</button></div>
        </article>`;
      setStatus(`《${book.name}》卷 ${volume} · ${chapter.title}`);
      try { localStorage.setItem('historical-nebula:dynastic-recent', JSON.stringify({ book: book.id, volume })); } catch { /* Optional progress. */ }
      if (block) queueMicrotask(() => host.querySelector(`#dynasty-${block}`)?.scrollIntoView({ block: 'center' }));
    } catch (error) {
      if (token !== request) return;
      host.querySelector('.dynasty-main')!.innerHTML = `<div class="dynasty-error"><p>${esc(error instanceof Error ? error.message : '原文加载失败')}</p><button class="primary-button" data-history="${book.id}" data-volume="${volume}">重试</button></div>`;
    }
  }

  async function search(book: DynasticBook, term: string, page = 0) {
    const needle = simplify(term.normalize('NFKC').trim()).slice(0, 100);
    if (!needle) { bookHome(book); return; }
    currentBook = book; currentVolume = null; currentQuery = term; searchPage = page;
    const token = ++request;
    shell('<div class="dynasty-loading">正在搜索这本书的原文…</div>', side(book));
    try {
      const index = await loadDynasticSearch(book);
      if (token !== request) return;
      const hits: { volume: number; block: string; snippet: string }[] = [];
      let total = 0;
      for (const volume of index) for (const block of volume.blocks) {
        const at = block.text.indexOf(needle);
        if (at < 0) continue;
        if (total >= page * 30 && hits.length < 30) hits.push({ volume: volume.volume, block: block.id, snippet: block.text.slice(Math.max(0, at - 35), at + needle.length + 70) });
        total++;
      }
      const highlight = (value: string) => value.split(needle).map(esc).join(`<mark>${esc(needle)}</mark>`);
      host.querySelector('.dynasty-main')!.innerHTML = `<div class="dynasty-status" data-library-status role="status" aria-live="polite"></div><section class="dynasty-results"><button class="text-button" data-library="book-home">← 《${esc(book.name)}》导读</button><h2>“${esc(term)}”的原文结果</h2><p>在《${esc(book.name)}》找到 ${total.toLocaleString()} 个匹配段落。点击查看原文上下文。</p>${hits.map(hit => `<button class="book-hit" data-history="${book.id}" data-volume="${hit.volume}" data-block="${hit.block}"><strong>卷 ${hit.volume} · ${esc(dynasticChapter(book, hit.volume)?.title ?? '')} <small>${hit.block}</small></strong><span>${highlight(hit.snippet)}</span></button>`).join('') || '<p class="book-empty">没有找到。可试较短的名字或不同称谓。</p>'}<div class="book-bottom-nav"><button class="secondary-button" data-library="search-prev" ${page === 0 ? 'disabled' : ''}>上一页</button><span>第 ${page + 1} / ${Math.max(1, Math.ceil(total / 30))} 页</span><button class="secondary-button" data-library="search-next" ${(page + 1) * 30 >= total ? 'disabled' : ''}>下一页</button></div></section>`;
      setStatus(`《${book.name}》全文检索 · ${total.toLocaleString()} 个匹配段落`);
    } catch (error) {
      if (token !== request) return;
      host.querySelector('.dynasty-main')!.innerHTML = `<div class="dynasty-error"><p>${esc(error instanceof Error ? error.message : '搜索失败')}</p><button data-library="book-home">返回本书目录</button></div>`;
    }
  }

  function showFromUrl() {
    const next = parseDynasticLocation(location.href);
    if (!next?.book) { home(); return; }
    const book = dynasticBook(next.book)!;
    if (next.query) { searchTerm = next.query; void search(book, next.query, next.page ?? 0); }
    else if (next.volume === undefined) bookHome(book);
    else void read(book, next.volume, next.block);
  }

  function navigate(next: { book: string; volume?: number; block?: string; query?: string; page?: number }) {
    history.pushState({ dynastic: true }, '', dynasticUrl(next));
    showFromUrl();
    host.scrollIntoView({ block: 'start' });
  }
  function navigateSearch(term: string, page = 0) {
    if (!currentBook) return;
    searchTerm = term;
    history.pushState({ dynastic: true }, '', dynasticUrl({ book: currentBook.id, query: term, page }));
    void search(currentBook, term, page);
  }

  host.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('button, a[data-library-block]');
    if (!target) return;
    if (target.dataset.libraryBlock && currentBook && currentVolume !== null) { event.preventDefault(); history.replaceState(history.state, '', dynasticUrl({ book: currentBook.id, volume: currentVolume, block: target.dataset.libraryBlock })); return; }
    if (target.dataset.history) { const volume = target.dataset.volume !== undefined && target.dataset.volume !== '' ? Number(target.dataset.volume) : undefined; navigate({ book: target.dataset.history, volume, ...(target.dataset.block ? { block: target.dataset.block } : {}) }); return; }
    switch (target.dataset.library) {
      case 'home': navigate({ book: '' }); break;
      case 'shiji': callbacks.onShiji(); break;
      case 'book-home': if (currentBook) navigate({ book: currentBook.id }); break;
      case 'recent': try { const recent = JSON.parse(localStorage.getItem('historical-nebula:dynastic-recent') || 'null'); if (recent && dynasticBook(recent.book)) navigate(recent); else setStatus('还没有新增史书的阅读记录。'); } catch { setStatus('阅读记录暂不可用。'); } break;
      case 'catalog-prev': if (currentBook && catalogPage > 0) { catalogPage--; bookHome(currentBook); } break;
      case 'catalog-next': if (currentBook && (catalogPage + 1) * 40 < currentBook.volumes) { catalogPage++; bookHome(currentBook); } break;
      case 'search': if (currentBook) navigateSearch(host.querySelector<HTMLInputElement>('[data-library-search]')?.value ?? ''); break;
      case 'search-prev': if (currentBook && searchPage > 0) navigateSearch(currentQuery, searchPage - 1); break;
      case 'search-next': if (currentBook) navigateSearch(currentQuery, searchPage + 1); break;
      case 'script': simplified = !simplified; try { localStorage.setItem('historical-nebula:dynastic-script', simplified ? 'simplified' : 'traditional'); } catch { /* Optional. */ } if (currentBook && currentVolume !== null) void read(currentBook, currentVolume); break;
      case 'share': if (currentBook && currentVolume !== null) void copy(dynasticUrl({ book: currentBook.id, volume: currentVolume })); break;
      case 'share-block': if (currentBook && currentVolume !== null && target.dataset.block) void copy(dynasticUrl({ book: currentBook.id, volume: currentVolume, block: target.dataset.block })); break;
    }
  });
  host.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    if ((event.target as HTMLElement).matches('[data-library-search]') && currentBook) navigateSearch((event.target as HTMLInputElement).value);
  });
  host.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (!input.matches('[data-library-filter]')) return;
    const needle = input.value.trim().toLowerCase();
    host.querySelectorAll<HTMLElement>('.dynasty-book-card').forEach(card => { card.hidden = !!needle && !card.textContent?.toLowerCase().includes(needle); });
    host.querySelectorAll<HTMLElement>('.dynasty-era').forEach(era => { era.hidden = ![...era.querySelectorAll('.dynasty-book-card')].some(card => !(card as HTMLElement).hidden); });
  });

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setStatus('原文链接已复制。'); }
    catch { setStatus(`请复制链接：${value}`); }
  }

  return { showFromUrl };
}
