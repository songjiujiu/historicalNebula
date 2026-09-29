import raw from './generated/shiji-graph.json?raw';
import report from './generated/shiji-graph-report.json';
import type { Entity, EntityKind, Relation, RelationCategory } from './types';
import { shijiEntities, shijiRelations } from './shiji-data';

type PackedNode = [number, number, number[], number, number, number, number | null, number | null, number, number, number[], number, string];
type PackedEdge = [number, number, number, number, number, number, number | null, number | null, number, number[], number];
const packed = JSON.parse(raw) as { strings: string[]; nodes: PackedNode[]; relations: PackedEdge[] };
const str = (id: number) => packed.strings[id];
const kinds: EntityKind[] = ['person', 'event', 'chapter'];
const categories: RelationCategory[] = ['military', 'political', 'family', 'influence', 'textual'];
const evidence: Relation['evidence'][] = ['record', 'interpretation', 'index'];
const graph: { nodes: Entity[]; relations: Relation[] } = {
  nodes: packed.nodes.map(n => ({ id: str(n[0]), topicId: 'shiji', name: str(n[1]), aliases: n[2].map(str), kind: kinds[n[3]], group: 'neutral', role: str(n[4]), period: str(n[5]), start: n[6], end: n[7], summary: str(n[8]), description: str(n[9]), sourceIds: n[10].map(str), dateUncertain: !!n[11], readingBlock: n[12] || undefined, imported: true, actions: [] })),
  relations: packed.relations.map(e => ({ id: str(e[0]), topicId: 'shiji', source: str(e[1]), target: str(e[2]), label: str(e[3]), category: categories[e[4]], evidence: evidence[e[5]], start: e[6], end: e[7], context: str(e[8]), sourceIds: e[9].map(str), uncertain: !!e[10], imported: true })),
};
export const shijiGraphReport = report;
const indexed = new Map(graph.nodes.map(node => [node.id, node]));
// Preserve published identifiers and hand-edited actions, while adding full-book citations/aliases.
const curated = shijiEntities.map(entity => {
  const full = indexed.get(entity.id);
  return full ? { ...entity, start: null, end: null, period: '全书人物 · 已整理楚汉行动', aliases: [...new Set([...entity.aliases, ...full.aliases])], sourceIds: [...new Set([...entity.sourceIds, ...full.sourceIds])] } : entity;
});
const curatedIds = new Set(curated.map(e => e.id));
export const fullShijiEntities: Entity[] = [...curated, ...graph.nodes.filter(node => !curatedIds.has(node.id))];
export const fullShijiRelations: Relation[] = [...shijiRelations, ...graph.relations];
