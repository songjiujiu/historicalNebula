import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { modernJourneyEvents } from '../src/domain/modern-history';
import { modernChapters, modernDocuments, qingEventSources, modernTextUrl, modernTextLocation, type TextContent, type QingManifest } from '../src/domain/modern-texts';
const read = (path: string) => JSON.parse(readFileSync(`public/data/modern/${path}`, 'utf8'));
it('provides substantive on-site prose for every modern event, separately from original sources', () => {
  expect(modernChapters.map(c => c.id)).toEqual(modernJourneyEvents.map(e => e.id));
  for (const meta of modernChapters) {
    const content: TextContent = read(`chapters/${meta.id}.json`);
    expect(content.id).toBe(meta.id);
    expect(content.blocks.length).toBe(meta.blocks);
    expect(content.blocks.filter(b => b.kind === 'paragraph').length).toBeGreaterThanOrEqual(5);
    expect(content.blocks.map(b => b.text).join('').length).toBe(meta.characters);
    expect(meta.characters).toBeGreaterThan(400);
    for (const section of meta.outline) expect(content.blocks.find(b => b.id === section.id)?.text).toBe(section.title);
  }
});
it('imports 529 Qing entries, explicitly marks the six absent bodies, and retains readable tables', () => {
  const manifest: QingManifest = read('qingshigao/manifest.json');
  expect(manifest.chapters).toHaveLength(529);
  expect(manifest.chapters.filter(c => c.coverage === 'missing').map(c => c.volume)).toEqual([30,31,32,33,34,35]);
  expect(manifest.chapters.find(c => c.volume === 29)?.coverage).toBe('partial');
  let tables = 0;
  for (const c of manifest.chapters) {
    const content: TextContent = read(`qingshigao/${c.id}.json`);
    expect(content.blocks.length).toBe(c.blocks);
    expect(content.blocks.reduce((n,b) => n+b.text.replace(/\s/g,'').length,0)).toBe(c.characters);
    if (!c.warning) expect(c.characters).toBeGreaterThan(500);
    tables += c.tables;
  }
  expect(tables).toBe(62);
  expect(manifest.chapters.find(c => c.volume === 411)?.title).toContain('李鸿章');
});
it('all selected documents and Qing event anchors contain the exact source text', () => {
  expect(modernDocuments).toHaveLength(11);
  for (const d of modernDocuments) {
    const content: TextContent = read(`documents/${d.id}.json`);
    expect(content.blocks).toHaveLength(d.blocks);
    expect(content.blocks.find(b => b.id === d.block)?.text).toContain(d.cue);
    for (const event of d.events) expect(modernChapters.some(c => c.id === event)).toBe(true);
    expect(new URL(d.sourceUrl).protocol).toBe('https:');
    if ('archiveSha256' in d) expect(createHash('sha256').update(readFileSync(`data/modern-history/source/${d.id}.epub`)).digest('hex')).toBe(d.archiveSha256);
  }
  for (const source of qingEventSources) {
    const content: TextContent = read(`qingshigao/${source.volume}.json`);
    expect(content.blocks.find(b => b.id === source.block)?.text, source.event).toContain(source.cue);
    const url = modernTextUrl('qingshigao', String(source.volume), source.event, source.block, 'https://example.com/sub/?library=old#p99');
    expect(modernTextLocation(url)).toMatchObject({ id:String(source.volume),from:source.event,block:source.block });
  }
});
it('rejects forged IDs and return events instead of requesting arbitrary paths', () => {
  for (const value of ['0','530','999','1.0','01','../../secret','<script>']) expect(modernTextLocation(`https://example.com/?texts=qingshigao&volume=${encodeURIComponent(value)}`).id).toBe('');
  expect(modernTextLocation('https://example.com/?texts=chapters&article=not-real').invalid).toBe(true);
  expect(modernTextLocation('https://example.com/?texts=documents&doc=hong-kong-declaration&from=change-six#p3').from).toBe('');
  expect(modernTextLocation('https://example.com/?texts=documents&doc=hong-kong-declaration&from=hong-kong-return#p3').from).toBe('hong-kong-return');
  expect(modernTextLocation('https://example.com/?texts=chapters&article=change-six#bad').block).toBe('');
});
it('generated reading HTML is inert and uses unique sequential paragraph IDs', () => {
  const qing: QingManifest = read('qingshigao/manifest.json');
  const paths = [...modernChapters.map(c => `chapters/${c.id}.json`),...modernDocuments.map(d => `documents/${d.id}.json`),...qing.chapters.map(c => `qingshigao/${c.id}.json`)];
  for (const path of paths) {
    const content: TextContent = read(path);
    expect(content.blocks.every((b,i)=>b.id===`p${i+1}`),path).toBe(true);
    expect(content.blocks.some(b=>/<(?:script|iframe|object|img|svg|input|button)\b|\s(?:on\w+|style|src|href|id)\s*=/i.test(b.html)),path).toBe(false);
  }
}, 15000);
