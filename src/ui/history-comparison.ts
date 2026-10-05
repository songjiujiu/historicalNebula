import { journeyUrl, type JourneyEvent } from '../domain/history-journey';
import { comparisonFiltersFromUrl, comparisonPeriods, comparisonRows, comparisonUrl, defaultComparisonFilters, matchesComparisonQuery, worldEvents, worldRegions, type ComparisonFilters, type WorldEvent } from '../domain/world-history';
import './history-comparison.css';

const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function createHistoryComparison(host: HTMLElement, options: { onJourney: (id: string) => void }) {
  let filters: ComparisonFilters = { ...defaultComparisonFilters };
  function matchBadge(event: JourneyEvent | WorldEvent) {
    return filters.query && matchesComparisonQuery(event, filters.query) ? '<span class="comparison-match">搜索命中</span>' : '';
  }
  function chinaCard(event: JourneyEvent) {
    return `<article class="comparison-card" data-china-event="${event.id}"><div class="comparison-card-meta"><span>${esc(event.year)}</span>${matchBadge(event)}</div><h4>${esc(event.title)}</h4><p>${esc(event.summary)}</p><a href="${esc(journeyUrl(event.id, '', location.href, 'all'))}" data-compare-journey="${event.id}">读懂事件与出处 <span aria-hidden="true">↗</span></a></article>`;
  }
  function worldCard(event: WorldEvent) {
    return `<article class="comparison-card comparison-world-card" data-world-event="${event.id}"><div class="comparison-card-meta"><span>${esc(event.year)}</span>${matchBadge(event)}</div><span class="comparison-region">${event.region}</span><h4>${esc(event.title)}</h4><p>${esc(event.summary)}</p><details><summary>理解这个节点</summary><p>${esc(event.significance)}</p></details><a class="comparison-source" href="${esc(event.source.url)}" target="_blank" rel="noopener noreferrer">参考：${esc(event.source.title)} <span aria-hidden="true">↗</span></a></article>`;
  }
  function results() {
    const rows = comparisonRows(filters);
    host.querySelector<HTMLElement>('[data-compare-status]')!.textContent = `显示 ${rows.length} 个时间段 · ${rows.reduce((sum, row) => sum + row.china.length, 0)} 个中国事件 · ${rows.reduce((sum, row) => sum + row.world.length, 0)} 个世界事件`;
    host.querySelector<HTMLElement>('[data-compare-results]')!.innerHTML = rows.length ? rows.map(({ period, china, world }, index) => `
      <section class="comparison-period" aria-labelledby="compare-${period.id}">
        <header class="comparison-period-heading"><span class="comparison-period-index" aria-hidden="true">${String(comparisonPeriods.indexOf(period) + 1).padStart(2, '0')}</span><div><span class="comparison-years">${period.years}</span><h2 id="compare-${period.id}">${period.title}</h2></div><a href="${esc(comparisonUrl({ ...filters, period: period.id }))}" data-compare-period="${period.id}" aria-label="只看${period.title}">单独对照 ↗</a></header>
        <p class="comparison-question"><strong>对照着想</strong>${period.question}</p>
        <div class="comparison-columns"><section aria-labelledby="china-lane-${index}"><h3 id="china-lane-${index}"><span aria-hidden="true">●</span> 中国历史 <small>${china.length} 个节点</small></h3>${china.map(chinaCard).join('')}</section><section aria-labelledby="world-lane-${index}"><h3 id="world-lane-${index}"><span aria-hidden="true">●</span> 世界其他地区 <small>${world.length} 个节点</small></h3>${world.map(worldCard).join('')}</section></div>
      </section>`).join('') : '<div class="comparison-empty"><h2>没有找到匹配的对照</h2><p>试试其他事件、人物或地区，或者清除筛选查看全部时间段。</p><button type="button" data-compare-reset>清除筛选</button></div>';
  }
  function render() {
    host.innerHTML = `<main class="comparison-shell">
      <header class="comparison-hero"><p class="comparison-kicker">CHINA & THE WORLD · 同期历史</p><h1>把中国历史，<br>放进世界的时间里。</h1><p class="comparison-intro">读到秦汉，看看罗马；走到晚清，看看明治维新。沿同一段时间，理解不同地方的人们正在经历什么。</p><div class="comparison-stats"><span><b>${comparisonPeriods.length}</b> 个时间段</span><span><b>${comparisonPeriods.reduce((sum, period) => sum + period.chinaIds.length, 0)}</b> 个中国事件</span><span><b>${worldEvents.length}</b> 个世界事件</span></div></header>
      <div class="comparison-toolbar" role="search" aria-label="筛选中外历史"><label>时间范围<select data-compare-era><option value="">全部时间段</option>${comparisonPeriods.map(period => `<option value="${period.id}"${filters.period === period.id ? ' selected' : ''}>${period.title} · ${period.years}</option>`).join('')}</select></label><label>世界地区<select data-compare-region><option value="">全部地区</option>${worldRegions.map(region => `<option${filters.region === region ? ' selected' : ''}>${region}</option>`).join('')}</select></label><label class="comparison-search">搜索事件或人物<input data-compare-search type="search" maxlength="120" placeholder="试试：罗马、工业、刘邦" value="${esc(filters.query)}"></label><button type="button" data-compare-reset>重置</button><button type="button" data-compare-share>复制对照链接</button></div>
      <p class="comparison-help">按时间段并排阅读，卡片不作逐项配对。搜索命中后保留同期背景；地区筛选只作用于世界一侧。</p>
      <p class="comparison-status" data-compare-status role="status" aria-live="polite"></p><span class="comparison-share-status" data-compare-share-status role="status" aria-live="polite"></span><div data-compare-results></div>
      <aside class="comparison-note"><h2>怎样读这份对照</h2><p>中国历史是世界历史的一部分，右栏选取中国以外地区及全球共同事件。这是一份入门选读，不代表各地历史的全部，也不按事件多少判断文明的重要性。</p><p>时间段只用于阅读对齐，不是各地区共同的历史分期。跨段事件按起始时间归组，卡片保留完整年代；世纪级年代不代表精确到某年。中国侧复用已有主线，未把年代不确定的上古传说强行对齐。</p><p>同期发生不等于互有因果。“对照着想”是本站提出的阅读问题。世界卡片为综合概述，参考资料可逐条打开；中国卡片可进入已有事件解释与史料出处。收录范围截至2024年。</p></aside>
    </main>`;
    results();
  }
  function update(next: ComparisonFilters, replace = false) {
    const href = comparisonUrl(next);
    if (href !== location.href) {
      if (replace) history.replaceState({ compare: true }, '', href);
      else history.pushState({ compare: true }, '', href);
    }
    filters = comparisonFiltersFromUrl(href);
    if (replace) results(); else render();
  }
  host.addEventListener('input', event => {
    if (!(event.target instanceof HTMLInputElement) || !event.target.matches('[data-compare-search]')) return;
    update({ ...filters, query: event.target.value }, true);
  });
  host.addEventListener('change', event => {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const key = event.target.matches('[data-compare-era]') ? 'period' : event.target.matches('[data-compare-region]') ? 'region' : null;
    if (key) {
      const selector = key === 'period' ? '[data-compare-era]' : '[data-compare-region]';
      update({ ...filters, [key]: event.target.value });
      host.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    }
  });
  host.addEventListener('click', async event => {
    const target = (event.target as Element).closest<HTMLElement>('a,button');
    if (!target || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (target.dataset.compareJourney) { event.preventDefault(); options.onJourney(target.dataset.compareJourney); }
    else if (target.dataset.comparePeriod) {
      event.preventDefault(); update({ ...filters, period: target.dataset.comparePeriod });
      host.querySelector<HTMLElement>('[data-compare-era]')?.focus({ preventScroll: true });
      host.querySelector('.comparison-toolbar')?.scrollIntoView({ block: 'start' });
    } else if (target.hasAttribute('data-compare-reset')) {
      update({ ...defaultComparisonFilters }); host.querySelector<HTMLElement>('[data-compare-search]')?.focus({ preventScroll: true });
    } else if (target.hasAttribute('data-compare-share')) {
      const href = comparisonUrl(filters);
      const status = host.querySelector<HTMLElement>('[data-compare-share-status]')!;
      try { await navigator.clipboard.writeText(href); status.textContent = '对照链接已复制，包含当前时间段、地区与搜索条件。'; }
      catch {
        status.innerHTML = '<label>复制不可用，请选中链接手动复制：<input readonly aria-label="对照链接"></label>';
        const input = status.querySelector('input')!; input.value = href; input.focus(); input.select();
      }
    }
  });
  return { showFromUrl() { filters = comparisonFiltersFromUrl(location.href); render(); } };
}
