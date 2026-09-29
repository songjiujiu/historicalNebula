import { describe, expect, it } from 'vitest';
import { entities, relations, sources, CONTENT_VERSION } from '../src/domain/data';

const ids = new Set(entities.map(entity => entity.id));
const sourceIds = new Set(sources.map(source => source.id));

describe('Shiji source integrity', () => {
  it('keeps unique IDs and valid graph endpoints', () => {
    expect(CONTENT_VERSION).toContain('shiji-only');
    expect(ids.size).toBe(entities.length);
    expect(new Set(relations.map(relation => relation.id)).size).toBe(relations.length);
    for (const relation of relations) {
      expect(ids.has(relation.source), relation.id).toBe(true);
      expect(ids.has(relation.target), relation.id).toBe(true);
      expect(relation.sourceIds.length, relation.id).toBeGreaterThan(0);
      expect(relation.sourceIds.every(id => sourceIds.has(id)), relation.id).toBe(true);
    }
  });

  it('keeps source links for every chapter and never includes Three Kingdoms materials', () => {
    expect(sources).toHaveLength(130);
    expect(sources.every(source => source.id.startsWith('sj-'))).toBe(true);
    expect(entities.every(entity => entity.sourceIds.every(id => sourceIds.has(id)))).toBe(true);
    expect(entities.some(entity => entity.id === 'chibi')).toBe(false);
  });
});
