import type { Entity, Relation, Source, Guide } from './types';
import { fullShijiEntities, fullShijiRelations } from './shiji-full-data';
import { shijiChapters } from './shiji-book';
import { shijiSources } from './shiji-data';

export const CONTENT_VERSION = 'shiji-only-2026-09-29';
export const entities: Entity[] = fullShijiEntities;
export const relations: Relation[] = fullShijiRelations;
export const sources: Source[] = shijiChapters.map(chapter => ({
  id: chapter.sourceId, topicId: 'shiji', title: '《史记》',
  section: `卷 ${chapter.volume} · ${chapter.title}`, url: chapter.sourceUrl,
  note: shijiSources.find(source => source.id === chapter.sourceId)?.note ?? '维基文库原文转录，已收录站内全文；包含编者小节和校勘记，可与原页互校。',
}));
// Kept as an empty compatibility surface for old browser records; the product has no guided tours.
export const guides: Guide[] = [];
