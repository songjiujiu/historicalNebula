import { escapeHtml as esc } from './icons';
import { historyBookNames, journeyEras, journeyEvents, journeyEra, journeyEvent, journeyUrl, journeySourceUrl, quickJourneyIds, type JourneyEvent, type JourneySource } from '../domain/history-journey';
import './history-journey.css';

interface JourneyOptions {
  onSource: (event: JourneyEvent, source: JourneySource) => void;
  onLibrary: () => void;
}
const KEY = 'historical-nebula:journey:v1';
export function createHistoryJourney(host: HTMLElement, options: JourneyOptions) {
  let selected: JourneyEvent | undefined;
  let eraId = '';
  let scope = 'quick';
  let query = '';
  let recent = '';
  let read = new Set<string>();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    recent = journeyEvent(saved?.recent)?.id ?? '';
    if (Array.isArray(saved?.read)) read = new Set(saved.read.filter((id: unknown) => typeof id === 'string' && journeyEvent(id)));
  } catch { /* Reading remains available without storage. */ }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ recent, read: [...read] })); } catch { /* Optional progress. */ }
  }
  const route = () => scope === 'all' ? journeyEvents : quickJourneyIds.map(id => journeyEvent(id)!);
  const eventButton = (event: JourneyEvent) => `<button class="journey-event-card" data-journey-event="${event.id}"><span class="journey-event-year">${esc(event.year)}</span><span class="journey-card-body"><strong>${esc(event.title)}</strong><span>${esc(event.summary)}</span><small>${event.sources.map(source => historyBookNames[source.book]).filter((book, i, books) => books.indexOf(book) === i).map(book => `《${book}》`).join(' · ')}${read.has(event.id) ? ' · 已读懂 ✓' : ''}</small></span><span class="journey-card-arrow" aria-hidden="true">↗</span></button>`;
  function rail() {
    return `<aside class="journey-rail"><span class="journey-overline">按时代找位置</span><nav aria-label="历史时代"><button data-journey-era="" aria-current="${!eraId && !selected ? 'page' : 'false'}"><b>◎</b><span>全部时代<small>从上古到明</small></span></button>${journeyEras.map((era, index) => `<button data-journey-era="${era.id}" aria-current="${era.id === (selected?.era ?? eraId) ? 'page' : 'false'}"><b>${String(index + 1).padStart(2, '0')}</b><span>${era.title}<small>${era.years}</small></span></button>`).join('')}</nav><div class="journey-rail-note"><strong>史书不是历史的目录顺序</strong><p>同一时代可能写在多本书里。先跟事件走，再到原文核对。</p><button data-journey-action="library">查看 24 部史书 →</button></div></aside>`;
  }
  function eraMap(era: typeof journeyEras[number]) {
    return `<div class="journey-era-map" aria-label="${era.title}政权关系">${era.lanes.map(lane => `<p>${esc(lane)}</p>`).join('')}<small>${esc(era.note)}</small></div>`;
  }
  function home() {
    selected = undefined;
    host.innerHTML = `<main class="journey-shell">
      <header class="journey-hero"><div><span class="journey-overline">给第一次读历史的你 · 二十四史入门</span><h1>先把历史<br><em>连成一条线。</em></h1><p>不用先背朝代和人名。跟着关键事件，看清当时的局面、发生的变化，以及它怎样通向下一段历史。</p><div class="journey-hero-actions"><button class="primary-button" data-journey-action="start">从第一件事开始 →</button>${recent ? `<button class="secondary-button" data-journey-action="resume">继续上次阅读</button>` : ''}</div></div><div class="journey-intro-card"><span class="journey-overline">每个事件，三步就能读</span><ol><li><b>01</b><span><strong>先看懂</strong><small>用白话理解来龙去脉</small></span></li><li><b>02</b><span><strong>再串起来</strong><small>看看前一件事与后一件事</small></span></li><li><b>03</b><span><strong>点击看依据</strong><small>直接跳到史书对应段落</small></span></li></ol><p>《史记》本身就是二十四史之一。<br>这里将它与另外 23 部史书连起来。</p></div></header>
      <div class="journey-layout">${rail()}<div class="journey-main"><section class="journey-controls" aria-label="选择阅读范围"><div><h2>你的历史主线</h2><p>先读概要，再选一个事件展开。</p></div><div class="journey-scope" role="group" aria-label="主线长短"><button data-journey-scope="quick" aria-pressed="${scope !== 'all'}">快速主线 · ${quickJourneyIds.length} 件事</button><button data-journey-scope="all" aria-pressed="${scope === 'all'}">全部关键节点 · ${journeyEvents.length}</button></div></section><label class="journey-search"><span>找事件或人物</span><input data-journey-search type="search" maxlength="100" value="${esc(query)}" placeholder="如：刘邦、赤壁、宋朝、统一" autocomplete="off"></label><p class="journey-result-count" role="status" aria-live="polite"></p><div class="journey-results"></div></div></div>
      <p class="journey-footnote">这是选取关键事件的入门路线，帮助建立时间与因果线索，不等于全书所有事件的汇总或逐句翻译。正文保留原文，阅读范围与原文缺录提示见史书目录。</p></main>`;
    renderResults();
  }
  function renderResults() {
    const needle = query.trim().toLowerCase();
    const items = (needle ? journeyEvents : route()).filter(event => (!eraId || event.era === eraId) && (!needle || [event.title, event.summary, event.before, event.happening, event.after, ...event.people, ...event.sources.map(source => historyBookNames[source.book])].join(' ').toLowerCase().includes(needle)));
    host.querySelector('.journey-result-count')!.textContent = `${needle ? '在全部关键节点中搜索' : scope === 'all' ? '完整入门路线' : '快速主线'} · ${eraId ? `${journeyEra(eraId)!.title} · ` : ''}${items.length} 个事件${read.size ? ` · 已读懂 ${read.size} / ${journeyEvents.length}` : ''}`;
    const emptyEra = eraId && !items.length && !needle && scope !== 'all';
    host.querySelector('.journey-results')!.innerHTML = items.length ? journeyEras.filter(era => items.some(event => event.era === era.id)).map(era => `<section class="journey-era-section"><header><span class="journey-overline">${esc(era.years)}</span><h2>${esc(era.title)}<small>${esc(era.question)}</small></h2><p>${esc(era.gist)}</p></header>${eraMap(era)}<div class="journey-event-list">${items.filter(event => event.era === era.id).map(eventButton).join('')}</div></section>`).join('') : `<div class="journey-empty"><h2>${emptyEra ? '这个时代还有更多故事' : '没有找到匹配的事件'}</h2><p>${emptyEra ? '快速主线只选少数转折，展开全部节点即可阅读这个时代。' : '试试简体人名、事件名，或清空筛选查看完整路线。'}</p><button class="secondary-button" data-journey-action="reset">查看全部关键节点 →</button></div>`;
  }
  function detail(event: JourneyEvent) {
    selected = event; recent = event.id; persist();
    const era = journeyEra(event.era)!;
    if (!route().includes(event)) scope = 'all';
    const items = route(), index = items.indexOf(event), prev = items[index - 1], next = items[index + 1];
    const activeRead = read.has(event.id);
    host.innerHTML = `<main class="journey-shell journey-detail-shell"><div class="journey-layout">${rail()}<article class="journey-main journey-detail"><div class="journey-detail-top"><button data-journey-action="home">← 返回历史主线</button><span>${scope === 'all' ? '全部关键节点' : '快速主线'} · ${index + 1} / ${items.length}</span></div><header class="journey-detail-heading"><span class="journey-overline">${era.title} · ${esc(event.year)}</span><h1 tabindex="-1">${esc(event.title)}</h1><p>${esc(event.summary)}</p></header>${eraMap(era)}<div class="journey-people"><span>先认清这些人</span>${event.people.map(person => `<span>${esc(person)}</span>`).join('')}</div><div class="journey-explanation">${[['之前是什么局面', event.before], ['到底发生了什么', event.happening], ['后来改变了什么', event.after]].map(([title, body], i) => `<section><span class="journey-step-number">0${i + 1}</span><div><h2>${title}</h2><p>${esc(body)}</p></div></section>`).join('')}</div><section class="journey-takeaway"><span>只记住这一点</span><p>${esc(event.remember)}</p></section>${event.caution ? `<p class="journey-caution"><strong>阅读时留意：</strong>${esc(event.caution)}</p>` : ''}
      <section class="journey-sources"><div><span class="journey-overline">看懂之后，可以回到原文</span><h2>这件事，史书写在哪里？</h2><p>点击会直接定位并高亮相关原文；上面的解释是本站综合导读，不是这些摘句的逐句翻译。</p></div>${event.sources.map((source, i) => `<a class="journey-source-card" href="${esc(journeySourceUrl(event, source, location.href))}" data-journey-source="${i}"><span>《${historyBookNames[source.book]}》卷 ${source.volume}<small>${esc(source.label)} · ${source.block}</small></span><q>${esc(source.cue)}</q><b>打开原文位置 ↗</b></a>`).join('')}<small>摘句采用简体字形。多条出处可能分别支持事件的不同阶段，也可能提供另一部史书的视角。</small></section>
      <div class="journey-complete"><button class="secondary-button" data-journey-action="complete" aria-pressed="${activeRead}">${activeRead ? '已读懂 ✓ · 点击取消' : '我读懂了，记下进度 ✓'}</button><span role="status" data-journey-progress>${read.size} / ${journeyEvents.length} 个节点已读懂</span></div><nav class="journey-neighbors" aria-label="前后事件">${prev ? `<button data-journey-event="${prev.id}"><small>← 回看前一件事 · ${esc(prev.year)}</small><strong>${esc(prev.title)}</strong><span>${esc(prev.summary)}</span></button>` : '<div class="journey-route-edge">你已来到这条路线的起点。</div>'}${next ? `<button class="journey-next" data-journey-event="${next.id}"><small>接着看 · ${esc(next.year)} →</small><strong>${esc(next.title)}</strong><span>${esc(next.summary)}</span></button>` : '<div class="journey-route-edge"><strong>已到这条路线的终点</strong><p>可以回到主线补读其他事件，或打开史书深入阅读。</p><button data-journey-action="home">返回主线 →</button></div>'}</nav><p class="journey-footnote">相邻卡片按阅读顺序衔接，可能跨越数十年；前后排列不代表唯一或直接的因果关系。</p></article></div></main>`;
  }
  function navigate(eventId = '', nextEra = '', nextScope = scope) {
    eraId = nextEra; scope = nextScope; query = '';
    if (eventId && !quickJourneyIds.includes(eventId)) scope = 'all';
    history.pushState({ journey: true }, '', journeyUrl(eventId, eraId, location.href, scope));
    showFromUrl(); host.scrollIntoView({ block: 'start' });
    const heading = host.querySelector<HTMLElement>('h1'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
  }
  function showFromUrl() {
    const params = new URL(location.href).searchParams;
    eraId = journeyEra(params.get('era'))?.id ?? ''; scope = params.get('scope') === 'all' ? 'all' : 'quick'; query = '';
    const event = journeyEvent(params.get('journey'));
    if (event) detail(event); else home();
  }
  host.addEventListener('click', ev => {
    const target = (ev.target as Element).closest<HTMLElement>('button,a'); if (!target) return;
    if (target.dataset.journeySource !== undefined && selected) {
      // Preserve normal open-in-new-tab and modified-click behavior of real source links.
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || ev.button !== 0) return;
      ev.preventDefault(); const source = selected.sources[Number(target.dataset.journeySource)]; if (source) options.onSource(selected, source); return;
    }
    if (target.dataset.journeyEvent) { navigate(target.dataset.journeyEvent); return; }
    if (target.dataset.journeyEra !== undefined) { navigate('', target.dataset.journeyEra, target.dataset.journeyEra ? 'all' : scope); return; }
    if (target.dataset.journeyScope) { navigate('', eraId, target.dataset.journeyScope); return; }
    switch (target.dataset.journeyAction) {
      case 'start': navigate(quickJourneyIds[0], '', 'quick'); break;
      case 'resume': if (recent) navigate(recent); break;
      case 'home': navigate(); break;
      case 'reset': navigate('', '', 'all'); break;
      case 'library': options.onLibrary(); break;
      case 'complete': if (selected) {
        if (read.has(selected.id)) read.delete(selected.id); else read.add(selected.id); persist();
        target.setAttribute('aria-pressed', String(read.has(selected.id)));
        target.textContent = read.has(selected.id) ? '已读懂 ✓ · 点击取消' : '我读懂了，记下进度 ✓';
        host.querySelector('[data-journey-progress]')!.textContent = `${read.size} / ${journeyEvents.length} 个节点已读懂`;
      } break;
    }
  });
  host.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-journey-search]')) { query = input.value; renderResults(); }
  });
  return { showFromUrl };
}
