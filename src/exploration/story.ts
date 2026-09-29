import { stories, storyById, type HistoryStory } from '../domain/stories';
import { shijiEntities, shijiRelations } from '../domain/shiji-data';
import type { GraphView } from '../domain/types';

export function storyLocation(url: string): { story: HistoryStory; step: number } {
  const params = new URL(url).searchParams;
  const story = storyById(params.get('story')) ?? stories[0];
  const value = Number(params.get('step') ?? 0);
  return { story, step: Number.isInteger(value) ? Math.max(0, Math.min(story.steps.length - 1, value)) : 0 };
}

export function storyUrl(story: HistoryStory, step: number, base: string): string {
  const url = new URL(base);
  url.search = ''; url.hash = ''; url.username = ''; url.password = '';
  url.searchParams.set('story', story.id);
  url.searchParams.set('step', String(Math.max(0, Math.min(story.steps.length - 1, step))));
  return url.href;
}

/** Each scene contains only named participants and sourced actions from this scene. */
export function buildStoryGraph(story: HistoryStory, step: number, selectedId?: string, relationId?: string): GraphView {
  const scene = story.steps[Math.max(0, Math.min(story.steps.length - 1, step))];
  const ids = new Set([story.eventId, ...scene.personIds]);
  const nodes = shijiEntities.filter(entity => ids.has(entity.id));
  const relations = shijiRelations.filter(relation => scene.relationIds.includes(relation.id) && relation.evidence === 'record' && ids.has(relation.source) && ids.has(relation.target));
  return { nodes, relations, contextIds: [], centerId: story.eventId, selectedId: selectedId && ids.has(selectedId) ? selectedId : story.eventId, relationId: relations.some(relation => relation.id === relationId) ? relationId! : null };
}
