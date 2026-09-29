import { describe, expect, it } from 'vitest';
import { entities, relations, sources, guides } from '../src/domain/data';
import { DEFAULT_STATE, buildGraph, sanitizeState, searchEntities, shareUrl, stateFromUrl } from '../src/exploration/core';

describe('Shiji-only exploration', () => {
  it('shows only the 130-volume Shiji corpus', () => {
    expect(DEFAULT_STATE.topicId).toBe('shiji');
    expect(entities).toHaveLength(8630);
    expect(relations).toHaveLength(29276);
    expect(sources).toHaveLength(130);
    expect(guides).toHaveLength(0);
    expect(entities.every(item => item.topicId === 'shiji')).toBe(true);
    expect(relations.every(item => item.topicId === 'shiji')).toBe(true);
    expect(searchEntities('赤壁之战')).toHaveLength(0);
  });

  it('does not restore removed topics or their links', () => {
    expect(stateFromUrl('https://example.com/?topic=three-kingdoms&center=chibi')).toBeNull();
    expect(stateFromUrl('https://example.com/?center=chibi')).toBeNull();
    expect(sanitizeState({ topicId: 'three-kingdoms', centerId: 'chibi' }).centerId).toBe('shiji-hongmen');
  });

  it('always includes full-book dates and associations when reopening an old filtered link', () => {
    const state = sanitizeState({ topicId: 'shiji', centerId: 'shiji-chapter-047', categories: [], fromYear: 208, toYear: 208, showUndated: false });
    expect(state).toMatchObject({ topicId: 'shiji', fromYear: -841, toYear: -1, showUndated: true });
    expect(state.categories).toEqual(['military', 'political', 'family', 'influence', 'textual']);
    const graph = buildGraph(state);
    expect(graph.nodes.length).toBeGreaterThan(1);
    expect(graph.nodes.length).toBeLessThanOrEqual(50);
    expect(graph.relations.length).toBeGreaterThan(0);
  });

  it('keeps a Shiji person centered through share URLs without private data', () => {
    const state = sanitizeState({ topicId: 'shiji', centerId: 'shiji-xiang-yu', selectedId: 'shiji-xiang-yu', viewMode: 'list' });
    const url = shareUrl(state, 'https://user:secret@example.com/?private=yes#old');
    const parsed = new URL(url);
    expect(parsed.username).toBe(''); expect(parsed.password).toBe('');
    expect(parsed.searchParams.has('private')).toBe(false);
    expect(stateFromUrl(url)?.centerId).toBe('shiji-xiang-yu');
  });
});
