import { describe, expect, it } from 'vitest';
import { entities, guides, relations, sources } from '../src/domain/data';
import { entityTopic, formatYear, formatYearRange, guideTopic, relationTopic, sourceTopic, topics } from '../src/domain/topics';
import { buildGraph, sanitizeState, searchEntities, shareUrl, stateFromUrl } from '../src/exploration/core';

describe('independent historical topics', () => {
  it('ships a sourced Shiji graph without mixing it with the Three Kingdoms graph', () => {
    const shiji = topics.find(topic => topic.id === 'shiji')!;
    expect(entities.some(entity => entity.id === shiji.centerId && entityTopic(entity) === 'shiji')).toBe(true);
    const view = buildGraph(sanitizeState({ topicId: 'shiji', centerId: shiji.centerId }));
    expect(view.nodes.length).toBeGreaterThan(3);
    expect(view.relations.length).toBeGreaterThan(3);
    expect(view.nodes.every(entity => entityTopic(entity) === 'shiji')).toBe(true);
    expect(view.relations.every(relation => relationTopic(relation) === 'shiji')).toBe(true);
    expect(view.nodes.some(entity => entity.id === 'chibi')).toBe(false);
  });

  it('keeps entity, relation, action, guide, and source references within their topic', () => {
    const byId = new Map(entities.map(entity => [entity.id, entity]));
    const sourceById = new Map(sources.map(source => [source.id, source]));
    for (const entity of entities) {
      for (const sourceId of entity.sourceIds) expect(sourceTopic(sourceById.get(sourceId)!)).toBe(entityTopic(entity));
      for (const action of entity.actions) {
        expect(entityTopic(byId.get(action.eventId)!)).toBe(entityTopic(entity));
        for (const sourceId of action.sourceIds) expect(sourceTopic(sourceById.get(sourceId)!)).toBe(entityTopic(entity));
      }
    }
    for (const relation of relations) {
      expect(entityTopic(byId.get(relation.source)!)).toBe(relationTopic(relation));
      expect(entityTopic(byId.get(relation.target)!)).toBe(relationTopic(relation));
      for (const sourceId of relation.sourceIds) expect(sourceTopic(sourceById.get(sourceId)!)).toBe(relationTopic(relation));
    }
    for (const guide of guides) for (const step of guide.steps) {
      expect(entityTopic(byId.get(step.entityId)!)).toBe(guideTopic(guide));
    }
  });

  it('round-trips BCE dates and rejects cross-topic public details', () => {
    const original = sanitizeState({ topicId: 'shiji', centerId: 'shiji-hongmen', fromYear: -206, toYear: -205, selectedId: null });
    const url = shareUrl(original, 'https://example.com/');
    expect(stateFromUrl(url)).toEqual(original);
    expect(stateFromUrl('https://example.com/?topic=shiji&center=chibi')).toBeNull();
    expect(stateFromUrl('https://example.com/?topic=shiji&center=shiji-hongmen&entity=chibi')).toBeNull();
    expect(sanitizeState({ topicId: 'shiji', centerId: 'shiji-hongmen', selectedId: 'chibi', relationId: 'sun-liu-208' })).toMatchObject({ selectedId: null, relationId: null });
    expect(formatYear(-206)).toBe('公元前 206 年');
    expect(formatYearRange(-209, -202)).toBe('公元前 209—202 年');
  });

  it('restores old links and saved states to the Three Kingdoms topic', () => {
    expect(stateFromUrl('https://example.com/?center=chibi&from=208&to=208')).toMatchObject({ topicId: 'three-kingdoms', centerId: 'chibi', fromYear: 208, toYear: 208 });
    expect(sanitizeState({ centerId: 'chibi', fromYear: 208, toYear: 208 })).toMatchObject({ topicId: 'three-kingdoms', centerId: 'chibi' });
    expect(searchEntities('項羽').some(entity => entityTopic(entity) === 'shiji')).toBe(true);
    expect(searchEntities('漢王').map(entity => entity.id)).toContain('shiji-liu-bang');
  });
});
