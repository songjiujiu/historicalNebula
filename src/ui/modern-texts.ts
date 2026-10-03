import { Converter } from 'opencc-js';
import { escapeHtml as esc } from './icons';
import { modernJourneyEras } from '../domain/modern-history';
import { journeyEvent, journeyUrl } from '../domain/history-journey';
import { journeyReference, journeyReferenceUrl } from '../domain/journey-references';
import { modernGuideUrl, modernGuideTextUrl, modernTextGuideEvent } from '../domain/modern-guide-location';
import { modernChapters, modernDocuments, modernChapter, modernDocument, qingEventSources, modernTextUrl, modernTextLocation, loadModernText, loadQingManifest, type TextBlock, type TextCollection, type QingChapter } from '../domain/modern-texts';
import './modern-texts.css';
import { readingAtmosphere } from './reading-atmosphere';
import './reader-gallery.css';

const simplify = Converter({ from: 'tw', to: 'cn' });
const names = { chapters: '白话历史正文', qingshigao: '清史稿原文', documents: '近现代文献原文' };
export function createModernTexts(host: HTMLElement, options: { onJourney: (id?: string) => void; onGuide?: (href: string) => void }) {
  let request = 0, active = false, route = modernTextLocation(location.href), qing: QingChapter[] = [], blocks: TextBlock[] = [];
  let simple = true, query = '', era = '', page = 0;
  try { simple = localStorage.getItem('historical-nebula:modern:simple') !== 'false'; } catch {}
  const display = (s: string) => simple ? simplify(s) : s;
  const link = (label: string, collection: TextCollection, id = '', from = '', block = '', extra = '') => `<a ${extra} data-text-nav href="${esc(from && modernTextGuideEvent(location.href) === from ? modernGuideTextUrl(collection, id, from, block) : modernTextUrl(collection, id, from, block))}">${esc(label)}</a>`;
  const guideLink = (event = '', label = '先看清至当代导读 →') => `<a data-text-guide href="${esc(modernGuideUrl('', event))}">${esc(label)}</a>`;
  const tabs = () => `<nav class="mt-tabs" aria-label="清到当代阅读类型">${(Object.keys(names) as TextCollection[]).map(key => link(names[key], key, '', '', '', `aria-current="${route.collection === key ? 'page' : 'false'}"`)).join('')}</nav>`;
  const intro = () => `<div class="mt-hero-copy"><span class="journey-overline">清朝 → 民国 → 当代 · 正文书房</span><h1 tabindex="-1">${route.collection === 'qingshigao' ? '翻开清史，<br>与原文相遇。' : route.collection === 'documents' ? '读时代留下的文字，<br>看历史如何发生。' : '把概要展开，<br>接着读。'}</h1><p>34 篇白话正文解释前因后果；《清史稿》与近现代文献可以在站内对照阅读。</p><div class="reader-hero-index"><span><b>${route.collection === 'qingshigao' ? '529' : route.collection === 'documents' ? modernDocuments.length : modernChapters.length}</b>${route.collection === 'qingshigao' ? '卷目录' : route.collection === 'documents' ? '份文献' : '篇白话正文'}</span><span><b>06</b>连续时代</span><span><b>段落</b>直达原文位置</span></div></div>${readingAtmosphere(route.collection === 'qingshigao' ? 'desk' : 'modern')}`;
  function catalog() {
    blocks = []; query = ''; era = ''; page = 0;
    host.innerHTML = `<main class="mt-shell"><header class="mt-hero mt-hero-${route.collection}">${intro()}${tabs()}</header><aside class="mt-guide-entry"><div><strong>第一次读这段历史？</strong><p>先看时代背景、人物与分段提示，再跳到想读的正文位置。</p></div>${guideLink()}</aside>${route.invalid ? '<p class="mt-note" role="status">没有找到这个正文编号，请从目录重新选择。</p>' : ''}<div class="mt-catalog-tools"><label>查找${route.collection === 'qingshigao' ? '卷名或卷号' : '篇名或小节标题'}<input type="search" data-text-search placeholder="${route.collection === 'qingshigao' ? '如：李鸿章、食货、411' : '如：民国、改革开放、香港'}" maxlength="100"></label>${route.collection === 'chapters' ? `<label>选择时代<select data-text-era><option value="">全部六个时代</option>${modernJourneyEras.map(e => `<option value="${e.id}">${e.title}</option>`).join('')}</select></label>` : ''}</div><p class="mt-note">${route.collection === 'chapters' ? '本站编写的白话历史正文，按事件连续阅读；不是史书逐句翻译。每篇附相关资料与可用原文。' : route.collection === 'qingshigao' ? '《清史稿》是1928年刊行的纪传体清史稿本，不属于二十四史。529 卷目录中 523 卷有转录正文，卷29星表部分缺录，卷30—35天文正文缺录。原书有时代立场与讹误，需结合其他材料核对。' : `本站收录 ${modernDocuments.length} 份文献正文，保留原有措辞，提供段落定位。这是文献选读，并非民国和当代全部史料。`}</p><div data-text-results></div></main>`;
    results();
  }
  function results() {
    const target = host.querySelector<HTMLElement>('[data-text-results]'); if (!target) return;
    const needle = simplify(query.trim()).toLowerCase();
    if (route.collection === 'chapters') {
      const items = modernChapters.filter(c => (!era || c.era === era) && (!needle || simplify([c.title, c.date, modernJourneyEras.find(e => e.id === c.era)?.title, ...c.outline.map(h => h.title)].join(' ')).toLowerCase().includes(needle)));
      target.innerHTML = `<p role="status">${items.length} 篇正文</p>${modernJourneyEras.filter(e => items.some(c => c.era === e.id)).map(e => `<section class="mt-era"><h2>${e.title}<small>${e.years}</small></h2><div class="mt-grid">${items.filter(c => c.era === e.id).map(c => `<article class="mt-card-wrap"><span class="mt-card-number" aria-hidden="true">${String(modernChapters.indexOf(c) + 1).padStart(2, '0')}</span><div class="mt-card-copy"><span class="mt-card-date">${esc(c.date)}</span>${link(c.title, 'chapters', c.id, c.id, 'p1', `class="mt-card"`)}<span class="mt-card-meta">${c.characters.toLocaleString()} 字 · 约 ${Math.max(2, Math.ceil(c.characters / 350))} 分钟</span></div></article>`).join('')}</div></section>`).join('')}${!items.length ? '<p>没有匹配篇目，请试试其他词。</p>' : ''}`;
    } else if (route.collection === 'documents') {
      const items = modernDocuments.filter(d => !needle || simplify(`${d.title} ${d.date} ${d.note}`).toLowerCase().includes(needle));
      target.innerHTML = `<p role="status">${items.length} 份文献</p><div class="mt-doc-list">${items.map(d => `<article>${link(d.title, 'documents', d.id, d.events[0], d.block)}<small>${d.date} · ${d.characters.toLocaleString()} 字 · 所选文件正文</small><p>${esc(d.note)}</p></article>`).join('')}</div>`;
    } else {
      const items = qing.filter(c => !needle || simplify(`${c.volume} ${c.title} ${c.category}`).toLowerCase().includes(needle));
      const pages = Math.ceil(items.length / 40); page = Math.max(0, Math.min(page, pages - 1));
      target.innerHTML = `<p role="status">${items.length} 个卷次 · 卷29星表部分缺录，卷30—35正文缺录</p><div class="mt-volume-grid">${items.slice(page * 40, page * 40 + 40).map(c => link(`卷 ${c.volume} · ${c.title}${c.coverage === 'missing' ? '（正文缺录）' : c.warning ? '（部分缺录）' : ''}`, 'qingshigao', c.id, '', '', `class="mt-volume"`)).join('')}</div><div class="mt-paging"><button data-text-page="-1" ${page <= 0 ? 'disabled' : ''}>← 上一页</button><span>${items.length ? page + 1 : 0} / ${pages}</span><button data-text-page="1" ${page >= pages - 1 ? 'disabled' : ''}>下一页 →</button></div>`;
    }
  }
  function related(eventId: string) {
    const sources = qingEventSources.filter(s => s.event === eventId);
    const docs = modernDocuments.filter(d => d.events.includes(eventId));
    return `<section class="mt-related"><h2>对照史料原文</h2>${sources.map(s => `<div>${link(`《清史稿》卷 ${s.volume} · ${s.label}`, 'qingshigao', String(s.volume), eventId, s.block)}<small>直接定位 ${s.block}</small></div>`).join('')}${docs.map(d => `<div>${link(d.title, 'documents', d.id, eventId, d.block)}<small>${esc(d.note)}</small></div>`).join('')}${!sources.length && !docs.length ? '<p>本篇的相关资料见下方来源；当前未选入对应的站内文献原文。</p>' : ''}</section>`;
  }
  function references(eventId: string) {
    const refs = journeyEvent(eventId)?.references ?? [];
    return `<section class="mt-references"><h2>本篇参考资料</h2><p>以下材料用于核对相关事实和查看不同视角；本站白话正文为综合编写。</p>${refs.map(id => journeyReference(id)).filter(r => !!r).map(r => `<a href="${esc(journeyReferenceUrl(r))}" target="_blank" rel="noopener noreferrer">${esc(r.title)} ↗<small>${esc(r.publisher)}</small></a>`).join('')}</section>`;
  }
  function renderBody() {
    const body = host.querySelector('[data-text-body]'); if (!body) return;
    body.innerHTML = blocks.map(b => `<section id="mt-${b.id}" class="mt-block${b.id === route.block ? ' mt-highlight' : ''}" data-text-block="${b.id}" tabindex="-1"><a class="mt-paragraph" data-text-anchor="${b.id}" href="#${b.id}" aria-label="定位段落 ${b.id}">${b.id}</a><div>${display(b.html)}</div></section>`).join('');
  }
  function locate(block: string, update = true) {
    const target = host.querySelector<HTMLElement>(`[data-text-block="${block}"]`); if (!target) return;
    route.block = block;
    if (update) { const url = new URL(location.href); url.hash = block; history.replaceState(history.state, '', url); }
    host.querySelectorAll('.mt-highlight').forEach(el => el.classList.remove('mt-highlight'));
    target.classList.add('mt-highlight'); target.scrollIntoView({ block: 'start' }); target.focus({ preventScroll: true });
  }
  function reader() {
    const article = modernChapter(route.id), doc = modernDocument(route.id), volume = qing.find(c => c.id === route.id);
    const authored = route.collection === 'chapters';
    const meta = authored ? article! : route.collection === 'documents' ? doc! : volume!;
    const title = route.collection === 'qingshigao' ? `《清史稿》卷 ${volume!.volume} · ${meta.title}` : meta.title;
    const eventId = authored ? route.id : route.from;
    const guideEvent = modernTextGuideEvent(location.href);
    const items = route.collection === 'chapters' ? modernChapters : route.collection === 'documents' ? modernDocuments : qing;
    const index = items.findIndex(c => c.id === route.id), prev = items[index - 1], next = items[index + 1];
    const headings = blocks.filter(b => b.kind === 'heading');
    const source = route.collection === 'documents' ? doc!.sourceUrl : volume?.sourceUrl;
    const warning = route.collection === 'qingshigao' ? volume?.warning : '';
    host.innerHTML = `<main class="mt-shell mt-reading"><div class="mt-reading-top">${link('← 返回正文目录', route.collection)}${eventId ? `<a data-text-journey="${eventId}" href="${esc(journeyUrl(eventId))}">返回事件导读 →</a>` : ''}</div>${tabs()}<header class="mt-heading"><span class="journey-overline">${names[route.collection]} · ${authored ? article!.date : route.collection === 'documents' ? doc!.date : '1928年刊行 · 维基文库转录'}</span><h1 tabindex="-1">${esc(title)}</h1><p>${authored ? '本站编写 · 连续阅读正文' : '史料原文 · 保留文献原有措辞'} · ${meta.characters.toLocaleString()} 字</p></header><div class="mt-reader-layout"><aside class="mt-reader-aside">${readingAtmosphere('desk', true)}<span class="reader-index-kicker">READING INDEX</span><strong>本篇阅读</strong><nav aria-label="正文小节">${headings.map(b => `<a data-text-anchor="${b.id}" href="#${b.id}">${esc(display(b.text))}</a>`).join('') || '<p>按原文段落顺序阅读</p>'}</nav><label>查找本篇文字<input data-text-find type="search" placeholder="输入关键词" maxlength="100"></label><div class="mt-find-results" data-text-matches role="status"></div>${!authored ? `<label class="mt-script"><input type="checkbox" data-text-simple ${simple ? 'checked' : ''}> 显示简体字形</label>` : ''}<button data-text-action="top">回到篇首 ↑</button></aside><article class="mt-reading-main"><p class="mt-note">${authored ? '这篇正文展开讲述事件及前后联系，不是史料的逐句翻译。引用依据与原文入口见篇末。' : route.collection === 'documents' ? esc(doc!.note) : '《清史稿》为史稿，原书的褒贬、称谓和个别记载带有编纂者立场；本页保留原文供对照，不能单独当作事件的全部解释。'}</p>${warning ? `<p class="mt-warning" role="status">${esc(warning)}</p>` : ''}<p data-text-location-note role="status"></p><div data-text-body></div>${authored ? related(route.id) + references(route.id) : `<section class="mt-provenance"><h2>来源与整理说明</h2><p>${esc(route.collection === 'documents' ? doc!.license : '维基文库及贡献者转录，依 EPUB 元数据采用 CC BY-SA 3.0。原作属公有领域。')}</p><p>整理日期：2026年9月29日。移除网页导航，重新排版并添加段号；简体显示仅转换字形，未改写正文。${route.collection === 'documents' && doc!.id === 'covid-policy' ? '本文件由官方公告逐段录入。' : '转录仍需结合影印本审校。'}</p><a href="${esc(source!)}" target="_blank" rel="noopener noreferrer">查看来源及贡献者 ↗</a>${doc?.id !== 'covid-policy' ? '<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0 许可 ↗</a>' : ''}${eventId ? link('返回对应的白话正文 →', 'chapters', eventId, eventId) : ''}</section>`}<nav class="mt-neighbors" aria-label="前后正文">${prev ? link(`← 上一篇 · ${prev.title}`, route.collection, prev.id) : '<span>已到第一篇</span>'}${next ? link(`下一篇 · ${next.title} →`, route.collection, next.id) : '<span>已到最后一篇</span>'}</nav></article></div></main>`;
    const toolbar = host.querySelector('.mt-reading-top');
    if (guideEvent) toolbar?.insertAdjacentHTML('beforeend', guideLink(guideEvent, '← 返回清至当代导读'));
    else toolbar?.insertAdjacentHTML('beforeend', guideLink());
    renderBody();
    if (route.block && !blocks.some(b => b.id === route.block)) host.querySelector('[data-text-location-note]')!.textContent = '未找到指定段落，已显示本篇正文。';
    if (route.block && !warning) locate(route.block, false);
    else { host.scrollIntoView({ block: 'start' }); host.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); }
  }
  async function showFromUrl() {
    active = true; route = modernTextLocation(location.href); const ticket = ++request;
    host.innerHTML = '<main class="mt-shell"><p role="status">正在打开正文…</p></main>';
    try {
      if (route.collection === 'qingshigao' && !qing.length) qing = (await loadQingManifest()).chapters;
      if (ticket !== request || !active) return;
      if (!route.id) { catalog(); return; }
      const content = await loadModernText(route.collection, route.id);
      if (ticket !== request || !active) return;
      blocks = content.blocks; reader();
    } catch {
      if (ticket !== request || !active) return;
      host.innerHTML = `<main class="mt-shell"><h1>正文暂时无法打开</h1><p>请检查网络后重试，或返回目录选择其他篇目。</p><button data-text-action="retry">重新加载</button>${link('返回目录', route.collection)}</main>`;
    }
  }
  host.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('a,button'); if (!target) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (target.hasAttribute('data-text-nav')) { event.preventDefault(); history.pushState({ texts: true }, '', (target as HTMLAnchorElement).href); void showFromUrl(); }
    if (target.dataset.textJourney) { event.preventDefault(); options.onJourney(target.dataset.textJourney); }
    if (target.hasAttribute('data-text-guide') && options.onGuide) { event.preventDefault(); options.onGuide((target as HTMLAnchorElement).href); }
    if (target.dataset.textAnchor) { event.preventDefault(); locate(target.dataset.textAnchor); }
    if (target.dataset.textPage) { page += Number(target.dataset.textPage); results(); host.querySelector('.mt-catalog-tools')?.scrollIntoView({ block: 'start' }); }
    if (target.dataset.textAction === 'retry') void showFromUrl();
    if (target.dataset.textAction === 'top') host.querySelector('h1')?.scrollIntoView({ block: 'start' });
  });
  host.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (input.hasAttribute('data-text-search')) { query = input.value; page = 0; results(); }
    if (input.hasAttribute('data-text-find')) {
      const needle = simplify(input.value.trim()).toLowerCase();
      const hits = needle ? blocks.filter(b => simplify(b.text).toLowerCase().includes(needle)) : [];
      host.querySelector('[data-text-matches]')!.innerHTML = needle ? `<p>${hits.length} 段匹配${hits.length > 50 ? '，显示前50段' : ''}</p>${hits.slice(0,50).map(b => `<a href="#${b.id}" data-text-anchor="${b.id}">${b.id} · ${esc(display(b.text).slice(0,45))}…</a>`).join('')}` : '';
    }
  });
  host.addEventListener('change', event => {
    const input = event.target as HTMLInputElement;
    if (input.hasAttribute('data-text-era')) { era = input.value; results(); }
    if (input.hasAttribute('data-text-simple')) { simple = input.checked; try { localStorage.setItem('historical-nebula:modern:simple', String(simple)); } catch {} renderBody(); }
  });
  return { showFromUrl, locateFromUrl: () => { if (active) { const block = modernTextLocation(location.href).block; if (block) locate(block, false); } }, hide: () => { active = false; ++request; } };
}
