import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION, entities, guides, relations, sources } from '../src/domain/data';

describe('historical sample integrity', () => {
  const entityById = new Map(entities.map(entity => [entity.id, entity]));
  const sourceIds = new Set(sources.map(source => source.id));

  it('keeps all references resolvable and all claims sourced', () => {
    expect(CONTENT_VERSION).toContain('draft');
    expect(entityById.size).toBe(entities.length);
    expect(new Set(relations.map(relation => relation.id)).size).toBe(relations.length);
    expect(sourceIds.size).toBe(sources.length);
    for (const entity of entities) {
      expect(entity.sourceIds.length).toBeGreaterThan(0);
      for (const id of entity.sourceIds) expect(sourceIds.has(id)).toBe(true);
    }
    for (const relation of relations) {
      expect(entityById.has(relation.source)).toBe(true);
      expect(entityById.has(relation.target)).toBe(true);
      expect(relation.sourceIds.length).toBeGreaterThan(0);
      for (const id of relation.sourceIds) expect(sourceIds.has(id)).toBe(true);
      if (relation.start !== null && relation.end !== null) expect(relation.start).toBeLessThanOrEqual(relation.end);
    }
    for (const guide of guides) {
      for (const step of guide.steps) expect(entityById.has(step.entityId)).toBe(true);
    }
  });

  it('shares the same participation action between the person and event', () => {
    const actionIds: string[] = [];
    for (const person of entities.filter(entity => entity.kind === 'person')) {
      for (const action of person.actions) {
        actionIds.push(action.id);
        const event = entityById.get(action.eventId);
        expect(event?.kind).toBe('event');
        expect(event?.actions.find(item => item.id === action.id)).toBe(action);
        expect(action.year).toBeGreaterThanOrEqual(event!.start);
        expect(action.year).toBeLessThanOrEqual(event!.end);
        expect(action.sourceIds.length).toBeGreaterThan(0);
        for (const id of action.sourceIds) expect(sourceIds.has(id)).toBe(true);
      }
    }
    expect(new Set(actionIds).size).toBe(actionIds.length);
  });

  it('keeps dated changes, undated evidence, and interpretation distinct', () => {
    expect(relations.find(item => item.id === 'sun-liu-208')?.start).toBe(208);
    expect(relations.find(item => item.id === 'sun-liu-215')?.start).toBe(215);
    const undated = relations.find(item => item.id === 'lu-zhou-grain');
    expect(undated).toMatchObject({ evidence: 'record', start: null, end: null, uncertain: true });
    expect(relations.some(item => item.evidence === 'interpretation' && item.sourceIds.length > 0)).toBe(true);
    expect(entityById.get('chibi')?.kind).toBe('event');
  });
});
