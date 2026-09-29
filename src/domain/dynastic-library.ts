import manifest from './generated/dynastic-manifest.json';

export const dynasticBooks = manifest.books;
export type DynasticBook = typeof dynasticBooks[number];
export type DynasticChapter = DynasticBook['chapters'][number];
export interface DynasticBlock { id: string; kind: 'heading' | 'paragraph' | 'table'; html: string; text: string }
export interface DynasticText { volume: number; blocks: DynasticBlock[] }
export interface DynasticSearchVolume { volume: number; blocks: { id: string; text: string }[] }
export interface DynasticLocation { book: string; volume?: number; block?: string; query?: string; page?: number }

export const dynasticBook = (id: string) => dynasticBooks.find(book => book.id === id);
export const dynasticChapter = (book: DynasticBook, volume: number) => book.chapters.find(chapter => chapter.volume === volume);

export function parseDynasticLocation(href: string): DynasticLocation | null {
  const url = new URL(href);
  if (!url.searchParams.has('library')) return null;
  const id = url.searchParams.get('library') || '';
  if (!id) return { book: '' };
  const book = dynasticBook(id);
  if (!book) return { book: '' };
  const query = url.searchParams.get('q');
  if (query?.trim()) {
    const page = Number(url.searchParams.get('page') ?? '0');
    return { book: id, query: query.slice(0, 100), page: Number.isInteger(page) && page >= 0 ? page : 0 };
  }
  const number = url.searchParams.get('volume');
  if (!number) return { book: id };
  if (!/^\d{1,3}$/.test(number)) return { book: id };
  const volume = Number(number);
  const chapter = dynasticChapter(book, volume);
  if (!chapter) return { book: id };
  const block = url.hash.match(/^#p([1-9]\d{0,4})$/)?.[0].slice(1);
  return { book: id, volume, ...(block && Number(block.slice(1)) <= chapter.blocks ? { block } : {}) };
}

export function dynasticUrl(next: DynasticLocation, base = location.href): string {
  const url = new URL(base);
  for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
  url.searchParams.set('library', next.book);
  if (next.volume !== undefined) url.searchParams.set('volume', String(next.volume));
  if (next.query) { url.searchParams.set('q', next.query); if (next.page) url.searchParams.set('page', String(next.page)); }
  url.hash = next.block ?? '';
  return url.toString();
}

const chapterCache = new Map<string, Promise<DynasticText>>();
export function loadDynasticChapter(book: DynasticBook, volume: number): Promise<DynasticText> {
  const chapter = dynasticChapter(book, volume);
  if (!chapter) return Promise.reject(new Error('卷号不存在'));
  const key = `${book.id}/${volume}`;
  if (!chapterCache.has(key)) {
    const path = `${import.meta.env.BASE_URL}data/histories/${book.id}/${String(volume).padStart(3, '0')}.json`;
    chapterCache.set(key, fetch(path).then(async response => {
      if (!response.ok) throw new Error('原文加载失败');
      const data = await response.json() as DynasticText;
      if (data.volume !== volume || !Array.isArray(data.blocks) || data.blocks.length !== chapter.blocks) throw new Error('卷文数据不完整');
      return data;
    }).catch(error => { chapterCache.delete(key); throw error; }));
  }
  return chapterCache.get(key)!;
}

const searchCache = new Map<string, Promise<DynasticSearchVolume[]>>();
export function loadDynasticSearch(book: DynasticBook): Promise<DynasticSearchVolume[]> {
  if (!searchCache.has(book.id)) {
    searchCache.set(book.id, fetch(`${import.meta.env.BASE_URL}data/histories/${book.id}/search.json`).then(async response => {
      if (!response.ok) throw new Error('全文检索索引加载失败');
      const data = await response.json() as DynasticSearchVolume[];
      if (!Array.isArray(data) || data.length !== book.chapters.length) throw new Error('全文检索索引不完整');
      return data;
    }).catch(error => { searchCache.delete(book.id); throw error; }));
  }
  return searchCache.get(book.id)!;
}
