import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Converter } from 'opencc-js';
import { historyBookNames, journeyEras, journeyEvents, journeySourceUrl, journeyUrl, sourceJourney } from '../src/domain/history-journey';
import { journeyReference, journeyReferences, journeyReferenceUrl } from '../src/domain/journey-references';
import { modernJourneyEras, modernJourneyEvents } from '../src/domain/modern-history';
const simplify = Converter({ from: 'tw', to: 'cn' });
describe('beginner history journey', () => {
  it('connects all 24 books to real event passages, without fabricated or heading-only anchors', () => {
    const covered = new Set<string>();
    for (const event of journeyEvents) {
      expect(journeyEras.some(era => era.id === event.era), event.id).toBe(true);
      expect(event.sources.length + (event.references?.length ?? 0), event.id).toBeGreaterThan(0);
      for (const source of event.sources) {
        covered.add(source.book);
        const root = source.book === 'shiji' ? 'public/data/shiji' : `public/data/histories/${source.book}`;
        const chapter = JSON.parse(readFileSync(`${root}/${String(source.volume).padStart(3, '0')}.json`, 'utf8'));
        const block = chapter.blocks.find((block: { id: string }) => block.id === source.block);
        expect(block, `${event.id}: ${source.book}/${source.volume}/${source.block}`).toBeDefined();
        expect(block.kind).toBe('paragraph');
        expect(simplify(block.text), `${event.id}: ${source.cue}`).toContain(source.cue);
      }
    }
    expect([...covered].sort()).toEqual(Object.keys(historyBookNames).sort());
    expect(new Set(journeyEvents.map(event => event.id)).size).toBe(journeyEvents.length);
  });
  it('extends beyond Ming with separately attributed references, without changing the 24-history corpus', () => {
    expect(Object.keys(historyBookNames)).toHaveLength(24);
    expect(new Set(journeyEras.map(era => era.id)).size).toBe(journeyEras.length);
    for (const era of modernJourneyEras) {
      expect(era.books).toEqual([]);
      expect(modernJourneyEvents.some(event => event.era === era.id)).toBe(true);
    }
    const used = new Set<string>();
    for (const event of modernJourneyEvents) {
      expect(event.sources).toEqual([]);
      expect(event.references?.length, event.id).toBeGreaterThan(0);
      for (const field of ['before', 'happening', 'after', 'remember'] as const) expect(event[field].length, `${event.id}.${field}`).toBeGreaterThan(10);
      for (const id of event.references!) {
        used.add(id);
        const reference = journeyReference(id);
        expect(reference, `${event.id}: ${id}`).toBeDefined();
        expect(new URL(reference!.url).protocol).toBe('https:');
        expect(reference!.locator.length).toBeGreaterThan(0);
        const link = new URL(journeyReferenceUrl(reference!));
        expect(link.origin).toBe(new URL(reference!.url).origin);
        if (reference!.format === 'PDF') expect(link.hash).toBe('');
        else expect(decodeURIComponent(link.hash)).toBe(`#:~:text=${reference!.locator}`);
      }
    }
    expect([...used].sort()).toEqual(journeyReferences.map(reference => reference.id).sort());
    expect(new Set(journeyReferences.map(reference => reference.id)).size).toBe(journeyReferences.length);
    expect(journeyEvents[journeyEvents.findIndex(event => event.id === 'ming-falls') + 1].id).toBe('qing-founded');
    expect(journeyEvents.at(-1)?.id).toBe('change-six');
    expect(journeyEvents.find(event => event.id === 'hong-kong-return')?.year).toContain('1997');
    expect(journeyEvents.find(event => event.id === 'macao-return')?.year).toContain('1999');
  });
  it('keeps sources deep-linkable and the return event validated', () => {
    for (const event of journeyEvents) for (const source of event.sources) {
      const url = journeySourceUrl(event, source, 'http://localhost/?q=old#old');
      if (source.book === 'shiji') {
        expect(new URL(url).searchParams.get('journey')).toBe(event.id);
        expect(new URL(url).hash).toBe(`#shiji/${source.volume}/${source.block}`);
      } else expect(sourceJourney(url)).toEqual({ event, source });
    }
    expect(sourceJourney('http://localhost/?library=mingshi&volume=24&from=ming-falls#p1')).toBeNull();
    expect(sourceJourney('http://localhost/?library=mingshi&volume=24&from=bad#p6')).toBeNull();
    expect(journeyUrl('bad', 'bad', 'http://localhost/?library=x#p5')).toBe('http://localhost/?journey=');
  });
});
