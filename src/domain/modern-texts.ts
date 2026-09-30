import manifest from './generated/modern-texts-manifest.json';

export const modernChapters = manifest.chapters;
export const modernDocuments = manifest.documents;
export const qingEventSources = manifest.qingLinks;
export type TextCollection = 'chapters' | 'qingshigao' | 'documents';
export interface TextBlock { id: string; kind: string; html: string; text: string }
export interface TextContent { id: string; blocks: TextBlock[] }
export interface QingChapter { id: string; volume: number; title: string; category: string; characters: number; blocks: number; tables: number; sourceUrl: string; warning?: string; coverage?: 'partial' | 'missing' }
export interface QingManifest { title: string; edition: string; license: string; licenseUrl: string; chapters: QingChapter[] }
export const modernChapter = (id: string | null) => modernChapters.find(chapter => chapter.id === id);
export const modernDocument = (id: string | null) => modernDocuments.find(doc => doc.id === id);
export function modernTextUrl(collection: TextCollection = 'chapters', id = '', from = '', block = '', base = location.href): string {
  const url = new URL(base), scope = url.searchParams.get('scope');
  url.search = ''; url.hash = '';
  url.searchParams.set('texts', collection);
  if (id) url.searchParams.set(collection === 'qingshigao' ? 'volume' : collection === 'documents' ? 'doc' : 'article', id);
  if (from) url.searchParams.set('from', from);
  if (scope === 'all') url.searchParams.set('scope', scope);
  if (/^p[1-9]\d{0,4}$/.test(block)) url.hash = block;
  return url.href;
}
export function modernTextLocation(href: string) {
  const url = new URL(href), p = url.searchParams;
  const collection: TextCollection = p.get('texts') === 'qingshigao' ? 'qingshigao' : p.get('texts') === 'documents' ? 'documents' : 'chapters';
  const raw = p.get(collection === 'qingshigao' ? 'volume' : collection === 'documents' ? 'doc' : 'article') ?? '';
  const id = collection === 'chapters' ? modernChapter(raw)?.id ?? '' : collection === 'documents' ? modernDocument(raw)?.id ?? '' : /^[1-9]\d{0,2}$/.test(raw) && Number(raw) <= 529 ? raw : '';
  const candidate = p.get('from') ?? '';
  const related = collection === 'chapters' ? id === candidate : collection === 'documents' ? modernDocument(id)?.events.includes(candidate) : qingEventSources.some(s => s.event === candidate && String(s.volume) === id);
  return { collection, id, from: related && modernChapter(candidate) ? candidate : '', block: /^#p[1-9]\d{0,4}$/.test(url.hash) ? url.hash.slice(1) : '', invalid: !!raw && !id };
}
const cache = new Map<string, Promise<unknown>>();
async function json<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    const promise = fetch(`${import.meta.env.BASE_URL}data/modern/${path}`).then(async response => {
      if (!response.ok) throw new Error('正文暂时无法加载');
      return response.json();
    }).catch(error => { cache.delete(path); throw error; });
    cache.set(path, promise);
  }
  return cache.get(path) as Promise<T>;
}
export const loadQingManifest = () => json<QingManifest>('qingshigao/manifest.json');
export async function loadModernText(collection: TextCollection, id: string): Promise<TextContent> {
  const valid = modernTextLocation(modernTextUrl(collection, id, '', '', 'http://localhost/'));
  if (!id || valid.id !== id) throw new Error('无效的正文编号');
  const path = `${collection}/${id}.json`;
  const content = await json<TextContent>(path);
  if (content.id !== id || !Array.isArray(content.blocks) || !content.blocks.length) {
    cache.delete(path); throw new Error('正文数据不完整');
  }
  return content;
}
