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
    id: 'shiji', title: '史记 · 全书星图', shortTitle: '史记全书', eraLabel: '上古—西汉 · 130 卷',
    sourceWork: '《史记》', minYear: -841, maxYear: -1, centerId: 'shiji-hongmen',
    ticks: [
      { year: -841, label: '共和' }, { year: -770, label: '东周' }, { year: -551, label: '孔子' },
      { year: -403, label: '战国' }, { year: -221, label: '秦统一' },
      { year: -206, label: '楚汉', important: true }, { year: -141, label: '汉武帝' }, { year: -29, label: '后续补记' },
    ],
    periods: ['西周', '春秋', '战国', '秦汉', '西汉'],
    introTitle: '从鸿门，走进史记', introDescription: '130 卷原文与全书星图；上古和不确定纪年通过“时间待考”探索。',
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
