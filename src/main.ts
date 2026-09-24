import './style.css';
import { entities, relations, sources, guides, CONTENT_VERSION } from './domain/data';
import { DEFAULT_STATE, buildGraph, entityById, relationById, relationMatches, searchEntities, sanitizeState, shareUrl, stateFromUrl, type ExploreState } from './exploration/core';
import type { Entity, SceneController, RelationCategory } from './domain/types';
import { icon, escapeHtml as esc } from './ui/icons';

type SavedView = { id: string; title: string; date: string; state: ExploreState };
interface LocalRecords { bookmarks: string[]; saves: SavedView[]; recent: ExploreState | null; progress: Record<string, number> }
const STORAGE_KEY = 'historical-nebula:v1';
const emptyRecords = (): LocalRecords => ({ bookmarks: [], saves: [], recent: null, progress: {} });
let records = emptyRecords();
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (raw && typeof raw === 'object') records = {
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks.filter((id: unknown) => typeof id === 'string' && entityById(id)) : [],
    saves: Array.isArray(raw.saves) ? raw.saves.filter((v: SavedView) => v && typeof v.id === 'string' && typeof v.title === 'string' && typeof v.date === 'string' && v.state).map((v: SavedView) => ({ ...v, state: sanitizeState(v.state) })).slice(0, 30) : [],
    recent: raw.recent ? sanitizeState(raw.recent) : null,
    progress: Object.fromEntries(guides.flatMap(guide => { const step = raw.progress?.[guide.id]; return Number.isInteger(step) && step >= 0 && step < guide.steps.length ? [[guide.id, step]] : []; })),
  };
} catch { /* A blocked or corrupt storage never prevents browsing. */ }

let state: ExploreState = stateFromUrl(location.href) ?? { ...DEFAULT_STATE, categories: [...DEFAULT_STATE.categories], expandedIds: [] };
if (!new URL(location.href).searchParams.has('view') && matchMedia('(max-width: 760px)').matches) state.viewMode = 'list';
let scene: SceneController | null = null;
let sceneFailed = false;
let sourcePreviousFocus: HTMLElement | null = null;
let currentDialog: string | null = null;
let draftYears = [state.fromYear, state.toYear];
let draftCategories = [...state.categories];
let draftUndated = state.showUndated;
let undoExpansions: ExploreState[] = [];
type GuideSession = { id: string; index: number; free: boolean; snapshot: ExploreState };
let guideSession: GuideSession | null = null;
let actionAnchor: string | null = null;
let historyIndex = 0;
let motionEnabled = false;
let rotateMode = false;
let currentQuality: 'low' | 'medium' | 'high' = matchMedia('(max-width:760px)').matches ? 'low' : 'medium';
try {
  const display = JSON.parse(localStorage.getItem('historical-nebula:display') || 'null');
  if (display) {
    if (['low', 'medium', 'high'].includes(display.quality)) currentQuality = display.quality;
    motionEnabled = display.motion === true; rotateMode = display.rotate === true;
  }
} catch { /* Device preferences are optional. */ }
let toastTimer = 0;
let toastUndo: (() => void) | null = null;
let lastAutoSave = 0;

const categories: Record<RelationCategory, { label: string; description: string; color: string }> = {
  military: { label: '军事协作', description: '统率、参战与对抗', color: 'blue' },
  political: { label: '政治往来', description: '联盟、任用与交涉', color: 'violet' },
  family: { label: '亲属身份', description: '身份事实，非持续互动', color: 'rose' },
  influence: { label: '历史影响', description: '事件之间的解释路径', color: 'gold' },
};

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="app-header">
    <a class="brand" href="/" aria-label="历史星云首页"><span class="brand-mark">${icon('star')}</span><span>历史星云<small>HISTORICAL NEBULA</small></span></a>
    <nav class="main-nav" aria-label="主导航"><button class="nav-item active" data-action="explore">探索星图</button><button class="nav-item" data-action="guides">专题导览<span class="nav-dot"></span></button><button class="nav-item" data-action="library">我的探索</button></nav>
    <button class="search-trigger" data-action="search" aria-label="搜索人物、事件、别名">${icon('search')}<span>搜索人物、事件、别名</span><kbd>Ctrl K</kbd></button>
    <button class="icon-button help-button" data-action="help" aria-label="探索说明">${icon('info')}</button>
  </header>
  <div class="workspace">
    <aside class="sidebar" id="sidebar" aria-label="探索筛选">
      <div class="sidebar-heading"><span>探索范围</span><button class="icon-button mobile-only" data-action="filters-close" aria-label="关闭筛选">${icon('close')}</button><span class="tiny-label">SCOPE</span></div>
      <div class="topic-card"><div class="topic-icon">${icon('grid')}</div><div><span class="eyebrow">当前专题</span><h2>汉末 · 三国</h2><p>公元 184 — 280 年</p></div></div>
      <p class="section-label">关系类型 <span>RELATIONS</span></p>
      <div id="relation-filters" class="relation-filters"></div>
      <div class="filter-divider"></div>
      <p class="section-label">内容范围</p>
      <label class="switch-row"><span>显示时间待考<small>单独标注可能相关的记录</small></span><input id="undated-toggle" type="checkbox" role="switch" /></label>
      <button class="apply-filter" data-action="apply-filters">${icon('filter')}应用筛选<span id="filter-dirty"></span></button>
      <button class="text-button reset-filter" data-action="clear-filters">重置所有筛选</button>
      <div class="sidebar-bottom"><div class="guide-promo"><span class="eyebrow">不知道从哪开始？</span><h3>从赤壁，走进三国</h3><p>沿着人物的选择，读懂一场变局。</p><button data-action="start-first-guide">开始一段导览 ${icon('arrow')}</button><div class="promo-orbits"><i></i><i></i><i></i><b></b></div></div>
      <div class="coverage"><span class="status-dot"></span>精选内容 · 持续探索<span id="coverage-count"></span></div></div>
    </aside>
    <main class="exploration" id="exploration">
      <div class="explore-toolbar"><div class="breadcrumb"><button class="icon-button" data-action="back" aria-label="返回上一视图">${icon('back')}</button><span>中国历史</span>${icon('chevron')}<span>汉末三国</span></div><div class="view-switch" role="group" aria-label="显示方式"><button data-action="view-3d">${icon('grid')}星云</button><button data-action="view-list">${icon('list')}列表</button></div></div>
      <div class="stage-heading"><div><div class="eyebrow"><span class="status-dot"></span> 关系探索 · RELATIONSHIP EXPLORER</div><h1 id="center-title"></h1><p id="stage-description"></p></div><div class="stage-actions"><button class="subtle-button" data-action="save" aria-label="保存视图">${icon('bookmark')}<span>保存视图</span></button><button class="subtle-button" data-action="share" aria-label="分享">${icon('share')}<span>分享</span></button></div></div>
      <div id="guide-bar" class="guide-bar hidden"></div>
      <div id="scene-host" class="scene-host" aria-label="三维历史关系星云"></div>
      <div id="scene-loading" class="scene-loading"><span class="loading-orbit"></span><p>点亮历史星云…</p></div>
      <div id="graph-list" class="graph-list hidden" aria-label="关系对象列表"></div>
      <div id="graph-notice" class="graph-notice hidden"></div>
      <button class="mobile-filter-button mobile-only" data-action="filters-open">${icon('filter')}筛选</button>
      <div class="canvas-caption"><span id="graph-stats"></span><span>空间距离仅用于布局</span></div>
      <div class="canvas-bottom"><div class="legend"><span><i class="legend-dot"></i>人物</span><span><i class="legend-diamond"></i>事件</span><span><i class="legend-line"></i>记载</span><span><i class="legend-line dashed"></i>解释</span></div><div class="canvas-controls"><button class="icon-button" data-action="undo-expand" aria-label="撤销上次展开" title="撤销展开">${icon('back')}</button><span class="control-separator"></span><button class="icon-button" data-action="zoom-in" aria-label="放大">${icon('plus')}</button><button class="icon-button" data-action="zoom-out" aria-label="缩小">${icon('minus')}</button><button class="icon-button" data-action="fit" aria-label="居中全部节点" title="居中全部">${icon('target')}</button><button class="icon-button" data-action="camera-reset" aria-label="回正视角" title="回正视角">${icon('reset')}</button><button class="icon-button" data-action="settings" aria-label="画质与交互设置">${icon('settings')}</button></div></div>
      <section class="timeline" aria-label="时间筛选"><div class="timeline-heading"><span>${icon('clock')}沿时间，理解变化</span><div><span id="year-display"></span><button data-action="apply-time" class="time-apply">应用时间 ${icon('arrow')}</button></div></div><div class="timeline-track"><div class="timeline-periods"><span>黄巾起义</span><span>群雄逐鹿</span><span>赤壁之战</span><span>三国鼎立</span><span>西晋统一</span></div><div class="timeline-events" id="timeline-events"></div><div class="year-inputs"><label>起<input id="year-from" type="range" min="184" max="280" step="1" aria-label="起始年份" /></label><label>止<input id="year-to" type="range" min="184" max="280" step="1" aria-label="结束年份" /></label></div><div class="timeline-years"><span>184</span><span>200</span><span>220</span><span>240</span><span>260</span><span>280</span></div></div></section>
    </main>
    <aside id="inspector" class="inspector" aria-label="当前对象详情"></aside>
  </div>
  <footer class="app-footer"><span>${icon('star')}每一个节点，都是理解历史的起点。</span><span>本地内容样本 · 待正式审校<button data-action="about-data">关于数据 ${icon('info')}</button></span></footer>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <dialog id="dialog" class="app-dialog" aria-label="探索面板"></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const cloneState = () => structuredClone(state);
const entityName = (id: string) => entityById(id)?.name ?? '未收录对象';
const entityTag = (entity: Entity) => entity.kind === 'person' ? '人物' : '事件';
const periodLabel = () => state.fromYear === state.toYear ? `公元 ${state.fromYear} 年` : `公元 ${state.fromYear} — ${state.toYear} 年`;
const timeLabel = (start: number | null, end: number | null) => start === null || end === null ? '时间待考' : start === end ? `公元 ${start} 年` : `公元 ${start}—${end} 年`;
const getSpatial = () => { if (scene && !sceneFailed && state.viewMode === 'graph3d') state.spatial = scene.getSnapshot(); };

function toast(message: string, undo?: () => void) {
  toastUndo = undo ?? null;
  $('#toast').innerHTML = `${esc(message)}${undo ? '<button class="toast-undo" data-action="undo-local">撤销</button>' : ''}`;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { $('#toast').classList.remove('visible'); toastUndo = null; }, undo ? 8000 : 3500);
}
function writeRecords(next: LocalRecords, notifyFailure = true): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); records = next; return true; }
  catch { if (notifyFailure) toast('未能保存到此浏览器，请检查存储权限或清理空间。'); return false; }
}
function saveDisplayPreferences() {
  try { localStorage.setItem('historical-nebula:display', JSON.stringify({ quality: currentQuality, motion: motionEnabled, rotate: rotateMode })); }
  catch { toast('显示设置已应用，但当前浏览器无法保存该偏好。'); }
}
function persistRecent() {
  if (Date.now() - lastAutoSave < 250) return;
  lastAutoSave = Date.now();
  const recent = cloneState(); recent.sourceId = null; recent.fullId = null;
  writeRecords({ ...records, recent }, false);
}
function historyEntry(overlay: string | null = null) {
  return { nebula: cloneState(), index: historyIndex, guide: structuredClone(guideSession), overlay,
    searchQuery: document.querySelector<HTMLInputElement>('#search-input')?.value ?? '',
    dialogScroll: $('#dialog').scrollTop, inspectorScroll: document.querySelector('.inspector-scroll')?.scrollTop ?? 0,
    actionAnchor };
}
function captureCurrentEntry() {
  getSpatial();
  const overlay = ['search', 'library', 'guides'].includes(currentDialog ?? '') ? currentDialog : null;
  history.replaceState(historyEntry(overlay), '', shareUrl(state, location.href));
}
function navigate(patch: Partial<ExploreState>, options: { replace?: boolean; resetLayout?: boolean; keepUndo?: boolean; guide?: GuideSession | null; anchor?: string } = {}) {
  captureCurrentEntry();
  if (!options.keepUndo && ('centerId' in patch || 'fromYear' in patch || 'categories' in patch || 'showUndated' in patch)) undoExpansions = [];
  const next = sanitizeState({ ...state, ...patch });
  if (options.resetLayout) delete next.spatial;
  state = next;
  actionAnchor = options.anchor ?? null;
  if ('guide' in options) guideSession = options.guide ?? null;
  if (!options.replace) historyIndex++;
  history[options.replace ? 'replaceState' : 'pushState'](historyEntry(), '', shareUrl(state, location.href));
  syncDrafts(); render(); persistRecent();
}
function restore(saved: ExploreState, keepGuide = false) {
  captureCurrentEntry(); state = sanitizeState(saved); undoExpansions = []; historyIndex++;
  actionAnchor = null;
  if (!keepGuide) guideSession = null;
  history.pushState(historyEntry(), '', shareUrl(state, location.href));
  syncDrafts(); render(); persistRecent();
}
function syncDrafts() { draftYears = [state.fromYear, state.toYear]; draftCategories = [...state.categories]; draftUndated = state.showUndated; }
function selectEntity(id: string) {
  $('.workspace').classList.remove('inspector-collapsed');
  if (matchMedia('(max-width:1100px)').matches) $('#inspector').classList.add('mobile-open');
  if (state.selectedId === id && !state.relationId) return;
  navigate({ selectedId: id, relationId: null, sourceId: null });
}
function openRelation(id: string) {
  const relation = relationById(id); if (!relation) return;
  $('.workspace').classList.remove('inspector-collapsed');
  navigate({ relationId: id, sourceId: null });
  if (matchMedia('(max-width:1100px)').matches) $('#inspector').classList.add('mobile-open');
}

function render() {
  const graph = buildGraph(state);
  const center = entityById(state.centerId)!;
  $('#center-title').innerHTML = `${esc(center.name)} <span>的历史星云</span>`;
  $('#stage-description').textContent = `${periodLabel()} · 从人物的行动，看见时代的关联`;
  $('#graph-stats').textContent = `${graph.nodes.length} 个对象 · ${graph.relations.length} 条关联`;
  $('#coverage-count').textContent = `${entities.filter(e => e.kind === 'person').length} 人物 / ${entities.filter(e => e.kind === 'event').length} 事件`;
  document.querySelectorAll('[data-action="view-3d"]').forEach(e => e.classList.toggle('active', state.viewMode === 'graph3d'));
  document.querySelectorAll('[data-action="view-list"]').forEach(e => e.classList.toggle('active', state.viewMode === 'list'));
  $('#relation-filters').innerHTML = Object.entries(categories).map(([key, cat]) => `<label class="filter-row"><input type="checkbox" value="${key}" ${draftCategories.includes(key as RelationCategory) ? 'checked' : ''}/><span class="filter-check">${icon('check')}</span><span class="filter-copy">${cat.label}<small>${cat.description}</small></span><i class="category-dot ${cat.color}"></i></label>`).join('');
  $<HTMLInputElement>('#undated-toggle').checked = draftUndated;
  $<HTMLInputElement>('#year-from').value = String(draftYears[0]); $<HTMLInputElement>('#year-to').value = String(draftYears[1]);
  $('#filter-dirty').textContent = '';
  renderYearLabel();
  $('#timeline-events').innerHTML = [184, 190, 196, 200, 208, 219, 220, 221, 222, 234, 249, 263, 265, 280].map(year => `<button class="timeline-tick ${year >= state.fromYear && year <= state.toYear ? 'in-range' : ''} ${year === 208 ? 'important' : ''}" style="left:${(year - 184) / 96 * 100}%" data-year="${year}" aria-label="查看公元${year}年" title="公元 ${year} 年"></button>`).join('');
  $('#graph-list').classList.toggle('hidden', state.viewMode !== 'list');
  $('#scene-host').classList.toggle('hidden', state.viewMode === 'list');
  $('#scene-loading').classList.toggle('hidden', state.viewMode === 'list' || scene !== null || sceneFailed);
  scene?.setActive(state.viewMode === 'graph3d' && !currentDialog);
  if (scene) scene.setGraph(graph, state.spatial);
  renderGraphList(graph.nodes, graph.contextIds);
  renderInspector(); renderGuide();
  const note = graph.relations.length === 0 ? '当前条件下暂无已收录关系。可调整时间或清除筛选，继续阅读对象内容。' : sceneFailed ? '3D 暂不可用，已为你保留同条件列表与详情。' : '';
  $('#graph-notice').innerHTML = `${esc(note)}${sceneFailed ? '<button class="text-button" data-action="retry-3d">重试 3D</button>' : ''}`; $('#graph-notice').classList.toggle('hidden', !note);
  for (const action of ['zoom-in', 'zoom-out', 'fit', 'camera-reset']) document.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.disabled = state.viewMode === 'list' || sceneFailed;
  document.querySelector<HTMLButtonElement>('[data-action="undo-expand"]')!.disabled = !undoExpansions.length;
  document.querySelector<HTMLButtonElement>('[data-action="back"]')!.disabled = historyIndex === 0;
  if (state.sourceId) renderSourceDialog(state.sourceId);
  else if (state.fullId) renderDetailDialog(state.fullId);
  else if (currentDialog === 'source' || currentDialog === 'detail') hideDialog();
  if (state.viewMode === 'graph3d') void ensureScene();
}
function renderYearLabel() {
  $('#year-display').textContent = draftYears[0] === draftYears[1] ? `公元 ${draftYears[0]} 年` : `${draftYears[0]} — ${draftYears[1]} 年`;
  const dirty = draftYears[0] !== state.fromYear || draftYears[1] !== state.toYear;
  $('#year-display').classList.toggle('draft', dirty);
  $('.time-apply').classList.toggle('dirty', dirty);
}
function renderGraphList(nodes: Entity[], contextIds: string[]) {
  $('#graph-list').innerHTML = `<div class="list-heading"><span>当前探索中的对象</span><span>${nodes.length} 项</span></div>${nodes.map(entity => `<button class="entity-list-row ${entity.id === state.selectedId ? 'selected' : ''}" data-select="${esc(entity.id)}"><span class="entity-orb ${entity.group} ${entity.kind}">${entity.kind === 'person' ? esc(entity.name[0]) : icon('star')}</span><span><strong>${esc(entity.name)}</strong><small>${esc(entity.role)} · ${esc(entity.period)}</small></span><span class="entity-type">${contextIds.includes(entity.id) ? '上下文' : entityTag(entity)}</span>${icon('chevron')}</button>`).join('')}`;
}
function sourceButtons(ids: string[]) {
  return ids.map(id => { const source = sources.find(s => s.id === id); return `<button class="source-link" data-source="${esc(id)}">${icon('book')}<span>${esc(source?.title ?? '查看依据')}<small>${esc(source?.section ?? '')}</small></span>${icon('chevron')}</button>`; }).join('');
}
function relationRows(id: string, limit = 4) {
  const list = relations.filter(r => r.source === id || r.target === id);
  const sorted = [...list].sort((a, b) => Number(relationMatches(b, state)) - Number(relationMatches(a, state)));
  return sorted.slice(0, limit).map(r => { const other = entityById(r.source === id ? r.target : r.source)!; return `<button class="relation-row" data-relation="${esc(r.id)}"><span class="mini-orb ${other.group}">${esc(other.name[0])}</span><span><strong>${esc(other.name)}</strong><small>${esc(r.label)} · ${timeLabel(r.start, r.end)}</small></span>${icon('chevron')}</button>`; }).join('') || '<p class="muted empty-copy">暂未收录相关关系。</p>';
}
function renderInspector() {
  const relation = state.relationId ? relationById(state.relationId) : null;
  const selected = entityById(state.selectedId ?? state.centerId) ?? entityById(state.centerId)!;
  const valid = selected.start <= state.toYear && selected.end >= state.fromYear;
  $('#inspector').innerHTML = relation ? `
    <div class="inspector-top"><span>${icon('link')}关系详情</span><button class="icon-button" data-action="close-relation" aria-label="关闭关系详情">${icon('close')}</button></div>
    <div class="inspector-scroll"><div class="relation-hero"><span class="eyebrow">CONNECTION</span><h2>${esc(entityName(relation.source))}<span>${icon('link')}</span>${esc(entityName(relation.target))}</h2><span class="evidence-badge ${relation.evidence}">${relation.evidence === 'record' ? '史料记载' : '历史解释'}</span><h3>${esc(relation.label)}</h3><p>${timeLabel(relation.start, relation.end)}</p></div>
    ${!relationMatches(relation, state) ? '<div class="context-warning">此关系不符合当前筛选，仅供参考。</div>' : ''}
    <section class="inspector-section"><h3>关系发生在怎样的情境中</h3><p>${esc(relation.context)}</p></section><section class="inspector-section"><h3>记载与依据</h3>${sourceButtons(relation.sourceIds)}</section><div class="reading-note">关系只在有依据的时间与情境内成立，不外推为永久关系。</div></div>
    <div class="inspector-footer"><button class="primary-button" data-action="relation-time">查看关系适用时段 ${icon('clock')}</button><button class="secondary-button" data-full="${esc(relation.target)}">查看 ${esc(entityName(relation.target))}</button></div>
  ` : `
    <div class="inspector-top"><span>${icon('target')}当前选中</span><button class="icon-button" data-action="inspector-close" aria-label="收起详情">${icon('close')}</button></div>
    <div class="inspector-scroll"><div class="entity-hero"><div class="hero-illustration ${selected.group} ${selected.kind}"><span class="hero-orbit orbit-one"></span><span class="hero-orbit orbit-two"></span><span class="hero-symbol">${selected.kind === 'person' ? esc(selected.name[0]) : icon('star')}</span><span class="hero-speck speck-one"></span><span class="hero-speck speck-two"></span><span class="hero-illustration-caption">${selected.kind === 'person' ? '人物档案' : '历史事件'} / ${selected.id.toUpperCase()}</span></div><div class="entity-title-row"><h2>${esc(selected.name)}</h2><button class="icon-button ${records.bookmarks.includes(selected.id) ? 'bookmarked' : ''}" data-bookmark="${esc(selected.id)}" aria-label="${records.bookmarks.includes(selected.id) ? '取消收藏' : '收藏'}${esc(selected.name)}">${icon('bookmark')}</button></div><div class="entity-meta"><span>${esc(selected.role)}</span><i></i><span>${esc(selected.period)}</span></div><p class="entity-summary">${esc(selected.summary)}</p><div class="content-badges"><span class="evidence-badge record">史料线索</span><span class="sample-badge">示例待审校</span></div></div>
    ${!valid ? '<div class="context-warning">当前对象不在所选活动期，保留供阅读。</div>' : ''}
    <section class="inspector-section"><div class="section-heading"><h3>${selected.kind === 'person' ? '关键行动' : '事件中的行动'}</h3><button class="text-button" data-full="${esc(selected.id)}">全部 ${icon('chevron')}</button></div>${actionCards(selected, 2)}</section>
    <section class="inspector-section"><div class="section-heading"><h3>关联人物与事件</h3><span class="small-number">${relations.filter(r => r.source === selected.id || r.target === selected.id).length}</span></div>${relationRows(selected.id, 3)}</section>
    <section class="inspector-section compact"><h3>溯源阅读</h3>${sourceButtons(selected.sourceIds.slice(0, 1))}</section></div>
    <div class="inspector-footer"><button class="primary-button" data-action="expand">${icon('grid')}展开关联 ${icon('arrow')}</button><div class="footer-button-row"><button class="secondary-button" data-full="${esc(selected.id)}">${icon('book')}完整内容</button><button class="secondary-button" data-center="${esc(selected.id)}" ${selected.id === state.centerId ? 'disabled' : ''}>${icon('target')}以此为中心</button></div></div>
  `;
}
function actionCards(entity: Entity, limit = 99) {
  const actions = entity.kind === 'person' ? entity.actions.map(a => ({ ...a, targetId: a.eventId })) : entities.filter(e => e.kind === 'person').flatMap(e => e.actions.filter(a => a.eventId === entity.id).map(a => ({ ...a, targetId: e.id, title: `${e.name} · ${a.title}` })));
  return actions.slice(0, limit).map(a => `<button class="action-card" data-record="${esc(a.id)}" data-full="${esc(a.targetId)}" data-action-anchor="${esc(a.id)}"><span class="action-year">${a.year}<small>年</small></span><span><strong>${esc(a.title)}</strong><small>${esc(a.description)}</small></span>${icon('chevron')}</button>`).join('') || `<p class="muted empty-copy">${esc(entity.kind === 'event' ? entity.summary : '行动记录正在整理，可先查看关系与来源。')}</p>`;
}

function showDialog(kind: string, html: string, label: string) {
  const dialog = $<HTMLDialogElement>('#dialog');
  const already = dialog.open;
  const previousScroll = already && dialog.getAttribute('aria-label') === label ? dialog.scrollTop : 0;
  if (!already) sourcePreviousFocus = document.activeElement as HTMLElement;
  currentDialog = kind; dialog.dataset.kind = kind; dialog.setAttribute('aria-label', label);
  dialog.innerHTML = `<div class="dialog-header"><span>${esc(label)}</span><button class="icon-button" data-action="dialog-close" aria-label="关闭">${icon('close')}</button></div>${html}`;
  if (!already) dialog.showModal();
  dialog.scrollTop = previousScroll;
  scene?.setActive(false);
}
function hideDialog() {
  currentDialog = null; $<HTMLDialogElement>('#dialog').close();
  scene?.setActive(state.viewMode === 'graph3d');
  sourcePreviousFocus?.focus();
}
function closeDialog() {
  if (state.sourceId || state.fullId) {
    if (historyIndex > 0) history.back();
    else navigate({ sourceId: null, fullId: null }, { replace: true });
  } else hideDialog();
}
function renderSourceDialog(id: string) {
  const source = sources.find(s => s.id === id); if (!source) return;
  showDialog('source', `<div class="source-content"><span class="eyebrow">回到材料本身</span><h2>${esc(source.title)}</h2><p class="source-section">${esc(source.section)}</p><div class="source-note">${esc(source.note)}</div><div class="reading-note">本地样本用于验证阅读与交互。正式发布前，仍需核对底本、卷次、段落及具体主张。</div><a class="primary-button external-source" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">打开原文 ${icon('arrow')}</a><p class="fine-print">外部来源将在新标签页打开，当前探索位置会保留。</p></div>`, '来源与依据');
}
function renderDetailDialog(id: string) {
  const entity = entityById(id); if (!entity) return;
  showDialog('detail', `<article class="full-content"><div class="detail-eyebrow">${entityTag(entity)}档案 <span>来自汉末三国专题 · ${periodLabel()}</span></div><h2>${esc(entity.name)}</h2><div class="entity-meta"><span>${esc(entity.role)}</span><i></i><span>${esc(entity.period)}</span></div><p class="detail-lead">${esc(entity.summary)}</p><p>${esc(entity.description)}</p><div class="detail-actions"><button class="primary-button" data-center="${esc(entity.id)}">${icon('grid')}在星云中查看</button><button class="secondary-button" data-bookmark="${esc(entity.id)}">${icon('bookmark')}${records.bookmarks.includes(entity.id) ? '已收藏' : '收藏对象'}</button></div><h3>${entity.kind === 'person' ? '关键行动与事件' : '参与者与行动'}</h3>${actionCards(entity)}<h3>人物与事件的关联</h3>${relationRows(entity.id, 12)}<h3>资料与出处</h3>${sourceButtons(entity.sourceIds)}<div class="reading-note">完整内容不受星云时间筛选裁切。关联只说明已收录线索，不代表穷尽所有历史关系。</div></article>`, `${entity.name} · 完整内容`);
  if (actionAnchor) {
    const card = [...$('#dialog').querySelectorAll<HTMLElement>('[data-record]')].find(e => e.dataset.record === actionAnchor);
    card?.classList.add('action-highlight');
    card?.scrollIntoView({ block: 'center' });
  }
}
function openSearch(query = '') {
  showDialog('search', `<div class="search-dialog-input">${icon('search')}<input id="search-input" type="search" placeholder="试试：黄盖、赤壁、孔明…" autocomplete="off" aria-label="搜索全部已收录内容"/><kbd>ESC</kbd></div><div class="search-scope">搜索全部已收录人物与事件，不受当前时间筛选限制</div><div id="search-results"></div>`, '寻找一个历史的入口');
  $<HTMLInputElement>('#search-input').value = query;
  renderSearchResults(query); $<HTMLInputElement>('#search-input').focus();
}
function renderSearchResults(query: string) {
  const result = query.trim() ? searchEntities(query) : entities.filter(e => ['huang-gai','zhou-yu','chibi','zhuge-liang','cao-cao','liu-bei'].includes(e.id));
  $('#search-results').innerHTML = `${!query ? '<p class="search-caption">从这些人物与事件开始</p>' : `<p class="search-caption">找到 ${result.length} 个已收录结果</p>`}${result.map(e => `<button class="search-result" data-search-result="${esc(e.id)}"><span class="mini-orb ${e.group}">${esc(e.name[0])}</span><span><strong>${esc(e.name)}</strong><small>${esc(e.role)} · ${esc(e.period)}</small></span><span class="entity-type">${entityTag(e)}</span>${icon('arrow')}</button>`).join('') || '<div class="empty-state">未找到已收录条目<p>可尝试标准姓名或别名，或浏览当前专题。</p></div>'}`;
}
function openGuides() {
  showDialog('guides', `<div class="guide-intro"><span class="eyebrow">CURATED JOURNEYS</span><h2>沿着问题，读懂历史</h2><p>一次只追问一件事。你随时可以离开导览，自由探索。</p></div><div class="guide-grid">${guides.map((guide, i) => `<button class="guide-choice guide-${i}" data-guide="${esc(guide.id)}"><span class="guide-number">0${i + 1}</span><div class="guide-choice-art">${icon(i === 0 ? 'grid' : i === 1 ? 'link' : 'clock')}</div><span class="eyebrow">${guide.steps.length} 个步骤 · ${esc(guide.duration)}</span><h3>${esc(guide.title)}</h3><p>${esc(guide.subtitle)}</p><span class="guide-start">${records.progress[guide.id] ? `继续第 ${Math.min(records.progress[guide.id] + 1, guide.steps.length)} 步` : '开始导览'} ${icon('arrow')}</span></button>`).join('')}</div>`, '专题导览');
}
function startGuide(id: string, index?: number) {
  const guide = guides.find(g => g.id === id); if (!guide) return;
  const step = Math.max(0, Math.min(index ?? Number(records.progress[id] ?? 0), guide.steps.length - 1));
  const next = sanitizeState({ ...state, centerId: guide.steps[step].entityId, selectedId: guide.steps[step].entityId, relationId: null, fullId: null, sourceId: null, expandedIds: [], spatial: undefined });
  navigate(next, { resetLayout: true, guide: { id, index: step, free: false, snapshot: next } });
  hideDialog();
  writeRecords({ ...records, progress: { ...records.progress, [id]: step } }, false); renderGuide();
}
function renderGuide() {
  const host = $('#guide-bar'); host.classList.toggle('hidden', !guideSession); $('#exploration').classList.toggle('has-guide', !!guideSession);
  if (!guideSession) return;
  const guide = guides.find(g => g.id === guideSession!.id)!; const step = guide.steps[guideSession.index];
  host.innerHTML = `<span class="guide-progress">${guideSession.index + 1}<small>/${guide.steps.length}</small></span><div><span>${esc(guide.title)}${guideSession.free ? ' · 自由探索中' : ''}</span><strong>${esc(step.question)}</strong><p>${esc(step.description)}</p></div><div class="guide-controls">${guideSession.free ? '<button class="secondary-button" data-action="guide-return">返回导览</button>' : `<button class="icon-button" data-action="guide-prev" ${guideSession.index === 0 ? 'disabled' : ''} aria-label="上一步骤">${icon('back')}</button><button class="secondary-button" data-action="guide-next">${guideSession.index === guide.steps.length - 1 ? '完成导览' : '下一步'}${icon('arrow')}</button><button class="text-button" data-action="guide-free">自由探索</button>`}<button class="icon-button" data-action="guide-close" aria-label="退出导览">${icon('close')}</button></div>`;
}
function openLibrary() {
  showDialog('library', `<div class="library-intro"><span class="eyebrow">YOUR EXPLORATION</span><h2>让每次探索，都有迹可循</h2><p>仅保存在当前浏览器，无需登录。</p></div>${records.recent ? '<button class="resume-card" data-action="resume"><span>'+icon('clock')+'</span><div><strong>继续上次探索</strong><p>'+esc(entityName(records.recent.centerId))+' · '+records.recent.fromYear+'—'+records.recent.toYear+' 年</p></div>'+icon('arrow')+'</button>' : ''}<section class="library-section"><h3>收藏对象 <small>${records.bookmarks.length}</small></h3><div class="bookmark-grid">${records.bookmarks.map(id => `<button data-full="${esc(id)}">${icon('bookmark')}<strong>${esc(entityName(id))}</strong>${icon('chevron')}</button>`).join('') || '<p class="muted">遇见感兴趣的人物或事件，点击收藏留在这里。</p>'}</div></section><section class="library-section"><h3>已保存探索 <small>${records.saves.length}</small></h3>${records.saves.map(save => `<div class="saved-row"><button data-restore="${esc(save.id)}"><span>${icon('grid')}</span><span><strong>${esc(save.title)}</strong><small>${esc(new Date(save.date).toLocaleString('zh-CN'))}</small></span>${icon('arrow')}</button><button class="icon-button" data-delete-save="${esc(save.id)}" aria-label="删除${esc(save.title)}">${icon('close')}</button></div>`).join('') || '<p class="muted">在星图右上角保存视图，记住当时的时间与关系。</p>'}</section><div class="library-bottom"><button class="text-button" data-action="clear-recent">清除最近探索</button><button class="text-button danger" data-action="clear-all">清除全部本机记录</button></div>`, '我的探索');
}

function saveView() {
  getSpatial();
  const saved = cloneState(); saved.sourceId = null; saved.fullId = null;
  const signature = (view: ExploreState) => shareUrl(view, location.href) + [...view.expandedIds].sort().join(',');
  const existing = records.saves.find(save => signature(save.state) === signature(saved));
  if (existing) {
    const updated = { ...existing, state: saved, date: new Date().toISOString() };
    if (writeRecords({ ...records, saves: [updated, ...records.saves.filter(s => s.id !== existing.id)] })) toast('已更新相同探索的布局与镜头。');
    return;
  }
  if (records.saves.length >= 30) { toast('已保存30个视图，请先在“我的探索”中删除不需要的记录。'); return; }
  const item: SavedView = { id: crypto.randomUUID(), title: `${entityName(state.centerId)} · ${state.fromYear}—${state.toYear}`, date: new Date().toISOString(), state: saved };
  if (writeRecords({ ...records, saves: [item, ...records.saves] })) toast('探索视图已保存在当前浏览器。');
}
function bookmark(id: string) {
  const has = records.bookmarks.includes(id);
  if (writeRecords({ ...records, bookmarks: has ? records.bookmarks.filter(x => x !== id) : [...records.bookmarks, id] })) {
    toast(has ? '已取消收藏。' : `已收藏 ${entityName(id)}`, has ? () => { if (writeRecords({ ...records, bookmarks: [...new Set([...records.bookmarks, id])] })) { renderInspector(); toast('收藏已恢复。'); } } : undefined); renderInspector(); if (currentDialog === 'detail' && state.fullId) renderDetailDialog(state.fullId);
  }
}
function expandSelected() {
  const id = state.selectedId ?? state.centerId;
  const before = buildGraph(state); const candidate = { ...state, expandedIds: [...new Set([...state.expandedIds, id])] }; const after = buildGraph(candidate);
  if (after.nodes.length === before.nodes.length && after.relations.length === before.relations.length) { toast('当前条件下暂无更多已收录关联，可切换中心继续探索。'); return; }
  getSpatial(); undoExpansions.push(cloneState()); navigate({ expandedIds: candidate.expandedIds }, { replace: true, keepUndo: true });
  toast(`已展开 ${after.nodes.length - before.nodes.length} 个关联对象。`);
}
async function share() {
  const url = shareUrl(state, location.href);
  try { await navigator.clipboard.writeText(url); toast('公开探索链接已复制，不包含你的收藏与浏览记录。'); }
  catch { showDialog('share', `<div class="source-content"><h2>分享这片星云</h2><p>对方将按最新内容打开；展开布局和镜头可能不同。</p><input class="share-input" readonly aria-label="公开分享链接" value="${esc(url)}"/><button class="primary-button" data-action="select-share">选择链接</button></div>`, '分享公开探索'); }
}

document.addEventListener('click', event => {
  const target = (event.target as Element).closest<HTMLElement>('button, a[data-action]'); if (!target || (target as HTMLButtonElement).disabled) return;
  if (target.dataset.select) { selectEntity(target.dataset.select); return; }
  if (target.dataset.relation) { navigate({ fullId: null, sourceId: null, relationId: target.dataset.relation }); $('.workspace').classList.remove('inspector-collapsed'); $('#inspector').classList.add('mobile-open'); return; }
  if (target.dataset.source) { navigate({ sourceId: target.dataset.source }); return; }
  if (target.dataset.full) { navigate({ fullId: target.dataset.full, sourceId: null }, { anchor: target.dataset.actionAnchor }); return; }
  if (target.dataset.center) { if (currentDialog) hideDialog(); navigate({ centerId: target.dataset.center, selectedId: target.dataset.center, relationId: null, fullId: null, sourceId: null, expandedIds: [] }, { resetLayout: true }); return; }
  if (target.dataset.bookmark) { bookmark(target.dataset.bookmark); return; }
  if (target.dataset.guide) { startGuide(target.dataset.guide); return; }
  if (target.dataset.searchResult) { navigate({ fullId: target.dataset.searchResult, sourceId: null }); return; }
  if (target.dataset.year) { draftYears = [Number(target.dataset.year), Number(target.dataset.year)]; $<HTMLInputElement>('#year-from').value = target.dataset.year; $<HTMLInputElement>('#year-to').value = target.dataset.year; renderYearLabel(); return; }
  if (target.dataset.restore) { const saved = records.saves.find(s => s.id === target.dataset.restore); if (saved) { hideDialog(); restore(saved.state); toast('已恢复保存的探索视图。'); } return; }
  if (target.dataset.deleteSave) { const removed = records.saves.find(s => s.id === target.dataset.deleteSave); if (removed && writeRecords({ ...records, saves: records.saves.filter(s => s.id !== removed.id) })) { openLibrary(); toast('已删除保存的视图。', () => { if (writeRecords({ ...records, saves: [removed, ...records.saves] })) { openLibrary(); toast('保存的视图已恢复。'); } }); } return; }
  switch (target.dataset.action) {
    case 'undo-local': toastUndo?.(); break;
    case 'explore': if (currentDialog) hideDialog(); break;
    case 'search': openSearch(); break;
    case 'guides': openGuides(); break;
    case 'library': openLibrary(); break;
    case 'start-first-guide': if (guides[0]) startGuide(guides[0].id); break;
    case 'back': if (historyIndex > 0) history.back(); break;
    case 'view-3d': if (sceneFailed) { retryScene(); break; } navigate({ viewMode: 'graph3d' }, { replace: true }); ensureScene(); break;
    case 'retry-3d': retryScene(); break;
    case 'view-list': navigate({ viewMode: 'list' }, { replace: true }); break;
    case 'expand': expandSelected(); break;
    case 'save': saveView(); break;
    case 'share': void share(); break;
    case 'fit': scene?.fit(); break;
    case 'camera-reset': scene?.resetCamera(); break;
    case 'zoom-in': scene?.zoom(0.83); break;
    case 'zoom-out': scene?.zoom(1.2); break;
    case 'undo-expand': { const prev = undoExpansions.pop(); if (prev) { state = prev; history.replaceState(historyEntry(), '', shareUrl(state, location.href)); syncDrafts(); render(); persistRecent(); toast('已恢复展开前视图。'); } break; }
    case 'apply-time': if (draftYears[0] > draftYears[1]) { toast('起始年份不能晚于结束年份。'); break; } navigate({ fromYear: draftYears[0], toYear: draftYears[1], expandedIds: [] }); break;
    case 'apply-filters': navigate({ categories: [...draftCategories], showUndated: draftUndated, expandedIds: [] }); $('#sidebar').classList.remove('mobile-open'); break;
    case 'clear-filters': navigate({ fromYear: 184, toYear: 280, categories: [...DEFAULT_STATE.categories], showUndated: false, expandedIds: [] }); break;
    case 'relation-time': { const r = relationById(state.relationId!); if (r) { const relatedCategories = [...new Set([...state.categories, r.category])]; if (r.start === null || r.end === null) navigate({ showUndated: true, categories: relatedCategories }); else navigate({ fromYear: r.start, toYear: r.end, categories: relatedCategories, showUndated: state.showUndated || !!r.uncertain, expandedIds: [] }); } break; }
    case 'close-relation': navigate({ relationId: null }, { replace: true }); break;
    case 'inspector-close': $('#inspector').classList.remove('mobile-open'); if (!matchMedia('(max-width:1100px)').matches) $('.workspace').classList.add('inspector-collapsed'); break;
    case 'filters-open': $('#sidebar').classList.add('mobile-open'); break;
    case 'filters-close': $('#sidebar').classList.remove('mobile-open'); syncDrafts(); render(); break;
    case 'dialog-close': closeDialog(); break;
    case 'resume': if (records.recent) { const saved = structuredClone(records.recent); hideDialog(); restore(saved); } break;
    case 'clear-recent': if (writeRecords({ ...records, recent: null })) { openLibrary(); toast('已清除最近探索，收藏和保存的视图保留。'); } break;
    case 'clear-all': showDialog('confirm-clear', '<div class="source-content"><h2>清除全部本机记录？</h2><p>这将删除收藏、已保存探索、最近探索和导览进度。</p><div class="detail-actions"><button class="primary-button" data-action="confirm-clear">确认清除</button><button class="secondary-button" data-action="library">保留记录</button></div></div>', '清除本机记录'); break;
    case 'confirm-clear': if (writeRecords(emptyRecords())) { openLibrary(); renderInspector(); toast('本机记录已清除。'); } break;
    case 'guide-free': if (guideSession) { getSpatial(); guideSession.snapshot = cloneState(); guideSession.free = true; captureCurrentEntry(); renderGuide(); } break;
    case 'guide-return': if (guideSession) { const snapshot = structuredClone(guideSession.snapshot); restore(snapshot, true); guideSession.free = false; captureCurrentEntry(); renderGuide(); } break;
    case 'guide-prev': if (guideSession && guideSession.index > 0) startGuide(guideSession.id, guideSession.index - 1); break;
    case 'guide-next': if (guideSession) { const guide = guides.find(g => g.id === guideSession!.id)!; if (guideSession.index < guide.steps.length - 1) startGuide(guide.id, guideSession.index + 1); else { writeRecords({ ...records, progress: { ...records.progress, [guide.id]: guide.steps.length - 1 } }); guideSession = null; captureCurrentEntry(); renderGuide(); toast('已走完这段导览。试着复述：人物做了什么，关系有哪些依据？'); } } break;
    case 'guide-close': guideSession = null; captureCurrentEntry(); renderGuide(); break;
    case 'settings': showDialog('settings', `<div class="settings-content"><h2>让星云适合你的设备</h2><label>画质<select id="quality-select"><option value="low" ${currentQuality === 'low' ? 'selected' : ''}>轻量 · 少量粒子</option><option value="medium" ${currentQuality === 'medium' ? 'selected' : ''}>标准 · 推荐</option><option value="high" ${currentQuality === 'high' ? 'selected' : ''}>高 · 更多星点</option></select></label><label class="switch-row"><span>氛围流动<small>仅改变装饰，不移动人物节点</small></span><input id="motion-toggle" type="checkbox" ${motionEnabled ? 'checked' : ''} role="switch"/></label><label class="switch-row"><span>触屏旋转模式<small>关闭时单指平移，双指缩放</small></span><input id="rotate-toggle" type="checkbox" ${rotateMode ? 'checked' : ''} role="switch"/></label><button class="secondary-button" data-action="reset-graph">重置当前关系图</button><p class="fine-print">画质不会减少历史内容。系统“减少动态效果”优先于氛围开关。</p></div>`, '画质与交互'); break;
    case 'reset-graph': hideDialog(); navigate({ expandedIds: [], selectedId: state.centerId, relationId: null }, { resetLayout: true }); break;
    case 'select-share': $<HTMLInputElement>('.share-input').select(); break;
    case 'help': showDialog('help', `<div class="source-content"><span class="eyebrow">EXPLORER’S GUIDE</span><h2>在关联中，读懂历史</h2><div class="help-steps"><p><b>01</b><span><strong>点击，看见行动</strong>选择人物或事件，右侧阅读摘要与来源。</span></p><p><b>02</b><span><strong>展开，发现关联</strong>“展开关联”添加邻接对象，“以此为中心”开启新视角。</span></p><p><b>03</b><span><strong>沿时间，理解变化</strong>调整底部范围后点击应用，关系只在适用时间出现。</span></p><p><b>04</b><span><strong>转动，探索空间</strong>鼠标左键旋转、右键平移、滚轮缩放；手机默认单指平移。</span></p></div><div class="reading-note">空间远近与节点大小不代表历史重要程度。列表提供同样的阅读入口。</div></div>`, '探索说明'); break;
    case 'about-data': showDialog('about-data', `<div class="source-content"><h2>从可追溯的材料出发</h2><p>当前为项目首个可运行前端版本，使用 ${entities.length} 个本地实体与 ${relations.length} 条关系样本，内容版本 ${esc(CONTENT_VERSION)}。</p><p>样本围绕汉末三国编排，用于验证人物、事件、关系和出处的交互。史料链接提供核对入口，不代表已经完成逐条学术审校。</p><div class="reading-note">记载与历史解释分层展示。未收录关系不等于没有关系；正式发布仍需独立复核与内容后台。</div></div>`, '关于内容样本'); break;
  }
});

document.addEventListener('input', event => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'search-input') renderSearchResults(target.value);
  if (target.id === 'year-from' || target.id === 'year-to') { draftYears[target.id === 'year-from' ? 0 : 1] = Number(target.value); renderYearLabel(); }
});
document.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  if (target.closest('#relation-filters')) { draftCategories = [...document.querySelectorAll<HTMLInputElement>('#relation-filters input:checked')].map(input => input.value as RelationCategory); $('#filter-dirty').textContent = '待应用'; }
  if (target.id === 'undated-toggle') { draftUndated = target.checked; $('#filter-dirty').textContent = '待应用'; }
  if (target.id === 'quality-select') { currentQuality = target.value as typeof currentQuality; scene?.setQuality(currentQuality); toast('画质已更新，历史内容保持不变。'); saveDisplayPreferences(); }
  if (target.id === 'motion-toggle') { motionEnabled = target.checked; scene?.setMotion(motionEnabled); saveDisplayPreferences(); }
  if (target.id === 'rotate-toggle') { rotateMode = target.checked; scene?.setRotateMode(rotateMode); saveDisplayPreferences(); }
});
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); } });
$<HTMLDialogElement>('#dialog').addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
$<HTMLDialogElement>('#dialog').addEventListener('click', event => { if (event.target === $('#dialog')) { const rect = $('#dialog').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });
window.addEventListener('popstate', event => {
  if (event.state?.nebula) { state = sanitizeState(event.state.nebula); historyIndex = event.state.index ?? 0; }
  else { state = stateFromUrl(location.href) ?? structuredClone(DEFAULT_STATE); historyIndex = 0; }
  guideSession = event.state?.guide ?? null;
  actionAnchor = event.state?.actionAnchor ?? null;
  undoExpansions = []; hideDialog(); syncDrafts(); render();
  if (event.state?.overlay === 'search') openSearch(event.state.searchQuery ?? '');
  else if (event.state?.overlay === 'library') openLibrary();
  else if (event.state?.overlay === 'guides') openGuides();
  $('#dialog').scrollTop = event.state?.dialogScroll ?? 0;
  const inspectorScroll = document.querySelector('.inspector-scroll');
  if (inspectorScroll) inspectorScroll.scrollTop = event.state?.inspectorScroll ?? 0;
});

let scenePromise: Promise<void> | null = null;
function retryScene() {
  scene?.dispose(); scene = null; sceneFailed = false; scenePromise = null;
  $('#scene-host').replaceChildren(); currentQuality = 'low';
  navigate({ viewMode: 'graph3d' }, { replace: true });
}
async function ensureScene() {
  if (scene || sceneFailed || state.viewMode !== 'graph3d') return;
  if (scenePromise) return scenePromise;
  scenePromise = (async () => {
    try {
      const { createNebulaScene } = await import('./nebula/scene');
      scene = createNebulaScene($('#scene-host'), {
        onSelect: selectEntity, onRelation: openRelation,
        onError: message => { sceneFailed = true; state.viewMode = 'list'; toast(message); render(); },
        onReady: () => $('#scene-loading').classList.add('hidden'),
        onCameraChange: () => { if (scene && state.viewMode === 'graph3d') state.spatial = scene.getSnapshot(); },
      });
      scene.setQuality(currentQuality); scene.setMotion(motionEnabled); scene.setRotateMode(rotateMode); render();
    } catch (error) { console.error('Nebula initialization failed', error); sceneFailed = true; state.viewMode = 'list'; render(); toast('3D 初始化失败，已切换到关系列表。'); }
  })();
  return scenePromise;
}
window.addEventListener('pagehide', () => { getSpatial(); /* Explicit saves persist; avoid resurrecting cleared recent records here. */ });
history.replaceState(historyEntry(), '', location.href);
render(); void ensureScene();
if (new URL(location.href).search && !stateFromUrl(location.href)) toast('分享对象不存在或链接已失效，已打开默认专题。');
