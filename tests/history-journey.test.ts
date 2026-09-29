import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Converter } from 'opencc-js';
import { historyBookNames, journeyEras, journeyEvents, journeySourceUrl, journeyUrl, sourceJourney } from '../src/domain/history-journey';
const simplify = Converter({ from: 'tw', to: 'cn' });
describe('beginner history journey', () => {
  it('connects all 24 books to real event passages, without fabricated or heading-only anchors', () => {
    const covered = new Set<string>();
    for (const event of journeyEvents) {
      expect(journeyEras.some(era => era.id === event.era), event.id).toBe(true);
      expect(event.sources.length).toBeGreaterThan(0);
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
