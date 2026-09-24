import { describe, expect, it, vi } from 'vitest';
import type { Entity, Relation } from '../src/domain/types';

const fixture = vi.hoisted(() => {
  const entities: Entity[] = [{
    id: 'chibi', name: '赤壁之战', aliases: ['赤壁'], kind: 'event', group: 'neutral',
    role: '战役', period: '208 年', start: 208, end: 208, summary: '', description: '', actions: [], sourceIds: ['source'],
  }];
  for (let index = 1; index <= 80; index += 1) {
    entities.push({
      id: `p${index}`, name: index <= 2 ? '刘备' : index === 3 ? '诸葛亮' : `人物${index}`,
      aliases: index === 1 ? ['刘玄德', '玄德', '刘皇叔'] : index === 3 ? ['孔明', '卧龙'] : [],
      kind: 'person', group: 'neutral', role: '测试人物', period: '184—280', start: 184,
      end: index === 80 ? 207 : 280, summary: '', description: '', actions: [], sourceIds: ['source'],
    });
  }
  const relations: Relation[] = [];
  const addRelation = (id: string, source: string, target: string, start = 208, end = 208) => {
    relations.push({
      id, source, target, start, end, label: '参与', category: 'military',
      evidence: 'record', context: '测试样本', sourceIds: ['source'],
    });
  };
  for (let index = 1; index <= 20; index += 1) addRelation(`center-${index}`, 'chibi', `p${index}`);
  for (let index = 21; index <= 78; index += 1) addRelation(`expand-${index}`, 'p1', `p${index}`);
  addRelation('neighbors', 'p70', 'p71');
  addRelation('expired', 'chibi', 'p79', 209, 209);
  return { entities, relations, sources: [{ id: 'source', title: '测试', section: '', url: '', note: '' }] };
});

vi.mock('../src/domain/data', () => fixture);

import {
  buildGraph, DEFAULT_STATE, entityById, relationMatches, sanitizeState,
  searchEntities, shareUrl, stateFromUrl,
} from '../src/exploration/core';
import type { ExploreState } from '../src/exploration/core';

const state = (overrides: Partial<ExploreState> = {}): ExploreState => ({
  ...DEFAULT_STATE, categories: [...DEFAULT_STATE.categories], expandedIds: [], ...overrides,
});
const relation = (overrides: Partial<Relation> = {}): Relation => ({
  id: 'interval', source: 'chibi', target: 'p1', category: 'military', label: '参与',
  evidence: 'record', start: 208, end: 210, context: '', sourceIds: ['source'], ...overrides,
});

describe('historical time filtering', () => {
  it('includes each boundary year but excludes dates outside the recorded interval', () => {
    for (const year of [208, 210]) {
      expect(relationMatches(relation(), state({ fromYear: year, toYear: year }))).toBe(true);
    }
    for (const year of [207, 211]) {
      expect(relationMatches(relation(), state({ fromYear: year, toYear: year }))).toBe(false);
    }
    expect(relationMatches(relation(), state({ fromYear: 209, toYear: 211 }))).toBe(true);
  });

  it('does not treat either unknown endpoint as infinity', () => {
    for (const dates of [{ start: null }, { end: null }, { start: null, end: null }]) {
      expect(relationMatches(relation(dates), state())).toBe(false);
      expect(relationMatches(relation(dates), state({ showUndated: true }))).toBe(true);
    }
  });

  it('keeps uncertain records opt-in and still respects their category', () => {
    expect(relationMatches(relation({ uncertain: true }), state())).toBe(false);
    expect(relationMatches(relation({ uncertain: true }), state({ showUndated: true }))).toBe(true);
    expect(relationMatches(relation({ uncertain: true }), state({ showUndated: true, fromYear: 184, toYear: 184 }))).toBe(false);
    expect(relationMatches(relation({ category: 'family', start: null }), state({ showUndated: true }))).toBe(false);
    expect(relationMatches(relation(), state({ categories: [] }))).toBe(false);
  });
});

describe('selection, expansion, and graph budgets', () => {
  it('keeps the same center when merely selecting another object', () => {
    const before = buildGraph(state());
    const after = buildGraph(state({ selectedId: 'p3' }));
    expect(after.centerId).toBe(before.centerId);
    expect(after.selectedId).toBe('p3');
    expect(new Set(after.nodes.map((node) => node.id))).toEqual(new Set(before.nodes.map((node) => node.id)));
    expect(after.nodes).toHaveLength(13);
  });

  it('preserves the expanded node set when selecting an already visible expanded node', () => {
    const before = buildGraph(state({ expandedIds: ['p1'] }));
    const after = buildGraph(state({ expandedIds: ['p1'], selectedId: 'p30' }));
    expect(after.nodes.map((node) => node.id)).toEqual(before.nodes.map((node) => node.id));
    expect(after.relations).toEqual(before.relations);
  });

  it('keeps an out-of-time selection as context and removes expired relation lines', () => {
    const view = buildGraph(state({ selectedId: 'p80', relationId: 'expired', fromYear: 208, toYear: 208 }));
    expect(view.nodes.some((node) => node.id === 'p80')).toBe(true);
    expect(view.contextIds).toContain('p80');
    expect(view.relationId).toBe('expired');
    expect(view.relations.some((edge) => edge.id === 'expired')).toBe(false);
  });

  it('prioritizes both selected relationship endpoints within the default node budget', () => {
    const view = buildGraph(state({ selectedId: 'p80', relationId: 'neighbors' }));
    expect(view.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['chibi', 'p80', 'p70', 'p71']));
    expect(view.nodes.length).toBeLessThanOrEqual(13);
    expect(view.relations.some((edge) => edge.id === 'neighbors')).toBe(true);
  });

  it('never exceeds 50 nodes, duplicates nodes, or evicts the selection during expansion', () => {
    const view = buildGraph(state({ selectedId: 'p80', expandedIds: ['chibi', 'p1', 'p1'] }));
    expect(view.nodes).toHaveLength(50);
    expect(new Set(view.nodes.map((node) => node.id)).size).toBe(50);
    expect(view.nodes.some((node) => node.id === 'p80')).toBe(true);
    const nodeIds = new Set(view.nodes.map((node) => node.id));
    expect(view.relations.every((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))).toBe(true);
  });

  it('ignores expansions that are not reachable from the current graph', () => {
    const base = buildGraph(state({ fromYear: 208, toYear: 208 }));
    const remote = buildGraph(state({ fromYear: 208, toYear: 208, expandedIds: ['p79'] }));
    expect(remote).toEqual(base);
  });

  it('retains the center and selected object when all categories are turned off', () => {
    const view = buildGraph(state({ categories: [], selectedId: 'p2' }));
    expect(view.nodes.map((node) => node.id)).toEqual(['chibi', 'p2']);
    expect(view.relations).toEqual([]);
    expect(view.contextIds).toEqual(['chibi', 'p2']);
  });
});

describe('safe snapshots and public links', () => {
  it('serializes only the explicit public whitelist and clears pre-existing private URL data', () => {
    const snapshot = state({
      selectedId: 'p3', relationId: 'neighbors', fullId: 'p3', sourceId: 'source', expandedIds: ['p1'],
      spatial: { positions: { p3: [1, 2, 3] }, camera: { position: [0, 0, 10], target: [0, 0, 0] } },
    });
    const url = new URL(shareUrl(snapshot, 'https://user:secret@example.com/explore?search=private&progress=3#source'));
    expect([...url.searchParams.keys()].sort()).toEqual(['categories', 'center', 'entity', 'from', 'relation', 'selected', 'to', 'undated', 'view']);
    expect(url.hash).toBe('');
    expect(url.username).toBe('');
    expect(url.password).toBe('');
    const restored = stateFromUrl(url.href)!;
    expect(restored.centerId).toBe('chibi');
    expect(restored.selectedId).toBe('p3');
    expect(restored.relationId).toBe('neighbors');
    expect(restored.expandedIds).toEqual([]);
    expect(restored.spatial).toBeUndefined();
    expect(restored.fullId).toBe('p3');
    expect(restored.sourceId).toBeNull();
  });

  it('round-trips a closed selection, empty category filter, and list view', () => {
    const original = state({ selectedId: null, categories: [], viewMode: 'list', fromYear: 208, toYear: 208 });
    expect(stateFromUrl(shareUrl(original, 'https://example.com/'))).toEqual(original);
  });

  it('refreshes an entity-only detail link with that object as the exploration origin', () => {
    const refreshed = stateFromUrl('https://example.com/?entity=p3');
    expect(refreshed).toEqual(state({ centerId: 'p3', selectedId: 'p3', fullId: 'p3' }));
    expect(stateFromUrl(shareUrl(refreshed!, 'https://example.com/'))).toEqual(refreshed);
  });

  it('round-trips full details without replacing the originating center or filters', () => {
    const original = state({
      centerId: 'p1', selectedId: null, fullId: 'p3', relationId: 'neighbors',
      fromYear: 208, toYear: 215, categories: ['political'], showUndated: true, viewMode: 'list',
    });
    const shared = shareUrl(original, 'https://example.com/?favorites=p2&spatial=private&sourceId=source');
    expect(new URL(shared).searchParams.get('entity')).toBe('p3');
    expect(stateFromUrl(shared)).toEqual(original);
    const closed = new URL(shareUrl(state({ fullId: null }), shared));
    expect(closed.searchParams.has('entity')).toBe(false);
    expect(stateFromUrl(closed.href)?.fullId).toBeNull();
  });

  it('rejects unavailable or empty details even when the center is valid', () => {
    for (const query of ['entity=removed-person', 'entity=', 'center=chibi&entity=removed-person', 'center=chibi&entity=', 'center=missing&entity=p3']) {
      expect(stateFromUrl(`https://example.com/?${query}`)).toBeNull();
    }
  });

  it('refuses a missing public center instead of silently opening another historical object', () => {
    expect(stateFromUrl('https://example.com/?center=removed-person')).toBeNull();
    expect(stateFromUrl('https://example.com/?center=%3Cscript%3E')).toBeNull();
    expect(stateFromUrl('not a URL')).toBeNull();
    expect(stateFromUrl('https://example.com/')).toBeNull();
  });

  it('sanitizes malicious values, years, IDs, and private URL parameters', () => {
    const restored = stateFromUrl('https://example.com/?center=chibi&selected=%3Cscript%3E&relation=missing&from=9999&to=0&categories=military,evil,military&undated=true&view=bad&sourceId=source&fullId=p3&expandedIds=p1');
    expect(restored).toMatchObject({
      centerId: 'chibi', selectedId: null, relationId: null, fromYear: 184, toYear: 280,
      categories: ['military'], showUndated: false, viewMode: 'graph3d',
      sourceId: null, fullId: null, expandedIds: [],
    });
    expect(sanitizeState({ fromYear: Infinity, toYear: '208evil', expandedIds: ['p1', 'p1', '__proto__'] })).toMatchObject({
      fromYear: 184, toYear: 280, expandedIds: ['p1'],
    });
  });

  it('copies safe local layout vectors and drops malformed camera coordinates', () => {
    const snapshot = sanitizeState({
      spatial: { positions: { p1: [1, 2, 3], unknown: [1, 2, 3], p2: [0, Infinity, 0] }, camera: { position: [1, 2, 3], target: [0, 0, 0] } },
    });
    expect(snapshot.spatial?.positions).toEqual({ p1: [1, 2, 3] });
    expect(sanitizeState({ spatial: { camera: { position: [0, NaN, 0], target: [0, 0, 0] } } }).spatial).toBeUndefined();
  });
});

describe('global historical search', () => {
  it('normalizes traditional characters and aliases without duplicating one identity', () => {
    expect(searchEntities('劉玄德').map((entity) => entity.id)).toEqual(['p1']);
    expect(searchEntities('諸葛亮').map((entity) => entity.id)).toEqual(['p3']);
    expect(searchEntities('臥龍').map((entity) => entity.id)).toEqual(['p3']);
    expect(searchEntities('刘').map((entity) => entity.id)).toEqual(['p1', 'p2']);
  });

  it('retains separate same-name identities and does not fabricate fuzzy matches', () => {
    expect(searchEntities('刘备').map((entity) => entity.id)).toEqual(['p1', 'p2']);
    expect(searchEntities('刘被')).toEqual([]);
    expect(searchEntities('   ')).toEqual([]);
    expect(entityById('missing')).toBeUndefined();
  });
});
