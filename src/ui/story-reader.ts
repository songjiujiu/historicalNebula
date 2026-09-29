import { stories, storyById, type StorySource } from '../domain/stories';
import { shijiEntities, shijiRelations } from '../domain/shiji-data';
import { buildStoryGraph, storyLocation, storyUrl } from '../exploration/story';
import { createLayout } from '../nebula/layout';
import type { SceneController } from '../domain/types';
import { escapeHtml as esc, icon } from './icons';
import './story-reader.css';

type StoryOptions = { onExplore: (id: string) => void; onBook: (volume?: number, block?: string) => void };
const KEY = 'historical-nebula:stories:v1';
const entity = (id: string) => shijiEntities.find(item => item.id === id)!;
const stepTitle = (title: string) => title.replace(/^第[一二三四五六七八九十\d]+幕[：:]\s*/, '');

export function createStoryReader(host: HTMLElement, options: StoryOptions) {
  let { story, step } = storyLocation(location.href);
  let selectedId = story.eventId;
  let selectedRelation: string | undefined;
  let active = false;
  let scene: SceneController | null = null;
  let sceneLoading = false;
  let sceneFailed = false;
  let completed = new Set<string>();
  let recent: { id: string; step: number } | null = null;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved) {
      completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter((id: unknown) => storyById(id)) : []);
      if (storyById(saved.recent?.id) && Number.isInteger(saved.recent?.step)) recent = saved.recent;
    }
  } catch { /* Reading does not depend on local storage. */ }
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  host.innerHTML = `<div class="story-shell"><header class="story-welcome"><div><span class="story-kicker">第一次读《史记》 · 从这里开始</span><h1>读懂一个故事，认识一段历史。</h1><p>从秦末到汉初，跟着人物的行动往下读。每次只认识几个人，每一幕都能回到原文。</p></div><button class="story-resume secondary-button hidden" data-story-action="resume">继续上次阅读 ${icon('arrow')}</button></header><div class="story-layout"><nav class="story-route" aria-label="楚汉入门阅读顺序"></nav><main class="story-reading" id="story-reading"></main><aside class="story-visual" aria-label="这一幕的人物关系"><div class="story-visual-heading"><span class="story-kicker">边读边看</span><h2>这一幕，谁做了什么？</h2><p>点名字看身份；拖动星图看人物。</p></div><div class="story-scene" aria-label="当前故事的三维人物关系图"></div><p class="story-scene-status" role="status">正在点亮这一幕…</p><div class="story-graph-controls"><button class="text-button" data-story-action="fit">${icon('target')}看全这一幕</button><button class="text-button" data-story-action="explore">自由探索更多关系 ${icon('arrow')}</button></div><div class="story-person-detail" aria-live="polite"></div><div class="story-actions-list"></div><p class="story-graph-note">连线对应本幕记载的行动，空间远近不代表关系亲疏。</p></aside></div><footer class="story-page-note">白话导读依据《史记》整理。六个故事是入门选读，事件之间仍有其他历史过程。<button data-story-action="book">查阅全书 130 卷 →</button></footer></div>`;

  function persist() {
    recent = { id: story.id, step };
    try { localStorage.setItem(KEY, JSON.stringify({ recent, completed: [...completed] })); } catch { /* Optional progress. */ }
  }
  function sourceLinks(sources: StorySource[]) {
    return sources.map(source => `<button data-story-volume="${source.volume}" data-story-block="${esc(source.block ?? '')}">${icon('book')}${esc(source.label)}<span>读原文 ↗</span></button>`).join('');
  }
  function render() {
    const index = stories.indexOf(story);
    const current = story.steps[step];
    const last = step === story.steps.length - 1;
    $('.story-route').innerHTML = `<div class="story-route-title"><span>楚汉入门路线</span><small>6 个故事 · 按顺序读</small></div><ol>${stories.map((item, i) => `<li><button data-story-id="${item.id}" ${item.id === story.id ? 'aria-current="step"' : ''}><span class="story-route-number">${completed.has(item.id) ? '✓' : String(i + 1).padStart(2, '0')}</span><span><strong>${esc(entity(item.eventId).name)}</strong><small>${esc(item.era)}</small></span></button></li>`).join('')}</ol><div class="story-route-note">你正在读<br><strong>秦末 → 楚汉争战 → 汉朝建立</strong><p>前一场胜败，会怎样影响后面的局势？带着这个问题往下读。</p></div>`;
    $('.story-resume').classList.toggle('hidden', !recent || recent.id === story.id && recent.step === step);
    $('.story-reading').innerHTML = `<header class="story-chapter-heading"><div class="story-chapter-meta"><span>故事 ${index + 1} / ${stories.length}</span><span>${esc(story.era)} · ${esc(story.duration)}</span></div><h2 tabindex="-1">${esc(story.title)}</h2><p class="story-question">${esc(story.question)}</p></header><section class="story-background"><h3><span>01</span>先知道，当时是什么局面</h3><p>${esc(story.background)}</p></section><section class="story-cast"><h3><span>02</span>先认识这一幕的人</h3><div class="story-cast-grid">${current.personIds.map(id => { const person = entity(id); const role = story.people.find(p => p.id === id)?.role ?? person.role; return `<button data-story-person="${id}" aria-pressed="${selectedId === id}"><span class="story-avatar ${person.group}">${esc(person.name[0])}</span><span><strong>${esc(person.name)}</strong><small>${esc(role)}</small></span></button>`; }).join('')}</div></section><section class="story-scene-reading"><h3><span>03</span>事情怎样发生</h3><div class="story-step-tabs" role="group" aria-label="故事分幕">${story.steps.map((item, i) => `<button data-story-step="${i}" aria-current="${i === step ? 'step' : 'false'}"><span>${i + 1}</span>${esc(stepTitle(item.title))}</button>`).join('')}</div><article class="story-current-step" aria-live="polite"><span class="story-kicker">第 ${step + 1} 幕 / 共 ${story.steps.length} 幕</span><h4 tabindex="-1">${esc(current.title)}</h4><p>${esc(current.body)}</p><div class="story-takeaway"><span>这一幕记住一句话</span><p>${esc(current.takeaway)}</p></div></article><details class="story-sources"><summary>这段故事出自哪里？<span>原文对照</span></summary><p>上面是白话概述。打开对应段落，可以核对《史记》的具体写法。</p>${sourceLinks(current.sources)}</details></section>${last ? `<section class="story-outcome"><h3><span>04</span>这件事改变了什么</h3><p>${esc(story.outcome)}</p><details class="story-recap"><summary>读完试着说一遍：谁做了什么，结果怎样？</summary><ul>${story.recap.map(line => `<li>${esc(line)}</li>`).join('')}</ul></details><button class="text-button story-complete" data-story-action="complete">${completed.has(story.id) ? '✓ 已读完这个故事' : '✓ 我读懂了，记下进度'}</button></section>` : ''}${story.terms.length ? `<details class="story-terms"><summary>不熟悉的词，点这里解释 <span>${story.terms.length} 个</span></summary><dl>${story.terms.map(term => `<div><dt>${esc(term.word)}</dt><dd>${esc(term.definition)}</dd></div>`).join('')}</dl></details>` : ''}<div class="story-next-bar"><button class="secondary-button" data-story-action="prev" ${index === 0 && step === 0 ? 'disabled' : ''}>← ${step ? '上一幕' : '上一个故事'}</button><button class="primary-button" data-story-action="next">${!last ? '下一幕：' + esc(stepTitle(story.steps[step + 1].title)) : index < stories.length - 1 ? '下一件事：' + esc(stories[index + 1].title) : '完成这条入门路线'} ${icon('arrow')}</button></div><div class="story-completion hidden" role="status"></div>`;
    renderSelection();
    if (scene) {
      const graph = buildStoryGraph(story, step, selectedId, selectedRelation);
      // A new scene gets its own balanced layout, rather than retaining the
      // previous scene's sparse positions when different people enter.
      scene.setGraph(graph, { ...scene.getSnapshot(), positions: createLayout(graph.nodes, graph.centerId) });
      scene.fit();
    }
    if (active) void ensureScene();
  }
  function renderSelection() {
    const person = entity(selectedId);
    const relation = selectedRelation ? shijiRelations.find(item => item.id === selectedRelation) : undefined;
    const role = story.people.find(item => item.id === selectedId)?.role ?? person.role;
    const action = person.actions.filter(item => item.eventId === story.eventId).map(item => item.description).join(' ');
    $('.story-person-detail').innerHTML = relation ? `<span class="story-kicker">这条线的意思</span><h3>${esc(relation.label)}</h3><p>${esc(relation.context)}</p>` : `<span class="story-kicker">${person.kind === 'event' ? '当前故事' : '他是谁'}</span><h3>${esc(person.name)}<small>${esc(role)}</small></h3><p>${esc(person.kind === 'person' ? action || person.summary : story.steps[step].takeaway)}</p>${person.kind === 'person' ? `<button class="text-button" data-story-explore="${person.id}">了解他的更多经历 →</button>` : ''}`;
    $('.story-actions-list').innerHTML = `<h3>把连线读成一句话</h3>${buildStoryGraph(story, step).relations.map(item => `<button data-story-relation="${item.id}" aria-pressed="${selectedRelation === item.id}">${esc(item.context)}</button>`).join('') || '<p>这一幕先看文字经过，再继续认识人物。</p>'}`;
    host.querySelectorAll<HTMLElement>('[data-story-person]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.storyPerson === selectedId)));
  }
  function select(id: string, relationId?: string) {
    selectedId = id; selectedRelation = relationId;
    renderSelection();
    const snapshot = scene?.getSnapshot();
    scene?.setGraph(buildStoryGraph(story, step, selectedId, selectedRelation), snapshot);
  }
  async function ensureScene() {
    if (scene || sceneLoading || sceneFailed) return;
    sceneLoading = true;
    try {
      const { createNebulaScene } = await import('../nebula/scene');
      scene = createNebulaScene($('.story-scene'), {
        centerLabel: '这一幕的事件',
        onSelect: id => select(id),
        onRelation: id => select(selectedId, id),
        onReady: () => { $('.story-scene-status').textContent = ''; },
        onError: () => { sceneFailed = true; $('.story-scene-status').textContent = '当前设备暂不能显示 3D，下面的人物和行动仍可阅读。'; },
      });
      scene.setQuality(matchMedia('(max-width:760px)').matches ? 'low' : 'medium');
      scene.setGraph(buildStoryGraph(story, step, selectedId, selectedRelation));
      scene.fit();
      scene.setActive(active);
    } catch { sceneFailed = true; $('.story-scene-status').textContent = '当前设备暂不能显示 3D，下面的人物和行动仍可阅读。'; }
    finally { sceneLoading = false; }
  }
  function go(id: string, nextStep = 0, route = true) {
    const next = storyById(id); if (!next) return;
    story = next; step = Math.max(0, Math.min(story.steps.length - 1, nextStep));
    selectedId = story.eventId; selectedRelation = undefined;
    if (route) history.pushState({ ...history.state, story: story.id }, '', storyUrl(story, step, location.href));
    persist(); render();
    $('.story-current-step h4').focus({ preventScroll: true });
    $('.story-reading').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  host.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    if (button.dataset.storyId) return go(button.dataset.storyId);
    if (button.dataset.storyStep !== undefined) return go(story.id, Number(button.dataset.storyStep));
    if (button.dataset.storyPerson) return select(button.dataset.storyPerson);
    if (button.dataset.storyRelation) return select(selectedId, button.dataset.storyRelation);
    if (button.dataset.storyExplore) return options.onExplore(button.dataset.storyExplore);
    if (button.dataset.storyVolume) return options.onBook(Number(button.dataset.storyVolume), button.dataset.storyBlock || undefined);
    const index = stories.indexOf(story);
    switch (button.dataset.storyAction) {
      case 'prev': if (step > 0) go(story.id, step - 1); else if (index > 0) go(stories[index - 1].id, stories[index - 1].steps.length - 1); break;
      case 'next':
        if (step < story.steps.length - 1) go(story.id, step + 1);
        else {
          completed.add(story.id); persist();
          if (index < stories.length - 1) go(stories[index + 1].id);
          else { render(); $('.story-completion').classList.remove('hidden'); $('.story-completion').innerHTML = `<strong>${completed.size === stories.length ? '你已读完这条楚汉入门路线。' : '你已读到路线终点。'}</strong><p>已读完 ${completed.size} / ${stories.length} 个故事。试着按顺序讲出秦末起事、楚汉争战到汉朝建立的变化。</p><button class="secondary-button" data-story-id="${stories[0].id}">回顾第一件事</button><button class="text-button" data-story-action="book">继续查阅《史记》原文 →</button>`; }
        }
        break;
      case 'complete': completed.add(story.id); persist(); render(); break;
      case 'resume': if (recent) go(recent.id, recent.step); break;
      case 'fit': scene?.fit(); break;
      case 'explore': options.onExplore(story.eventId); break;
      case 'book': options.onBook(); break;
    }
  });
  return {
    showFromUrl() { const next = storyLocation(location.href); story = next.story; step = next.step; selectedId = story.eventId; selectedRelation = undefined; render(); },
    setActive(value: boolean) { active = value; scene?.setActive(value); if (value) void ensureScene(); },
    get eventId() { return story.eventId; },
    get readingUrl() { return storyUrl(story, step, location.href); },
  };
}
