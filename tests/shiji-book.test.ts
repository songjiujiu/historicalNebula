import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5';
import { Converter } from 'opencc-js/t2cn';
import { shijiChapters, bookCategories, parseBookLocation, bookUrl, searchBook, type ChapterText, type SearchChapter } from '../src/domain/shiji-book';

const read = (name: string) => JSON.parse(readFileSync(new URL(`../public/data/shiji/${name}`, import.meta.url), 'utf8'));
const corpus: ChapterText[] = shijiChapters.map(c => read(`${String(c.volume).padStart(3, '0')}.json`));
const index: SearchChapter[] = read('search.json');
const simplify = Converter({ from: 'tw', to: 'cn' });

describe('complete Shiji corpus', () => {
  it('contains all 130 ordered chapters, including the ten actual tables', () => {
    expect(shijiChapters.map(c => c.volume)).toEqual(Array.from({ length: 130 }, (_, i) => i + 1));
    expect(bookCategories.map(kind => shijiChapters.filter(c => c.category === kind).length)).toEqual([12, 10, 8, 30, 70]);
    for (const c of shijiChapters) {
      const text = corpus[c.volume - 1];
      expect(text.volume).toBe(c.volume);
      expect(text.blocks.length).toBe(c.blocks);
      expect(text.blocks.map(b => b.id)).toEqual(text.blocks.map((_, i) => `p${i + 1}`));
      if (c.volume >= 13 && c.volume <= 22) {
        const tables = text.blocks.filter(b => b.kind === 'table');
        expect(tables.length).toBeGreaterThan(0);
        expect(tables.reduce((n, b) => n + (b.html.match(/<tr[>\s]/g) ?? []).length, 0)).toBeGreaterThan(10);
        expect(tables.reduce((n, b) => n + b.text.length, 0)).toBeGreaterThan(1000);
      }
    }
    expect(corpus[0].blocks.some(b => b.text.includes('少典之子'))).toBe(true);
    expect(corpus[129].blocks.some(b => b.text.includes('百三十篇'))).toBe(true);
    expect(corpus[125].blocks.some(b => b.text.includes('褚先生补'))).toBe(true);
  });

  it('keeps all rendered text in the search index and strips executable HTML', () => {
    const allowedTags = new Set(['p','div','span','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','th','td','caption','b','i','em','strong','small','sup','sub','br','ul','ol','li','dl','dt','dd','blockquote','ruby','rt','rp','a']);
    for (const chapter of corpus) {
      const indexed = index.find(c => c.volume === chapter.volume)!;
      expect(indexed.blocks.length).toBe(chapter.blocks.length);
      for (const [i, block] of chapter.blocks.entries()) {
        expect(indexed.blocks[i]).toEqual({ id: block.id, text: simplify(block.text) });
        const visit = (node: DefaultTreeAdapterTypes.ChildNode) => {
          if ('tagName' in node) {
            expect(allowedTags.has(node.tagName)).toBe(true);
            for (const a of node.attrs) {
              expect(['id','href','target','rel','rowspan','colspan']).toContain(a.name);
              if (a.name === 'href') expect(a.value).toMatch(/^(#|https:\/\/(zh\.wikisource\.org|zh\.wikipedia\.org)\/)/);
            }
          }
          if ('childNodes' in node) node.childNodes.forEach(visit);
        };
        parseFragment(block.html).childNodes.forEach(visit);
      }
    }
  }, 20000);

  it('finds text within table cells, handles traditional queries, and pages without losing matches', () => {
    const hit = searchBook(index, simplify('丞相蕭何守漢中'), '表');
    expect(hit.hits.some(h => h.volume === 22)).toBe(true);
    expect(searchBook(index, '孔子', '本纪').hits.every(h => h.volume <= 12)).toBe(true);
    const first = searchBook(index, '孔子', '', 0, 5);
    const second = searchBook(index, '孔子', '', 5, 5);
    expect(first.total).toBeGreaterThan(10);
    expect(new Set([...first.hits, ...second.hits].map(h => `${h.volume}/${h.block}`)).size).toBe(10);
    expect(searchBook(index, '   ').hits).toEqual([]);
  });

  it('validates public chapter/paragraph links and preserves the underlying exploration URL', () => {
    const url = bookUrl({ volume: 16, block: 'p5' }, 'https://example.com/app/?topic=shiji&center=shiji-hongmen');
    expect(new URL(url).searchParams.get('center')).toBe('shiji-hongmen');
    expect(parseBookLocation(new URL(url).hash)).toEqual({ volume: 16, block: 'p5' });
    for (const hash of ['#shiji/0', '#shiji/131', '#shiji/1/p99999', '#shiji/1/p0', '#shiji/1/<script>']) expect(parseBookLocation(hash)).toBeNull();
  });
});
