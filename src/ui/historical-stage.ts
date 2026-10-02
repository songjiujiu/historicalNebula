import { guideHomeUrl } from '../exploration/reading';
import { historyGuideUrl } from '../domain/history-guides';
import { modernGuideUrl } from '../domain/modern-guide-location';
import { escapeHtml as esc } from './icons';

const base = `${import.meta.env.BASE_URL}models/history/`;
export function historicalStage(recent: string, readCount: number) {
  const books = [
    ['shiji', '史记', '先秦 · 汉', guideHomeUrl(location.href)],
    ['hanshu', '汉书', '西汉', historyGuideUrl('hanshu')],
    ['sanguozhi', '三国志', '三国', historyGuideUrl('sanguozhi')],
    ['jiutangshu', '旧唐书', '唐', historyGuideUrl('jiutangshu')],
    ['qingshigao', '清史稿', '清', modernGuideUrl('qing')],
  ];
  return `<header class="journey-hero immersive-hero">
    <div class="stage-copy"><span class="journey-overline">从上古读到当代</span><h1>展开历史，<br>看懂来路。</h1><p>跟着事件走，读懂人物与时代。</p>
      <div class="stage-actions"><button class="primary-button" data-journey-action="explore">开始探索 →</button><button class="secondary-button" data-journey-action="${recent ? 'resume' : 'start'}">${recent ? '继续阅读' : '从头读起'}</button></div>
      <blockquote>“以史为鉴，可以知兴替。”<cite>——《旧唐书》</cite></blockquote>
    </div>
    <div class="scroll-stage" data-history-model="history-scroll"><img src="${base}history-scroll-poster.png" width="1256" height="364" alt="绘画式历史长卷，从古代宫阙、桥梁延伸至现代城市" fetchpriority="high"><div class="stage-canvas" aria-hidden="true"></div></div>
    <nav class="scroll-eras" aria-label="长卷时代入口">${[['early', '先秦'], ['qinhan', '秦汉'], ['suitang', '隋唐'], ['songyuan', '宋元'], ['ming', '明'], ['qing', '清'], ['republic', '近现代']].map(([id,title])=>`<button data-stage-era="${id}"><i></i>${title}</button>`).join('')}</nav>
    <button class="stage-event" data-journey-event="qin-unifies"><img class="event-seal" src="${base}qin-portrait.png" alt="" width="82" height="104"><span><strong>秦统一六国</strong><small>前221年 · 从分立走向统一</small><b>查看事件导读 ↗</b></span></button>
  </header>
  <section class="history-shelf" aria-labelledby="shelf-heading"><div class="shelf-copy"><span class="journey-overline">02 <small>HISTORICAL NEBULA</small></span><h2 id="shelf-heading">从一本史书，<br>走进一个时代</h2><p>选一本书，从导读开始。</p><small>书中有山河，有人物，有选择，<br>也有我们自己。</small></div>
    <div class="shelf-display"><div class="books-stage" data-history-model="history-books"><img src="${base}history-books-poster.png" width="1026" height="334" alt="史记、汉书、三国志、旧唐书、清史稿的立体书架" loading="lazy"><div class="stage-canvas" aria-hidden="true"></div><div class="book-hotspots">${books.map(([id,name,,href])=>`<a data-stage-book="${id}" href="${esc(href)}" aria-label="进入《${name}》导读"></a>`).join('')}</div></div>
    <div class="shelf-links">${books.map(([id,name,era,href],index)=>`<a data-stage-book="${id}" href="${esc(href)}" aria-label="${era} ·《${name}》进入导读"><span>${era}</span><strong>${index === 0 ? '进入导读 →' : '查看导读'}</strong></a>`).join('')}</div></div>
    <aside class="shelf-note"><span>已读 <b>${readCount}</b> 个事件</span><p>阅读历史，<br>不是为了记住过去，<br>而是为了更好地出发。<small>—— 历史星云</small></p><button data-journey-action="library">探索更多史书 →</button></aside>
  </section><div class="stage-secondary-entry"><button data-journey-action="question">用一个问题开始 ↗</button><button data-journey-event="qing-founded">从清朝接着读 ↗</button></div>`;
}
