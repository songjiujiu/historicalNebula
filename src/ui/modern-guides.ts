import { Converter } from 'opencc-js';
import { escapeHtml as esc } from './icons';
import { readingAtmosphere } from './reading-atmosphere';
import { modernEraGuides, modernEventGuides, modernEventGuide } from '../domain/modern-guides';
import { modernGuideLocation, modernGuideUrl, modernGuideTextUrl } from '../domain/modern-guide-location';
import { modernDocuments, qingEventSources } from '../domain/modern-texts';
import { journeyReference, journeyReferenceUrl } from '../domain/journey-references';
import './modern-guides.css';
import './guide-gallery.css';

const simplify = Converter({ from: 'tw', to: 'cn' });
const progressKey = 'historical-nebula:modern-guides:v1';
export function createModernGuides(host: HTMLElement, options: { onText: (href: string) => void }) {
  let route = modernGuideLocation(location.href), query = '', eraFilter = '', recent = '';
  let completed = new Set<string>();
  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) ?? '{}');
      completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter((id: unknown) => typeof id === 'string' && modernEventGuide(id)) : []);
      recent = typeof saved.recent === 'string' && modernEventGuide(saved.recent) ? saved.recent : '';
    } catch { completed = new Set(); recent = ''; }
  }
  function saveProgress() {
    try { localStorage.setItem(progressKey, JSON.stringify({ completed: [...completed], recent })); } catch {}
  }
  const guideLink = (label: string, era = '', step = '', extra = '') => `<a data-mg-link ${extra} href="${esc(modernGuideUrl(era, step))}">${esc(label)}</a>`;
  const textLink = (label: string, event: string, block = '', extra = '') => `<a data-mg-text ${extra} href="${esc(modernGuideTextUrl('chapters', event, event, block))}">${esc(label)}</a>`;
  const meter = () => `<span data-mg-progress role="status">已读懂 ${completed.size} / ${modernEventGuides.length} 篇 · 仅保存在本机</span>`;
  function overview() {
    query = ''; eraFilter = '';
    const last = modernEventGuide(recent);
    host.innerHTML = `<main class="mg-shell guide-gallery"><header class="mg-hero guide-gallery-hero"><div class="guide-hero-copy"><span class="mg-overline">清至当代 · 正文导读</span><h1>从王朝走到今天，<br>先把前因后果读明白。</h1><p class="guide-hero-lead">接着《明史》往下走，看制度与生活怎样改变。<br>六个时代、34 篇正文，从清朝一路读到当代。</p><ol class="guide-reading-method" aria-label="每篇正文的阅读顺序"><li><span>01</span>当时局面</li><li><span>02</span>关键人物</li><li><span>03</span>分段阅读</li><li><span>04</span>记住什么</li></ol><div class="mg-actions">${guideLink('从清朝前期开始 →', 'qing', '', 'class="mg-primary"')}${last ? guideLink(`继续上次 · ${last.chapter.title}`, last.era, last.id) : ''}</div><div class="mg-progress-line">${meter()}</div></div><div class="guide-model-exhibit">${readingAtmosphere('modern')}<p class="guide-exhibit-label"><span>从古籍到档案</span><small>读懂历史，也对照当时留下的文字</small></p></div></header>${route.invalid ? '<p class="mg-note" role="status">没有找到指定导读，请从下面的路线重新选择。</p>' : ''}<section class="mg-route" aria-labelledby="mg-route-title"><div class="mg-section-heading"><span>01 / 建立时间线</span><h2 id="mg-route-title">六个时代，连着读</h2><p>这是阅读分段，部分事件同时发生；清朝不是到1840年就结束。</p></div><div class="mg-era-grid">${modernEraGuides.map((era, index) => `<article><span class="mg-era-number">0${index + 1}</span><small>${esc(era.years)}</small><h3>${guideLink(era.title, era.id)}</h3><p>${esc(era.question)}</p><span>${modernEventGuides.filter(g => g.era === era.id).length} 篇导读</span></article>`).join('')}</div></section><section class="mg-catalog" aria-labelledby="mg-catalog-title"><div class="mg-section-heading"><span>02 / 带着问题读正文</span><h2 id="mg-catalog-title">也可以从一个问题开始</h2><p>先看白话导读，再进入对应小节；有站内史料的篇目，还能对照原文。</p></div><div class="mg-tools"><label>找事件、人物或问题<input data-mg-search type="search" placeholder="如：香港、共和、工业、疫情" maxlength="100"></label><label>选择时代<select data-mg-filter><option value="">全部六个时代</option>${modernEraGuides.map(e => `<option value="${e.id}">${e.title}</option>`).join('')}</select></label></div><div data-mg-results></div></section><p class="mg-note">导读与白话正文为本站编写，不是史料逐句翻译。《清史稿》与近现代文献另列原文和来源；本路线为入门选读，当代节点选至2024年。</p></main>`;
    results();
  }
  function results() {
    const needle = simplify(query.trim()).toLowerCase();
    const items = modernEventGuides.filter(g => (!eraFilter || eraFilter === g.era) && (!needle || simplify([g.title, g.question, g.year, ...g.people, ...g.sections.map(s => `${s.title} ${s.pointer}`)].join(' ')).toLowerCase().includes(needle)));
    host.querySelector('[data-mg-results]')!.innerHTML = `<p class="mg-result-count" role="status">${items.length} 篇导读</p><div class="mg-question-list">${items.map(g => `<article><small>${esc(g.year)}${completed.has(g.id) ? ' · 已读懂' : ''}</small><h3>${guideLink(g.question, g.era, g.id)}</h3><p>${esc(g.chapter.title)}</p></article>`).join('')}</div>${!items.length ? '<p>没有匹配的导读，试试更短的关键词或切换到全部时代。</p>' : ''}`;
  }
  function sources(id: string) {
    const qing = qingEventSources.filter(s => s.event === id), docs = modernDocuments.filter(d => d.events.includes(id));
    const event = modernEventGuide(id)!;
    return `<section class="mg-sources"><h3>有了背景，再对照史料</h3>${qing.map(s => `<article><a data-mg-text href="${esc(modernGuideTextUrl('qingshigao', String(s.volume), id, s.block))}">《清史稿》卷 ${s.volume} · ${esc(s.label)} ↗</a><p>定位线索：${esc(s.cue)}</p></article>`).join('')}${docs.map(d => `<article><a data-mg-text href="${esc(modernGuideTextUrl('documents', d.id, id, d.block))}">${esc(d.title)} ↗</a><p>${esc(d.note)}</p></article>`).join('')}${qing.length || docs.length ? '<p class="mg-source-note">点击直接到相关段落。史料保留当时措辞和作者立场，单份文件不代表事件的全部经过。</p>' : '<p class="mg-source-note">本篇已有站内白话正文，尚未选入对应的站内文献原文，可通过下面的资料进一步核对。</p>'}<details><summary>本篇参考资料与来源</summary>${(event.references ?? []).map(journeyReference).filter(r => !!r).map(r => `<a href="${esc(journeyReferenceUrl(r))}" target="_blank" rel="noopener noreferrer">${esc(r.title)} · ${esc(r.publisher)} ↗</a>`).join('')}</details></section>`;
  }
  function lesson() {
    const event = modernEventGuide(route.step)!;
    const index = modernEventGuides.indexOf(event), previous = modernEventGuides[index - 1], next = modernEventGuides[index + 1];
    return `<article class="mg-lesson" data-mg-lesson tabindex="-1"><header><span class="mg-overline">正文导读 ${String(index + 1).padStart(2, '0')} / 34 · ${esc(event.year)}</span><h2>${esc(event.question)}</h2><p class="mg-article-name">对应正文：${esc(event.chapter.title)}</p><p>${esc(event.summary)}</p></header><div class="mg-background"><div><span>先知道当时的局面</span><p>${esc(event.before)}</p></div><div><span>谁在其中</span><ul>${event.people.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div></div><section class="mg-sections"><h3>带着这三个提示，分段读</h3><ol>${event.sections.map((section, i) => `<li><span class="mg-step-number">0${i + 1}</span><div><h4>${esc(section.title)}</h4><p>${esc(section.pointer)}</p>${textLink('读这一节 →', event.id, section.id, `data-mg-section="${section.id}"`)}</div></li>`).join('')}</ol></section><aside class="mg-takeaway"><span>读完记住这一句</span><p>${esc(event.remember)}</p><small>接下来有什么变化：${esc(event.after)}</small></aside>${event.caution ? `<p class="mg-note">容易混淆的地方：${esc(event.caution)}</p>` : ''}<div class="mg-actions">${textLink('打开完整白话正文 →', event.id, '', 'class="mg-primary"')}<button data-mg-complete aria-pressed="${completed.has(event.id)}">${completed.has(event.id) ? '已读懂 · 点击取消标记' : '标记这篇已读懂'}</button></div>${sources(event.id)}<nav class="mg-neighbors" aria-label="前后导读">${previous ? guideLink(`← 上一篇 · ${previous.chapter.title}`, previous.era, previous.id, 'data-mg-neighbor') : guideLink('← 导读总览')}${next ? guideLink(`下一篇 · ${next.chapter.title} →`, next.era, next.id, 'data-mg-neighbor') : guideLink('已到本路线最后一篇 · 回看全部导读 →')}</nav></article>`;
  }
  function detail() {
    const era = modernEraGuides.find(e => e.id === route.era)!;
    const items = modernEventGuides.filter(g => g.era === era.id);
    host.innerHTML = `<main class="mg-shell mg-reading guide-gallery"><div class="mg-top">${guideLink('← 清至当代导读总览')}${meter()}</div>${route.invalid ? '<p class="mg-note" role="status">该篇与指定时代不匹配，已打开本时代第一篇。</p>' : ''}<div class="mg-layout"><aside class="mg-sidebar guide-modern-exhibit">${readingAtmosphere('modern', true)}<span class="mg-overline">按时代读</span><nav class="mg-era-nav" aria-label="导读时代">${modernEraGuides.map((e, i) => guideLink(`0${i + 1} ${e.title}`, e.id, '', `aria-current="${e.id === era.id ? 'true' : 'false'}"`)).join('')}</nav><label class="mg-mobile-era">切换时代<select data-mg-era>${modernEraGuides.map(e => `<option value="${e.id}" ${e.id === era.id ? 'selected' : ''}>${e.title}</option>`).join('')}</select></label><div class="mg-section-heading"><span>本时代 ${items.length} 篇</span></div><nav class="mg-step-nav" aria-label="本时代导读">${items.map(g => guideLink(`${completed.has(g.id) ? '✓ ' : ''}${g.chapter.title}`, g.era, g.id, `data-mg-step="${g.id}" aria-current="${g.id === route.step ? 'step' : 'false'}"`)).join('')}</nav></aside><div class="mg-main"><header class="mg-era-intro"><span class="mg-overline">${esc(era.years)}</span><h1>${esc(era.title)}</h1><p>${esc(era.gist)}</p><div class="mg-connection"><span>怎样接上前面的历史</span><p>${esc(era.connection)}</p></div><details><summary>这一段怎么读？先认清几个词</summary><p>${esc(era.approach)}</p><dl>${era.terms.map(([term, definition]) => `<div><dt>${esc(term)}</dt><dd>${esc(definition)}</dd></div>`).join('')}</dl><p><strong>本时代要记住：</strong>${esc(era.takeaway)}</p><p>${esc(era.note)}</p></details></header><div data-mg-content>${lesson()}</div></div></div></main>`;
  }
  function showFromUrl() {
    route = modernGuideLocation(location.href); readProgress();
    if (!route.era) { overview(); return; }
    recent = route.step; saveProgress(); detail(); revealStep();
  }
  function revealStep() {
    const nav = host.querySelector<HTMLElement>('.mg-step-nav'), selected = nav?.querySelector<HTMLElement>('[aria-current=step]');
    if (!nav || !selected) return;
    const viewport = nav.getBoundingClientRect(), item = selected.getBoundingClientRect();
    if (item.right > viewport.right) nav.scrollLeft += item.right - viewport.right + 4;
    else if (item.left < viewport.left) nav.scrollLeft += item.left - viewport.left - 4;
  }
  function navigate(href: string, focusLesson = false) {
    const before = route, next = modernGuideLocation(href);
    history.pushState({ modernGuide: true }, '', href);
    if (next.era && next.era === before.era) {
      route = next; recent = route.step; saveProgress();
      host.querySelector('[data-mg-content]')!.innerHTML = lesson();
      host.querySelectorAll<HTMLElement>('[data-mg-step]').forEach(a => a.setAttribute('aria-current', a.dataset.mgStep === route.step ? 'step' : 'false'));
      revealStep();
      // Keep the era and step controls in place while replacing only the explanation.
    } else showFromUrl();
    if (focusLesson) {
      const target = host.querySelector<HTMLElement>('[data-mg-lesson]');
      target?.scrollIntoView({ block: 'start' }); target?.focus({ preventScroll: true });
    } else if (next.era !== before.era) host.querySelector('h1')?.scrollIntoView({ block: 'start' });
  }
  host.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const target = (event.target as Element).closest<HTMLElement>('a,button'); if (!target) return;
    if (target.hasAttribute('data-mg-link')) { event.preventDefault(); navigate((target as HTMLAnchorElement).href, target.hasAttribute('data-mg-neighbor')); }
    if (target.hasAttribute('data-mg-text')) { event.preventDefault(); options.onText((target as HTMLAnchorElement).href); }
    if (target.hasAttribute('data-mg-complete')) {
      if (completed.has(route.step)) completed.delete(route.step); else completed.add(route.step);
      saveProgress(); target.setAttribute('aria-pressed', String(completed.has(route.step))); target.textContent = completed.has(route.step) ? '已读懂 · 点击取消标记' : '标记这篇已读懂';
      host.querySelector('[data-mg-progress]')!.textContent = `已读懂 ${completed.size} / ${modernEventGuides.length} 篇 · 仅保存在本机`;
      const selected = host.querySelector(`[data-mg-step="${route.step}"]`);
      if (selected) selected.textContent = `${completed.has(route.step) ? '✓ ' : ''}${modernEventGuide(route.step)!.chapter.title}`;
    }
  });
  host.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (input.hasAttribute('data-mg-search')) { query = input.value; results(); }
  });
  host.addEventListener('change', event => {
    const select = event.target as HTMLSelectElement;
    if (select.hasAttribute('data-mg-filter')) { eraFilter = select.value; results(); }
    if (select.hasAttribute('data-mg-era')) navigate(modernGuideUrl(select.value));
  });
  return { showFromUrl, hide: () => {} };
}
