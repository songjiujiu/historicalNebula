import { describe, expect, it } from 'vitest';
import { topics, DEFAULT_TOPIC, topicById } from '../src/domain/topics';
import { sanitizeState, stateFromUrl, searchEntities } from '../src/exploration/core';

describe('single historical work', () => {
  it('exposes only Shiji', () => {
    expect(topics).toHaveLength(1);
    expect(DEFAULT_TOPIC.id).toBe('shiji');
    expect(topicById('three-kingdoms')).toBeUndefined();
  });
  it('rejects removed-topic links and keeps full-book search', () => {
    expect(stateFromUrl('https://example.com/?topic=three-kingdoms&center=chibi')).toBeNull();
    expect(sanitizeState({ topicId: 'three-kingdoms' }).topicId).toBe('shiji');
    expect(searchEntities('孔子').length).toBeGreaterThan(0);
  });
});
