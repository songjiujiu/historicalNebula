// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stories, storyById } from '../src/domain/stories';
import { createStoryReader } from '../src/ui/story-reader';

const { scene, createScene } = vi.hoisted(() => {
  const scene = { setGraph: vi.fn(), getSnapshot: vi.fn(() => ({ camera: [0, 0, 10], target: [0, 0, 0] })), setQuality: vi.fn(), setActive: vi.fn(), fit: vi.fn() };
  return { scene, createScene: vi.fn(() => scene) };
});
vi.mock('../src/nebula/scene', () => ({ createNebulaScene: createScene }));
const KEY = 'historical-nebula:stories:v1';
const click = (selector: string) => {
  const button = document.querySelector<HTMLButtonElement>(selector);
  expect(button, selector).toBeTruthy();
  button!.click();
};
const text = (selector: string) => document.querySelector(selector)?.textContent ?? '';
const current = () => text('.story-current-step h4');
const setup = () => {
  const host = document.createElement('div');
  document.body.append(host);
  const handlers = { onExplore: vi.fn(), onBook: vi.fn() };
  const reader = createStoryReader(host, handlers);
  reader.showFromUrl();
  return { reader, ...handlers };
};

beforeEach(() => {
  document.body.replaceChildren(); localStorage.clear(); vi.clearAllMocks();
  history.replaceState(null, '', '/?story=hongmen&step=0');
  vi.spyOn(history, 'pushState').mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('beginner story reader interaction', () => {
  it('moves through scenes and across stories, updating the graph and reading link', async () => {
    const { reader } = setup();
    const hongmen = storyById('hongmen')!;
    expect(document.querySelectorAll('[data-story-person]')).toHaveLength(2);
    reader.setActive(true);
    await vi.waitFor(() => expect(createScene).toHaveBeenCalledOnce());
    click('[data-story-action="next"]');
    expect(current()).toBe(hongmen.steps[1].title);
    expect(document.querySelectorAll('[data-story-person]')).toHaveLength(4);
    expect(scene.setGraph.mock.lastCall?.[0].nodes.map((node: { id: string }) => node.id)).toContain('shiji-fan-zeng');
    expect(reader.readingUrl).toContain('story=hongmen&step=1');
    click('[data-story-action="prev"]');
    expect(current()).toBe(hongmen.steps[0].title);
    click('[data-story-step="2"]');
    expect(text('.story-outcome')).toContain(hongmen.outcome);
    click('[data-story-action="next"]');
    expect(reader.eventId).toBe('shiji-hanxin-appointment');
    expect(JSON.parse(localStorage.getItem(KEY)!).completed).toContain('hongmen');
    click('[data-story-action="prev"]');
    expect(current()).toBe(hongmen.steps[2].title);
    reader.setActive(false);
    expect(scene.setActive).toHaveBeenLastCalledWith(false);
  });

  it('explains a selected person or action, opens the exact source, and retains exploration callbacks', () => {
    const { onBook, onExplore } = setup();
    click('[data-story-person="shiji-liu-bang"]');
    expect(document.querySelector('[data-story-person="shiji-liu-bang"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(text('.story-person-detail')).toContain('赴宴');
    click('[data-story-explore="shiji-liu-bang"]');
    expect(onExplore).toHaveBeenLastCalledWith('shiji-liu-bang');
    click('[data-story-volume="7"][data-story-block="p19"]');
    expect(onBook).toHaveBeenLastCalledWith(7, 'p19');
    click('[data-story-step="1"]');
    click('[data-story-relation="shiji-fan-zhuang-206"]');
    expect(text('.story-person-detail')).toContain('这条线的意思');
    expect(text('.story-person-detail')).toContain('范增安排项庄在席间舞剑');
    click('[data-story-action="explore"]');
    expect(onExplore).toHaveBeenLastCalledWith('shiji-hongmen');
    click('[data-story-action="book"]');
    expect(onBook).toHaveBeenLastCalledWith();
  });

  it('restores saved reading progress, rejects obsolete completions, and clamps a stale scene number', () => {
    localStorage.setItem(KEY, JSON.stringify({ recent: { id: 'hanxin', step: 999 }, completed: ['dazexiang', 'removed-story'] }));
    const { reader } = setup();
    expect(document.querySelector('.story-resume')?.classList.contains('hidden')).toBe(false);
    expect(text('[data-story-id="dazexiang"] .story-route-number')).toBe('✓');
    click('[data-story-action="resume"]');
    expect(reader.eventId).toBe('shiji-hanxin-appointment');
    expect(current()).toBe(storyById('hanxin')!.steps.at(-1)!.title);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.recent).toEqual({ id: 'hanxin', step: 2 });
    expect(saved.completed).toEqual(['dazexiang']);
    expect(document.querySelector('.story-resume')?.classList.contains('hidden')).toBe(true);
  });

  it('distinguishes reaching the endpoint from finishing the whole route', () => {
    setup();
    click('[data-story-id="gaixia"]');
    click('[data-story-step="2"]');
    click('[data-story-action="next"]');
    expect(text('.story-completion')).toContain('你已读到路线终点');
    expect(text('.story-completion')).toContain('1 / 6');
    expect(document.querySelector('.story-completion')?.classList.contains('hidden')).toBe(false);
    for (const story of stories.slice(0, -1)) {
      click(`[data-story-id="${story.id}"]`);
      click(`[data-story-step="${story.steps.length - 1}"]`);
      click('[data-story-action="complete"]');
    }
    click('[data-story-id="gaixia"]');
    click('[data-story-step="2"]');
    click('[data-story-action="next"]');
    expect(text('.story-completion')).toContain('你已读完这条楚汉入门路线');
    expect(text('.story-completion')).toContain('6 / 6');
    expect(new Set(JSON.parse(localStorage.getItem(KEY)!).completed)).toEqual(new Set(stories.map(story => story.id)));
  });
});
