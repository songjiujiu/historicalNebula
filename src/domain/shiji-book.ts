import manifest from './generated/shiji-manifest.json';
import { corpusApiUrl } from './corpus-api';

export const shijiBook = manifest;
export const shijiChapters = manifest.chapters;
export const bookCategories = ['本纪', '表', '书', '世家', '列传'] as const;
export type BookCategory = typeof bookCategories[number];
export type Chapter = typeof shijiChapters[number];
export interface TextBlock { id: string; kind: 'paragraph' | 'heading' | 'table'; html: string; text: string }
export interface ChapterText { volume: number; blocks: TextBlock[] }
export interface SearchChapter { volume: number; blocks: { id: string; text: string }[] }
export interface BookLocation { volume: number; block?: string }

export const chapterByVolume = (volume: number) => shijiChapters.find(c => c.volume === volume);
export const chapterBySource = (id: string) => shijiChapters.find(c => c.sourceId === id);
export function parseBookLocation(hash: string): BookLocation | null {
  const match = hash.match(/^#shiji\/(\d{1,3})(?:\/(p[1-9]\d{0,4}))?$/);
  if (!match) return null;
  const chapter = chapterByVolume(Number(match[1]));
  if (!chapter || (match[2] && Number(match[2].slice(1)) > chapter.blocks)) return null;
  return { volume: chapter.volume, ...(match[2] ? { block: match[2] } : {}) };
}
export function bookUrl(location: BookLocation, base: string): string {
  const url = new URL(base);
  url.hash = `shiji/${location.volume}${location.block ? `/${location.block}` : ''}`;
  return url.toString();
}

const cache = new Map<number, Promise<ChapterText>>();
export function loadChapter(volume: number): Promise<ChapterText> {
  if (!chapterByVolume(volume)) return Promise.reject(new Error('卷号不存在'));
  if (!cache.has(volume)) {
    const promise = fetch(corpusApiUrl(`shiji/${String(volume).padStart(3, '0')}.json`))
      .then(async response => {
        if (!response.ok) throw new Error('原文加载失败，请重试');
        const data = await response.json() as ChapterText;
        if (data.volume !== volume || !Array.isArray(data.blocks) || data.blocks.length !== chapterByVolume(volume)!.blocks) throw new Error('原文文件不完整');
        return data;
      }).catch(error => { cache.delete(volume); throw error; });
    cache.set(volume, promise);
  }
  return cache.get(volume)!;
}

let searchCache: Promise<SearchChapter[]> | undefined;
export function loadBookSearch(): Promise<SearchChapter[]> {
  searchCache ??= fetch(corpusApiUrl('shiji/search.json')).then(async response => {
    if (!response.ok) throw new Error('全文索引加载失败，请重试');
    const data = await response.json() as SearchChapter[];
    if (!Array.isArray(data) || data.length !== 130) throw new Error('全文索引不完整');
    return data;
  }).catch(error => { searchCache = undefined; throw error; });
  return searchCache;
}

export function searchBook(index: SearchChapter[], query: string, category = '', offset = 0, limit = 40) {
  const needle = query.normalize('NFKC').trim().slice(0, 100);
  const hits: { volume: number; block: string; snippet: string }[] = [];
  let total = 0;
  if (!needle) return { total, hits };
  for (const record of index) {
    const chapter = chapterByVolume(record.volume)!;
    if (category && chapter.category !== category) continue;
    for (const block of record.blocks) {
      const at = block.text.indexOf(needle);
      if (at < 0) continue;
      if (total >= offset && hits.length < limit) hits.push({ volume: record.volume, block: block.id, snippet: `${at > 32 ? '…' : ''}${block.text.slice(Math.max(0, at - 32), at + needle.length + 65)}${at + needle.length + 65 < block.text.length ? '…' : ''}` });
      total++;
    }
  }
  return { total, hits };
}
