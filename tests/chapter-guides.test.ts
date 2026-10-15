import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chapterGuides, readingRoutes } from '../src/domain/chapter-guides';
import { shijiChapters, type ChapterText } from '../src/domain/shiji-book';
import { guideHomeUrl, guideLocation, guideUrl } from '../src/exploration/reading';

describe('full-book beginner guides', () => {
  it('covers every volume with a distinct guide and three valid original-text anchors', () => {
    expect(chapterGuides.map(g => g.volume)).toEqual(shijiChapters.map(c => c.volume));
    for (const field of ['question', 'background', 'takeaway'] as const) {
      expect(new Set(chapterGuides.map(g => g[field])).size, field).toBe(130);
    }
    const allSections: string[] = [];
    for (const guide of chapterGuides) {
      const original: ChapterText = JSON.parse(readFileSync(new URL(`../public/data/shiji/${String(guide.volume).padStart(3, '0')}.json`, import.meta.url), 'utf8'));
      expect(guide.background.length, `volume ${guide.volume}`).toBeGreaterThan(25);
      expect(guide.people.length).toBeGreaterThanOrEqual(2);
      expect(guide.people.every(p => p.name.trim() && p.role.trim())).toBe(true);
      expect(guide.terms.length).toBeGreaterThan(0);
      expect(guide.terms.every(t => t.word.trim() && t.definition.trim())).toBe(true);
      expect(guide.sections).toHaveLength(3);
      for (const section of guide.sections) {
        expect(original.blocks.some(block => block.id === section.block), `volume ${guide.volume}: ${section.title} -> ${section.block}`).toBe(true);
        expect(section.title.trim()).not.toBe('');
        expect(section.text.length).toBeGreaterThan(25);
        allSections.push(section.text);
      }
    }
    expect(new Set(allSections).size).toBe(390);
  });

  it('provides complete and focused routes using real, nonrepeated volumes', () => {
    expect(readingRoutes).toHaveLength(8);
    expect(new Set(readingRoutes.map(r => r.id)).size).toBe(8);
    for (const route of readingRoutes) {
      expect(new Set(route.volumes).size).toBe(route.volumes.length);
      expect(route.volumes.every(v => shijiChapters.some(c => c.volume === v))).toBe(true);
    }
    expect(readingRoutes.find(r => r.id === 'complete')?.volumes).toEqual(shijiChapters.map(c => c.volume));
    expect(readingRoutes.find(r => r.id === 'tables')?.volumes).toEqual(shijiChapters.filter(c => c.category === '表').map(c => c.volume));
  });

  it('validates routes and bounds sections without leaking unrelated query or credentials', () => {
    const base = 'https://reader:secret@example.com/read?token=secret&story=hongmen#shiji/7/p19';
    const url = guideUrl({ volume: 130, section: 2, route: 'complete' }, base);
    expect(url).toBe('https://example.com/read?route=complete&reading=130&section=2');
    expect(guideHomeUrl(url)).toBe('https://example.com/read?guide=');
    expect(guideLocation(url)).toEqual({ volume: 130, section: 2, route: 'complete' });
    expect(guideLocation('https://example.com/?reading=131&route=missing')).toEqual({ volume: null, section: 0, route: 'first-stories' });
    for (const section of ['-5', '999', '1.5', 'NaN']) {
      expect(guideLocation(`https://example.com/?reading=1&section=${section}`).section).toBe(section === '999' ? 2 : 0);
    }
    for (const section of [NaN, Infinity, 0.5]) expect(guideUrl({ volume: 1, route: 'complete', section }, base)).toContain('section=0');
  });
});
