import { describe, expect, it } from 'vitest';
import { stories, storyById, type HistoryStory } from '../src/domain/stories';
import { buildStoryGraph, storyLocation, storyUrl } from '../src/exploration/story';

describe('beginner story route and graph', () => {
  it('bounds incoming routes and shares only the chosen story and scene', () => {
    const hongmen = storyById('hongmen')!;
    expect(storyLocation('https://example.com/?story=missing&step=nope')).toEqual({ story: stories[0], step: 0 });
    expect(storyLocation('https://example.com/?story=hongmen&step=-5').step).toBe(0);
    expect(storyLocation('https://example.com/?story=hongmen&step=999').step).toBe(hongmen.steps.length - 1);
    expect(storyLocation('https://example.com/?story=hongmen&step=1.5').step).toBe(0);
    const shared = new URL(storyUrl(hongmen, 1, 'https://reader:secret@example.com/read?token=private&center=old#book-7-p19'));
    expect(shared.href).toBe('https://example.com/read?story=hongmen&step=1');
    expect(storyLocation(shared.href)).toEqual({ story: hongmen, step: 1 });
  });

  it('keeps every scene focused and rejects unrelated selections and interpretation edges', () => {
    for (const story of stories) for (const [step, scene] of story.steps.entries()) {
      const graph = buildStoryGraph(story, step, 'outside-this-scene', 'unrelated-edge');
      expect(new Set(graph.nodes.map(node => node.id))).toEqual(new Set([story.eventId, ...scene.personIds]));
      expect(new Set(graph.relations.map(relation => relation.id))).toEqual(new Set(scene.relationIds));
      expect(graph.relations.every(relation => relation.evidence === 'record')).toBe(true);
      expect(graph.relations.every(relation => graph.nodes.some(node => node.id === relation.source) && graph.nodes.some(node => node.id === relation.target))).toBe(true);
      expect(graph.selectedId).toBe(story.eventId);
      expect(graph.relationId).toBeNull();
    }
    const hongmen = storyById('hongmen')!;
    const malformed: HistoryStory = { ...hongmen, steps: [{ ...hongmen.steps[0], personIds: ['shiji-pengcheng'], relationIds: ['shiji-hongmen-pengcheng-context', 'shiji-xiang-liu-206'] }] };
    // Even if an editorial link enters a scene's allowlist, it must not look like a recorded action.
    expect(buildStoryGraph(malformed, 0).relations).toEqual([]);
    const focused = buildStoryGraph(hongmen, 1, 'shiji-fan-zeng', 'shiji-fan-zhuang-206');
    expect(focused.selectedId).toBe('shiji-fan-zeng');
    expect(focused.relationId).toBe('shiji-fan-zhuang-206');
  });
});
