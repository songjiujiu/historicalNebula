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

export const topics: Topic[] = [
  {
    id: 'three-kingdoms', title: '汉末 · 三国', shortTitle: '汉末三国', eraLabel: '公元 184—280 年',
    sourceWork: '《三国志》', minYear: 184, maxYear: 280, centerId: 'chibi',
    ticks: [184, 190, 196, 200, 208, 219, 220, 221, 222, 234, 249, 263, 265, 280].map(year => ({ year, important: year === 208 })),
    periods: ['黄巾起义', '群雄逐鹿', '赤壁之战', '三国鼎立', '西晋统一'],
    introTitle: '从赤壁，走进三国', introDescription: '沿着人物的选择，读懂一场变局。',
    guideId: 'chibi-intro',
  },
  {
    id: 'shiji', title: '史记 · 楚汉之际', shortTitle: '楚汉之际', eraLabel: '公元前 209—202 年',
    sourceWork: '《史记》', minYear: -209, maxYear: -202, centerId: 'shiji-hongmen',
    ticks: [
      { year: -209, label: '大泽乡' }, { year: -208 }, { year: -207, label: '巨鹿' },
      { year: -206, label: '鸿门', important: true }, { year: -205, label: '彭城' },
      { year: -204 }, { year: -203 }, { year: -202, label: '垓下' },
    ],
    periods: ['秦末起义', '巨鹿与入关', '鸿门之会', '楚汉相争', '垓下终局'],
    introTitle: '从鸿门，走进楚汉', introDescription: '顺着《史记》的本纪与列传，观察选择如何改变局势。',
    guideId: 'shiji-intro',
  },
];

export function topicById(value: unknown): Topic | undefined {
  return topics.find(topic => topic.id === value);
}

export const DEFAULT_TOPIC = topics[0];

// Older bundled records and saved views did not carry a topic ID.
export const entityTopic = (entity: Entity): TopicId => entity.topicId ?? 'three-kingdoms';
export const relationTopic = (relation: Relation): TopicId => relation.topicId ?? 'three-kingdoms';
export const sourceTopic = (source: Source): TopicId => source.topicId ?? 'three-kingdoms';
export const guideTopic = (guide: Guide): TopicId => guide.topicId ?? 'three-kingdoms';

export function formatYear(year: number): string {
  return year < 0 ? `公元前 ${Math.abs(year)} 年` : `公元 ${year} 年`;
}

export function formatYearRange(start: number, end: number): string {
  if (start === end) return formatYear(start);
  if (start < 0 && end < 0) return `公元前 ${Math.abs(start)}—${Math.abs(end)} 年`;
  if (start > 0 && end > 0) return `公元 ${start}—${end} 年`;
  return `${formatYear(start)} — ${formatYear(end)}`;
}
