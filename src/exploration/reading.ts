import { chapterGuide, readingRoute } from '../domain/chapter-guides';
import { chapterByVolume } from '../domain/shiji-book';

export interface GuideLocation { volume: number | null; section: number; route: string }
export function guideHomeUrl(base: string) {
  const url = new URL(base); url.search = '?guide='; url.hash = ''; url.username = ''; url.password = '';
  return url.href;
}
export function guideLocation(value: string): GuideLocation {
  const url = new URL(value);
  const route = readingRoute(url.searchParams.get('route'));
  const volume = Number(url.searchParams.get('reading'));
  const guide = chapterGuide(volume);
  const requested = Number(url.searchParams.get('section') ?? 0);
  return { volume: guide && chapterByVolume(volume) ? volume : null, section: guide && Number.isInteger(requested) ? Math.max(0, Math.min(guide.sections.length - 1, requested)) : 0, route: route.id };
}
export function guideUrl(state: GuideLocation, base: string) {
  const url = new URL(base); url.search = ''; url.hash = ''; url.username = ''; url.password = '';
  url.searchParams.set('route', readingRoute(state.route).id);
  if (state.volume && chapterGuide(state.volume)) {
    url.searchParams.set('reading', String(state.volume));
    url.searchParams.set('section', String(Number.isInteger(state.section) ? Math.max(0, Math.min(chapterGuide(state.volume)!.sections.length - 1, state.section)) : 0));
  }
  return url.href;
}
