import { describe, expect, it } from 'vitest';
import { entities, relations } from '../src/domain/data';
import { fullShijiEntities, fullShijiRelations, shijiGraphReport } from '../src/domain/shiji-full-data';
import { buildGraph, sanitizeState, searchEntities, shareUrl, stateFromUrl, relationMatches } from '../src/exploration/core';

describe('full-book graph', () => {
  it('covers every chapter, all imported events, and independently searchable person entries', () => {
    expect(fullShijiEntities.filter(e => e.kind === 'chapter')).toHaveLength(130);
    expect(fullShijiEntities.filter(e => e.kind === 'person')).toHaveLength(shijiGraphReport.people);
    expect(fullShijiEntities.filter(e => e.id.startsWith('shiji-event-'))).toHaveLength(shijiGraphReport.events);
    expect(fullShijiRelations.filter(r => r.imported)).toHaveLength(shijiGraphReport.relations);
    const sourced = new Set(fullShijiEntities.filter(e => e.kind === 'event' && e.imported).flatMap(e => e.sourceIds));
    expect(sourced.size).toBe(130);
    for (const name of ['孔子', '秦始皇', '商鞅', '屈原', '司馬遷', '太史公自序', '扁鵲']) expect(searchEntities(name).length, name).toBeGreaterThan(0);
  });

  it('keeps textual associations separate from asserted historical interactions', () => {
    for (const edge of fullShijiRelations.filter(r => r.imported)) {
      expect(edge.evidence).not.toBe('record');
      if (edge.label === '事件提及' || edge.label.startsWith('篇章')) expect(edge.category).toBe('textual');
    }
    const ancient = fullShijiEntities.find(e => e.id === 'shiji-event-001-001')!;
    expect(ancient.start).toBeNull(); expect(ancient.end).toBeNull();
    expect(ancient.dateUncertain).toBe(true);
    const unknown = fullShijiRelations.find(r => r.imported && r.category === 'influence' && r.start === null)!;
    expect(relationMatches(unknown, sanitizeState({ topicId: 'shiji', showUndated: false }))).toBe(true);
    expect(relationMatches(unknown, sanitizeState({ topicId: 'shiji', showUndated: true }))).toBe(true);
  });

  it('opens chapter and person graphs across eras without leaking the other topic or exceeding the budget', () => {
    for (const centerId of ['shiji-chapter-001', 'shiji-chapter-047', 'shiji-chapter-130', searchEntities('孔子')[0].id]) {
      const state = sanitizeState({ topicId: 'shiji', centerId, showUndated: true, expandedIds: [centerId] });
      const view = buildGraph(state);
      expect(view.nodes.length).toBeGreaterThan(3);
      expect(view.nodes.length).toBeLessThanOrEqual(50);
      expect(view.nodes.every(n => n.topicId === 'shiji')).toBe(true);
      expect(view.relations.length).toBeGreaterThan(0);
      expect(stateFromUrl(shareUrl(state, 'https://example.com/'))?.centerId).toBe(centerId);
    }
    expect(new Set(entities.map(e => e.id)).size).toBe(entities.length);
    expect(new Set(relations.map(r => r.id)).size).toBe(relations.length);
  });

  it('builds a dense full-book view without repeated linear entity lookups', () => {
    const started = performance.now();
    const state = sanitizeState({ topicId: 'shiji', centerId: 'shiji-chapter-047', expandedIds: ['shiji-chapter-047'], showUndated: true });
    for (let n = 0; n < 5; n++) buildGraph(state);
    expect(performance.now() - started).toBeLessThan(2500);
  });
});
