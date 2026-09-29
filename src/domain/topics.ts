import type { Entity, Guide, Relation, Source, TopicId } from './types';

export interface Topic {
  id: TopicId;
  title: string;
  shortTitle: string;
  eraLabel: string;
  sourceWork: string;
  minYear: number;
  maxYear: number;
  centerId: string;
  ticks: { year: number; label?: string; important?: boolean }[];
  periods: string[];
  introTitle: string;
  introDescription: string;
  guideId: string;
}

export const topics: Topic[] = [{
  id: 'shiji', title: '史记 · 全书星图', shortTitle: '史记全书',
  eraLabel: '上古—西汉 · 130 卷', sourceWork: '《史记》',
  minYear: -841, maxYear: -1, centerId: 'shiji-hongmen',
  ticks: [], periods: [], introTitle: '', introDescription: '', guideId: '',
}];
export const DEFAULT_TOPIC = topics[0];
export function topicById(value: unknown): Topic | undefined { return topics.find(topic => topic.id === value); }
export const entityTopic = (entity: Entity): TopicId => entity.topicId ?? 'shiji';
export const relationTopic = (relation: Relation): TopicId => relation.topicId ?? 'shiji';
export const sourceTopic = (source: Source): TopicId => source.topicId ?? 'shiji';
export const guideTopic = (guide: Guide): TopicId => guide.topicId ?? 'shiji';
export function formatYear(year: number): string { return year < 0 ? `公元前 ${Math.abs(year)} 年` : `公元 ${year} 年`; }
export function formatYearRange(start: number, end: number): string {
  if (start === end) return formatYear(start);
  if (start < 0 && end < 0) return `公元前 ${Math.abs(start)}—${Math.abs(end)} 年`;
  if (start > 0 && end > 0) return `公元 ${start}—${end} 年`;
  return `${formatYear(start)} — ${formatYear(end)}`;
}
