import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { modernEraGuides, modernEventGuides } from '../src/domain/modern-guides';
import { modernChapters, modernDocuments, qingEventSources, modernTextLocation, type TextContent } from '../src/domain/modern-texts';
import { modernGuideUrl, modernGuideLocation, modernGuideTextUrl, modernTextGuideEvent } from '../src/domain/modern-guide-location';
const base = 'https://example.com/history/?scope=all';
it('covers all six eras and 34 articles with distinct questions and pointers to real sections', () => {
  expect(modernEraGuides).toHaveLength(6);
  expect(modernEventGuides.map(g => g.id)).toEqual(modernChapters.map(c => c.id));
  expect(new Set(modernEventGuides.map(g => g.question)).size).toBe(34);
  expect(new Set(modernEventGuides.flatMap(g => g.sections.map(s => s.pointer))).size).toBe(102);
  for (const era of modernEraGuides) { expect(era.terms.length).toBeGreaterThanOrEqual(2); expect(era.connection.length).toBeGreaterThan(30); }
  for (const g of modernEventGuides) {
    const text: TextContent = JSON.parse(readFileSync(`public/data/modern/chapters/${g.id}.json`, 'utf8'));
    expect(g.sections).toHaveLength(3);
    for (const s of g.sections) {
      expect(text.blocks.find(b => b.id === s.id)?.text).toBe(s.title);
      const href = modernGuideTextUrl('chapters', g.id, g.id, s.id, base);
      expect(modernTextLocation(href)).toMatchObject({ collection: 'chapters', id: g.id, from: g.id, block: s.id });
      expect(modernTextGuideEvent(href)).toBe(g.id);
    }
  }
});
it('all original source jumps retain the correct guide return and reject unrelated returns', () => {
  for (const d of modernDocuments) for (const id of d.events) {
    const href = modernGuideTextUrl('documents', d.id, id, d.block, base);
    expect(modernTextGuideEvent(href)).toBe(id);
    expect(new URL(href).hash).toBe(`#${d.block}`);
  }
  for (const s of qingEventSources) expect(modernTextGuideEvent(modernGuideTextUrl('qingshigao', String(s.volume), s.event, s.block, base))).toBe(s.event);
  expect(modernTextGuideEvent(modernGuideTextUrl('documents','hong-kong-declaration','change-six','p3',base))).toBe('');
  expect(modernTextGuideEvent(`${base}&texts=documents&doc=hong-kong-declaration&from=hong-kong-return&guide=change-six`)).toBe('');
});
it('restores shared guide links and handles invalid eras or mismatched steps', () => {
  for (const g of modernEventGuides) {
    const url = modernGuideUrl('', g.id, base);
    expect(modernGuideLocation(url)).toEqual({ era:g.era, step:g.id, invalid:false });
    expect(new URL(url).searchParams.get('scope')).toBe('all');
    expect(new URL(url).pathname).toBe('/history/');
  }
  expect(modernGuideLocation(`${base}&modern-guides=qing&step=wto-entry`)).toEqual({era:'qing',step:'qing-founded',invalid:true});
  expect(modernGuideLocation(`${base}&modern-guides=not-real&step=wto-entry`)).toEqual({era:'',step:'',invalid:true});
  expect(modernGuideLocation(modernGuideUrl('','',base))).toEqual({era:'',step:'',invalid:false});
});
