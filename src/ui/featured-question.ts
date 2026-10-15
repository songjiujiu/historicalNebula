import { escapeHtml as esc } from './icons';
import { historyBookNames, journeyEvent, journeySourceUrl } from '../domain/history-journey';
import './featured-question.css';
import { readingAtmosphere } from './reading-atmosphere';

export const featuredQuestionId = 'western-jin';

const steps = [
  {
    eventId: 'jin-unifies', year: '280', label: '短暂统一', title: '三国结束了，问题并没有结束',
    lead: '魏先灭蜀，司马炎建立晋；晋军再灭吴，南北主要地区重新归于一个王朝。',
    insight: '统一说的是政权版图。它并不保证皇族、军队和地方从此没有冲突。',
    north: '西晋', south: '西晋',
  },
  {
    eventId: 'eastern-jin', year: '316—318', label: '转折发生', title: '内乱之后，北方失守',
    lead: '西晋皇族内战后，北方战事扩大，洛阳、长安先后失守。316 年西晋末帝出降；晋室在南方重新建立朝廷。',
    insight: '“西晋结束”不等于“晋朝在同一年从所有地方消失”。南方还有东晋，北方则出现多个政权。',
    north: '多个政权', south: '东晋',
  },
  {
    eventId: 'liu-song', year: '420', label: '局面延续', title: '南方又换朝，南北仍未合一',
    lead: '刘裕取代东晋，在南方建立宋，史家常称刘宋。北方并没有随着南方一起改朝。',
    insight: '从这里再往后读，南方是宋、齐、梁、陈；北方另有自己的政权演变。直到隋灭陈，主要地区才重新统一。',
    north: '多个政权', south: '刘宋',
  },
] as const;

export const featuredQuestionStepCount = steps.length;

export function featuredQuestionUrl(step = 0, base = location.href) {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('question', featuredQuestionId);
  if (step > 0) url.searchParams.set('step', String(step + 1));
  return url.href;
}

export function featuredQuestionStep(params: URLSearchParams) {
  const requested = Number(params.get('step') ?? 1);
  return Number.isInteger(requested) && requested >= 1 && requested <= steps.length ? requested - 1 : 0;
}

export function renderFeaturedQuestion(stepIndex: number) {
  const step = steps[stepIndex] ?? steps[0];
  const event = journeyEvent(step.eventId)!;
  const source = event.sources[0];
  return `<main class="journey-shell question-shell">
    <div class="question-topline"><button data-journey-action="home">← 返回历史主线</button><span>一个问题，看懂一段历史 · 约 3 分钟</span></div>
    <header class="question-heading"><span class="journey-overline">本期问题 · 三国与两晋</span><h1 tabindex="-1">西晋明明统一了，<br><em>为什么又分裂？</em></h1><p>跟着三个转折看局势怎样变化。点亮时间节点，再看史书究竟写了什么。</p>${readingAtmosphere('archive', true)}</header>
    <div class="question-workspace">
      <nav class="question-steps" aria-label="三个历史转折">${steps.map((item, index) => `<button data-question-step="${index}" aria-current="${index === stepIndex ? 'step' : 'false'}"><small>${item.year} · 0${index + 1}</small><strong>${esc(item.label)}</strong><span>${esc(item.title)}</span></button>`).join('')}</nav>
      <div class="question-content"><section class="question-map" aria-label="西晋至南北分立的政权变化"><div class="question-map-heading"><div><span class="journey-overline">同时看北方与南方</span><h2>同一时间，两边分别是谁？</h2></div><small>点上方时间节点切换</small></div><div class="question-map-grid"><div class="question-map-corner">地区 / 年代</div>${steps.map((item, index) => `<span class="question-map-year ${index === stepIndex ? 'active' : ''}">${item.year}</span>`).join('')}<b class="question-map-axis">北方</b>${steps.map((item, index) => `<span class="question-map-cell north ${index === stepIndex ? 'active' : ''}">${esc(item.north)}</span>`).join('')}<b class="question-map-axis">南方</b>${steps.map((item, index) => `<span class="question-map-cell south ${index === stepIndex ? 'active' : ''}">${esc(item.south)}</span>`).join('')}</div><p>${stepIndex === 0 ? '280 年南北同属西晋；这是后面分裂前的起点。' : '上下两行代表同一年代并存的局势，不是前后接班的朝代。'}</p></section>
      <article class="question-scene"><span class="question-scene-count">0${stepIndex + 1} / 0${steps.length} · ${esc(step.year)}</span><h2>${esc(step.title)}</h2><p>${esc(step.lead)}</p><div class="question-insight"><span>这一站要想明白</span><strong>${esc(step.insight)}</strong></div><div class="question-actions"><button class="primary-button" data-question-step="${Math.min(stepIndex + 1, steps.length - 1)}" ${stepIndex === steps.length - 1 ? 'disabled' : ''}>${stepIndex === steps.length - 1 ? '三个转折已读完 ✓' : '继续看下一步 →'}</button><button class="secondary-button" data-journey-event="${event.id}">展开这件事 →</button></div></article>
      <section class="question-evidence"><span class="journey-overline">从导读回到史书</span><h2>这一站的原文位置</h2><p>上面的解释是本站导读。点击摘句可到原文段落核对；一段摘句不能单独证明整个历史过程。</p><a href="${esc(journeySourceUrl(event, source, location.href))}" data-question-source="${event.id}"><span>《${esc(historyBookNames[source.book])}》卷 ${source.volume} · ${esc(source.label)}</span><q>${esc(source.cue)}</q><b>打开原文段落 ↗</b></a></section></div>
    </div>
    <section class="question-recap" aria-label="读完记住三件事"><span class="journey-overline">读完以后，记住三件事</span><h2>把这段历史串起来</h2><div><article><b>01 · 起点</b><p>280 年，晋灭吴，三国结束，西晋统一。</p></article><article><b>02 · 转折</b><p>皇族内战与北方战事之后，西晋覆亡，晋室在南方延续。</p></article><article><b>03 · 后来</b><p>东晋之后南方进入刘宋；北方与南方仍同时有不同政权。</p></article></div><p class="question-caution">这是一条入门线索，并非把几十年的变化归因于单一事件。各站可继续展开事件、核对原文。</p><button class="secondary-button" data-journey-action="share-question">复制这一题的链接</button><span class="question-share-status" role="status"></span></section>
  </main>`;
}
