import { modernChapters, modernChapter, modernTextUrl, modernTextLocation, type TextCollection } from './modern-texts';

export function modernGuideLocation(href: string) {
  const p = new URL(href).searchParams;
  const rawEra = p.get('modern-guides') ?? '', rawStep = p.get('step') ?? '';
  const selected = modernChapter(rawStep);
  const era = modernChapters.some(c => c.era === rawEra) ? rawEra : !rawEra ? selected?.era ?? '' : '';
  const step = selected?.era === era ? selected.id : modernChapters.find(c => c.era === era)?.id ?? '';
  return { era, step, invalid: (!!rawEra && rawEra !== era) || (!!rawStep && rawStep !== step) };
}
export function modernGuideUrl(era = '', step = '', base = location.href) {
  const url = new URL(base), scope = url.searchParams.get('scope');
  url.search = ''; url.hash = '';
  url.searchParams.set('modern-guides', era);
  if (step) url.searchParams.set('step', step);
  const valid = modernGuideLocation(url.href);
  url.searchParams.set('modern-guides', valid.era);
  if (valid.step) url.searchParams.set('step', valid.step); else url.searchParams.delete('step');
  if (scope === 'all') url.searchParams.set('scope', scope);
  return url.href;
}
export function modernGuideTextUrl(collection: TextCollection, id: string, event: string, block = '', base = location.href) {
  const url = new URL(modernTextUrl(collection, id, event, block, base));
  // Only bind a return route to a source that actually belongs to this event.
  if (modernTextLocation(url.href).from === event && modernChapter(event)) url.searchParams.set('guide', event);
  return url.href;
}
export function modernTextGuideEvent(href: string) {
  const route = modernTextLocation(href);
  const candidate = new URL(href).searchParams.get('guide');
  return candidate && candidate === route.from ? candidate : route.collection === 'chapters' ? route.id : '';
}
