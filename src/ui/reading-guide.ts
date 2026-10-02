import { Converter } from 'opencc-js/t2cn';
import { chapterGuide, readingRoutes, readingRoute, categoryExplanations } from '../domain/chapter-guides';
import { shijiChapters, chapterByVolume, bookCategories, loadChapter } from '../domain/shiji-book';
import { guideHomeUrl, guideLocation, guideUrl, type GuideLocation } from '../exploration/reading';
import { escapeHtml as esc, icon } from './icons';
import './reading-guide.css';

const simplify = Converter({ from: 'tw', to: 'cn' });
const KEY = 'historical-nebula:full-book-guides:v1';
interface GuideOptions { onBook: (volume?: number, block?: string) => void; onHistories?: () => void }

export function createReadingGuide(host: HTMLElement, options: GuideOptions) {
  let state = guideLocation(location.href);
  type GuideView = 'home' | 'route' | 'detail';
  const viewFromUrl = (): GuideView => state.volume ? 'detail' : new URL(location.href).searchParams.has('route') ? 'route' : 'home';
  let view = viewFromUrl();
  let query = '', category = '', limit = 24;
  let sourceRequest = 0;
  let recent: GuideLocation | null = null;
  let completed = new Set<number>();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved?.recent && chapterGuide(saved.recent.volume)) recent = guideLocation(guideUrl(saved.recent, location.href));
    if (Array.isArray(saved?.completed)) completed = new Set(saved.completed.filter((v: number) => chapterGuide(v)));
  } catch { /* Progress is optional. */ }
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const route = () => readingRoute(state.route);
  const volumes = () => route().volumes;
  function persist() {
    if (state.volume) recent = { ...state };
    try { localStorage.setItem(KEY, JSON.stringify({ recent, completed: [...completed] })); } catch { /* Reading remains available. */ }
  }
  function navigate(next: GuideLocation, push = true) {
    const previousVolume = state.volume;
    state = guideLocation(guideUrl(next, location.href));
    if (state.volume && !readingRoute(state.route).volumes.includes(state.volume)) state.route = 'complete';
    view = state.volume ? 'detail' : 'route';
    if (push) history.pushState({ ...history.state, reading: state.volume }, '', guideUrl(state, location.href));
    persist(); render();
    const sameVolume = state.volume && state.volume === previousVolume;
    const target = sameVolume ? host.querySelector<HTMLElement>('.story-scene-reading')! : host;
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    const heading = host.querySelector<HTMLElement>(sameVolume ? '.story-current-step h2' : 'h1');
    heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
  }
  function navigateHome() {
    state = guideLocation(guideHomeUrl(location.href));
    view = 'home'; query = ''; category = ''; limit = 24;
    history.pushState({ ...history.state, reading: null }, '', guideHomeUrl(location.href));
    render();
    host.scrollIntoView({ block: 'start', behavior: 'instant' });
    $('h1').focus({ preventScroll: true });
  }
  function catalog() {
    host.innerHTML = `<div class="reading-home"><header class="reading-home-hero"><div><span class="story-kicker">《史记》全书 · 从导读进入原文</span><h1 tabindex="-1">先读懂，再往下读。</h1><p>130 卷，按同一种清楚的顺序展开：<br><strong>当时的局面 → 人物与主题 → 分段阅读 → 读完记住什么</strong></p><span class="reading-scope">每卷都有专属导读；正文完整保留，随时对照。</span></div>${recent ? `<button class="text-button reading-resume" data-reading-action="resume">继续上次：${esc(chapterByVolume(recent.volume!)!.title)} →</button>` : ''}</header><section class="reading-routes"><div class="reading-section-title"><h2>选一条适合你的阅读路线</h2><span>点击路线进入专属页面，再按顺序选一卷</span></div><div class="reading-route-cards">${readingRoutes.map(item => `<button data-reading-route="${item.id}"><span>${item.volumes.length} 卷${item.id === 'first-stories' ? ' · 推荐入门' : ''}</span><strong>${esc(item.title)}</strong><p>${esc(item.description)}</p><span class="reading-route-cta">进入这条路线 →</span></button>`).join('')}</div></section><p class="reading-home-foot">这里是帮助理解的入门导读，原文仍保留在“史记原文”中。上古传说、作者评论和后人补记，会在相应卷中提示。</p></div>`;
    if (options.onHistories) $('.reading-home-hero').insertAdjacentHTML('beforeend', '<button class="text-button reading-resume" data-reading-action="histories">继续认识其他史书：二十四史导读 →</button>');
  }
  function routeCatalog() {
    const selected = route();
    const progress = selected.volumes.filter(volume => completed.has(volume)).length;
    host.innerHTML = `<div class="reading-home reading-route-page"><div class="reading-route-back"><button class="text-button" data-reading-action="home">← 返回全部阅读路线</button><span>《史记》导读 · ${readingRoutes.indexOf(selected) + 1} / ${readingRoutes.length}</span></div><header class="reading-route-hero"><span class="story-kicker">${selected.volumes.length} 卷 · 已读 ${progress} 卷导读</span><h1 tabindex="-1">${esc(selected.title)}</h1><p>${esc(selected.description)}</p><button class="primary-button" data-reading-volume="${selected.volumes[0]}">从第 1 步开始读 ${icon('arrow')}</button></header><section class="reading-directory"><div class="reading-section-title"><h2>按这条路线往下读</h2><span>点一卷进入导读，原文仍可随时对照</span></div><label class="reading-search">${icon('search')}<input id="reading-query" type="search" placeholder="在这条路线中搜索篇名、人物或问题" value="${esc(query)}" maxlength="100" aria-label="搜索当前路线导读"></label><div class="reading-category-tabs" role="group" aria-label="按体例查看当前路线"><button data-reading-category="" aria-pressed="${!category}">全部卷次</button>${bookCategories.map(item => `<button data-reading-category="${item}" aria-pressed="${category === item}">${item}</button>`).join('')}</div><p class="reading-category-explanation">${esc(category ? categoryExplanations[category] : selected.description)}</p><div id="reading-catalog-results"></div></section></div>`;
    renderResults();
  }
  function renderResults() {
    const needle = simplify(query.trim()).toLowerCase();
    const chapters = shijiChapters.filter(chapter => {
      const guide = chapterGuide(chapter.volume)!;
      if (!volumes().includes(chapter.volume)) return false;
      if (category && chapter.category !== category) return false;
      return !needle || simplify([chapter.title, chapter.volume, guide.question, guide.background, ...guide.people.map(p => p.name)].join(' ')).toLowerCase().includes(needle);
    }).sort((a, b) => volumes().indexOf(a.volume) - volumes().indexOf(b.volume));
    $('#reading-catalog-results').innerHTML = `<p class="reading-results-caption" role="status">${route().title}${needle ? ' · 搜索结果' : category ? ` · ${category}` : ''} · ${chapters.length} 卷${chapters.length > limit ? ` · 当前显示 ${limit} 卷` : ''}</p><div class="reading-chapter-cards">${chapters.slice(0, limit).map(chapter => { const guide = chapterGuide(chapter.volume)!; return `<button data-reading-volume="${chapter.volume}"><span class="reading-card-number">${String(volumes().indexOf(chapter.volume) + 1).padStart(2, '0')}</span><span><small>第 ${volumes().indexOf(chapter.volume) + 1} 步 · 卷 ${chapter.volume} · ${chapter.category}${completed.has(chapter.volume) ? ' · 已读导读' : ''}</small><strong>${esc(chapter.title)}</strong><p>${esc(guide.question)}</p><span class="reading-card-cta">${guide.sections.length} 段导读 · 开始读 →</span></span></button>`; }).join('')}</div>${!chapters.length ? '<p class="reading-empty">这条路线里没有找到这项内容。试试其他人物或体例，也可以返回选择其他路线。</p>' : ''}${chapters.length > limit ? '<button class="secondary-button reading-more" data-reading-action="more">再显示 24 卷</button>' : ''}`;
  }
  function detail() {
    const chapter = chapterByVolume(state.volume!)!;
    const guide = chapterGuide(chapter.volume)!;
    const current = guide.sections[state.section];
    const index = volumes().indexOf(chapter.volume);
    const last = state.section === guide.sections.length - 1;
    const next = index < volumes().length - 1 ? chapterByVolume(volumes()[index + 1]) : undefined;
    const allProgress = volumes().filter(v => completed.has(v)).length;
    host.innerHTML = `<div class="story-shell reading-detail"><div class="reading-detail-top"><button class="text-button" data-reading-action="catalog">← 全书导读与阅读路线</button><span>${esc(route().title)} · 已读 ${allProgress} / ${volumes().length} 卷导读</span><button class="text-button" data-reading-action="share">${icon('share')}分享这一段</button></div><div class="story-layout"><nav class="story-route reading-volume-route" aria-label="当前路线卷次"><div class="story-route-title"><span>${esc(route().title)}</span><small>${volumes().length} 卷 · 可以跳读</small></div><ol>${volumes().map((v, i) => `<li><button data-reading-volume="${v}" ${v === chapter.volume ? 'aria-current="step"' : ''}><span class="story-route-number">${completed.has(v) ? '✓' : i + 1}</span><span><strong>${esc(chapterByVolume(v)!.title)}</strong><small>卷 ${v} · ${chapterByVolume(v)!.category}</small></span></button></li>`).join('')}</ol></nav><main class="story-reading"><header class="story-chapter-heading"><div class="story-chapter-meta"><span>卷 ${chapter.volume} / 130 · ${chapter.category}</span><span>${guide.sections.length} 段导读 · 原文完整保留</span></div><h1 tabindex="-1">${esc(chapter.title)}</h1><p class="story-question">${esc(guide.question)}</p></header>${guide.caution ? `<p class="reading-caution">${esc(guide.caution)}</p>` : ''}<section class="story-background"><h3><span>01</span>${chapter.category === '表' || chapter.category === '书' ? '先知道，这一卷讨论什么' : '先知道，当时是什么局面'}</h3><p>${esc(guide.background)}</p></section><section class="story-cast"><h3><span>02</span>先认识这里的人物与主题</h3><div class="reading-cast">${guide.people.map(person => `<div><strong>${esc(person.name)}</strong><p>${esc(person.role)}</p></div>`).join('')}</div></section><section class="story-scene-reading"><h3><span>03</span>按这个顺序读</h3><div class="story-step-tabs" role="group" aria-label="本卷分段导读">${guide.sections.map((section, i) => `<button data-reading-section="${i}" aria-current="${i === state.section ? 'step' : 'false'}"><span>${i + 1}</span>${esc(section.title)}</button>`).join('')}</div><article class="story-current-step" aria-live="polite"><span class="story-kicker">导读 ${state.section + 1} / ${guide.sections.length}</span><h2>${esc(current.title)}</h2><p>${esc(current.text)}</p><div class="reading-source-actions"><button class="text-button" data-reading-action="source">打开对应原文段落 ${icon('arrow')}</button><span>卷 ${chapter.volume} · ${esc(current.block)}</span></div></article></section>${last ? `<section class="story-outcome"><h3><span>04</span>读完这一卷，记住什么</h3><p>${esc(guide.takeaway)}</p><button class="text-button" data-reading-action="complete">${completed.has(chapter.volume) ? '✓ 本卷导读已读' : '✓ 我读懂了，记下进度'}</button></section>` : ''}<details class="story-terms"><summary>不熟悉的词，点这里解释<span>${guide.terms.length} 个</span></summary><dl>${guide.terms.map(term => `<div><dt>${esc(term.word)}</dt><dd>${esc(term.definition)}</dd></div>`).join('')}</dl></details><div class="story-next-bar"><button class="secondary-button" data-reading-action="prev" ${!state.section && index <= 0 ? 'disabled' : ''}>← ${state.section ? '上一段' : '上一卷导读'}</button><button class="primary-button" data-reading-action="next">${!last ? '下一段：' + esc(guide.sections[state.section + 1].title) : next ? '下一卷：' + esc(next.title) : '完成这条阅读路线'} ${icon('arrow')}</button></div><div class="reading-completion hidden" role="status"></div></main><aside class="reading-companion"><div class="reading-companion-heading"><span class="story-kicker">对照着读，慢慢理解</span><h2>这一段，回到原文看</h2><p>${esc(chapter.category)} · ${esc(categoryExplanations[chapter.category])}</p></div><div class="reading-source-preview" aria-live="polite">正在打开对应原文…</div><div class="reading-companion-actions"><button class="primary-button" data-reading-action="source">阅读这一段原文 ↗</button><button class="secondary-button" data-reading-action="whole">阅读本卷完整原文</button></div></aside></div><footer class="story-page-note">这是一份分段导读，不是逐句翻译。点击对应段落可核对《史记》原文。<button data-reading-action="book">打开全书原文 →</button></footer></div>`;
    $<HTMLButtonElement>('.reading-detail-top [data-reading-action="catalog"]').textContent = `← 返回「${route().title}」路线`;
    const list = $<HTMLOListElement>('.reading-volume-route ol');
    const active = $<HTMLButtonElement>('.reading-volume-route [aria-current="step"]');
    const bounds = list.getBoundingClientRect(), item = active.getBoundingClientRect();
    list.scrollTop += item.top - bounds.top - (list.clientHeight - item.height) / 2;
    list.scrollLeft += item.left - bounds.left - (list.clientWidth - item.width) / 2;
    void sourcePreview();
  }
  async function sourcePreview() {
    const volume = state.volume!;
    const block = chapterGuide(volume)!.sections[state.section].block;
    const token = ++sourceRequest;
    try {
      const content = await loadChapter(volume);
      if (token !== sourceRequest || !state.volume) return;
      const original = content.blocks.find(item => item.id === block);
      if (!original) throw new Error('对应段落暂不可用');
      const text = simplify(original.text);
      $('.reading-source-preview').innerHTML = `<span>原文${original.kind === 'table' ? '表格' : '节选'} · 简体字形显示</span>${original.kind === 'table' ? '<p>这一段是一张表。打开原表后，先认表头，再对照同一行的内容；手机上可横向滑动。</p>' : `<blockquote>${esc(text.slice(0, 260))}${text.length > 260 ? '…' : ''}</blockquote>`}<small>卷 ${volume} · ${esc(block)}${text.length > 260 && original.kind !== 'table' ? ' · 点下方读完整段落' : ''}</small>`;
    } catch {
      if (token !== sourceRequest || !state.volume) return;
      $('.reading-source-preview').innerHTML = '<p>原文暂时没有加载出来，导读仍可阅读。</p><button class="text-button" data-reading-action="retry-source">重新加载原文</button>';
    }
  }
  function render() { sourceRequest++; if (view === 'detail') detail(); else if (view === 'route') routeCatalog(); else catalog(); }
  host.addEventListener('input', event => {
    if ((event.target as HTMLElement).id === 'reading-query') { query = (event.target as HTMLInputElement).value; limit = 24; renderResults(); }
  });
  host.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button'); if (!button || button.disabled) return;
    if (button.dataset.readingVolume) return navigate({ ...state, volume: Number(button.dataset.readingVolume), section: 0 });
    if (button.dataset.readingRoute) { query = ''; category = ''; limit = 24; return navigate({ volume: null, section: 0, route: button.dataset.readingRoute }); }
    if (button.dataset.readingSection !== undefined) return navigate({ ...state, section: Number(button.dataset.readingSection) });
    if (button.dataset.readingCategory !== undefined) {
      category = button.dataset.readingCategory; limit = 24;
      host.querySelectorAll<HTMLButtonElement>('[data-reading-category]').forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.readingCategory === category)));
      $('.reading-category-explanation').textContent = category ? categoryExplanations[category] : route().description;
      renderResults(); return;
    }
    const current = state.volume ? chapterGuide(state.volume)! : null;
    const index = state.volume ? volumes().indexOf(state.volume) : -1;
    switch (button.dataset.readingAction) {
      case 'catalog': navigate({ ...state, volume: null, section: 0 }); break;
      case 'home': navigateHome(); break;
      case 'histories': options.onHistories?.(); break;
      case 'resume': if (recent) navigate(recent); break;
      case 'more': limit += 24; renderResults(); break;
      case 'source': if (current) options.onBook(current.volume, current.sections[state.section].block); break;
      case 'whole': if (current) options.onBook(current.volume); break;
      case 'book': options.onBook(); break;
      case 'retry-source': void sourcePreview(); break;
      case 'complete': if (current) { completed.add(current.volume); persist(); render(); } break;
      case 'prev':
        if (state.section > 0) navigate({ ...state, section: state.section - 1 });
        else if (index > 0) { const v = volumes()[index - 1]; navigate({ ...state, volume: v, section: chapterGuide(v)!.sections.length - 1 }); }
        break;
      case 'next':
        if (!current) break;
        if (state.section < current.sections.length - 1) navigate({ ...state, section: state.section + 1 });
        else {
          completed.add(current.volume); persist();
          if (index < volumes().length - 1) navigate({ ...state, volume: volumes()[index + 1], section: 0 });
          else { render(); $('.reading-completion').classList.remove('hidden'); $('.reading-completion').innerHTML = `<strong>这条路线已经到达终点。</strong><p>已读 ${volumes().filter(v => completed.has(v)).length} / ${volumes().length} 卷导读；可以回顾未读的卷，或选择另一条路线。</p><button class="secondary-button" data-reading-action="catalog">回到路线与目录</button>`; }
        }
        break;
      case 'share': void (navigator.clipboard?.writeText(guideUrl(state, location.href)) ?? Promise.reject(new Error('Clipboard unavailable'))).then(() => { button.textContent = '链接已复制'; }).catch(() => { button.outerHTML = `<input class="share-input" readonly aria-label="当前导读链接" value="${esc(guideUrl(state, location.href))}">`; }); break;
    }
  });
  return {
    showFromUrl() { const previousRoute = state.route; state = guideLocation(location.href); if (state.volume && !volumes().includes(state.volume)) state.route = 'complete'; if (previousRoute !== state.route) { query = ''; category = ''; limit = 24; } view = viewFromUrl(); persist(); render(); },
    openVolume(volume?: number) { navigate({ volume: volume && chapterGuide(volume) ? volume : null, section: 0, route: volume && !volumes().includes(volume) ? 'complete' : state.route }); },
    get readingUrl() { return guideUrl(state, location.href); },
  };
}
