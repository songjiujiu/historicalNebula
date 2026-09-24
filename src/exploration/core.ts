import { entities, relations, sources } from '../domain/data';
import type { Entity, GraphView, Relation, RelationCategory, SpatialSnapshot, Vec3 } from '../domain/types';

export interface ExploreState {
  centerId: string;
  selectedId: string | null;
  relationId: string | null;
  fromYear: number;
  toYear: number;
  categories: RelationCategory[];
  showUndated: boolean;
  viewMode: 'graph3d' | 'list';
  expandedIds: string[];
  fullId: string | null;
  sourceId: string | null;
  spatial?: SpatialSnapshot;
}

const ALL_CATEGORIES: RelationCategory[] = ['military', 'political', 'family', 'influence'];
const MIN_YEAR = 184;
const MAX_YEAR = 280;
const DEFAULT_NEIGHBORS = 12;
const MAX_NODES = 50;

export const DEFAULT_STATE: ExploreState = {
  centerId: 'chibi', selectedId: 'chibi', relationId: null,
  fromYear: MIN_YEAR, toYear: MAX_YEAR,
  categories: ['military', 'political', 'influence'],
  showUndated: false, viewMode: 'graph3d', expandedIds: [],
  fullId: null, sourceId: null,
};

export function entityById(id: string): Entity | undefined {
  return entities.find((entity) => entity.id === id);
}

export function relationById(id: string): Relation | undefined {
  return relations.find((relation) => relation.id === id);
}

/** Missing dates are never interpreted as an open-ended historical interval. */
export function relationMatches(relation: Relation, state: ExploreState): boolean {
  if (!state.categories.includes(relation.category)) return false;
  if (relation.start === null || relation.end === null) return state.showUndated;
  if (relation.uncertain && !state.showUndated) return false;
  return relation.start <= relation.end && relation.start <= state.toYear && relation.end >= state.fromYear;
}

/** Stable data order doubles as the editorial order; selecting never moves the center. */
export function buildGraph(input: ExploreState): GraphView {
  const state = sanitizeState(input);
  const matching = relations.filter((relation) =>
    relationMatches(relation, state) && entityById(relation.source) && entityById(relation.target));
  const selectedRelation = state.relationId ? relationById(state.relationId) : undefined;
  const included = new Set<string>();
  const add = (id: string, limit = MAX_NODES) => {
    if (included.size < limit && entityById(id)) included.add(id);
  };
  add(state.centerId);
  const priorityIds = [state.centerId, state.selectedId, selectedRelation?.source, selectedRelation?.target]
    .filter((id): id is string => typeof id === 'string' && !!entityById(id));
  const baseBudget = DEFAULT_NEIGHBORS + 1;
  for (const relation of matching) {
    if (relation.source === state.centerId) add(relation.target, baseBudget);
    if (relation.target === state.centerId) add(relation.source, baseBudget);
  }
  // Replay only reachable expansions; an arbitrary saved ID cannot import a remote cluster.
  const pending = new Set(state.expandedIds);
  let progressed = true;
  while (progressed && pending.size > 0 && included.size < MAX_NODES) {
    progressed = false;
    for (const id of pending) {
      if (!included.has(id)) {
        // An explicitly requested expansion can start from a retained reference node.
        if (!priorityIds.includes(id)) continue;
        add(id);
      }
      pending.delete(id);
      progressed = true;
      for (const relation of matching) {
        if (relation.source === id) add(relation.target);
        if (relation.target === id) add(relation.source);
      }
    }
  }
  // Selecting an already visible node must not change the previous node set.
  // Missing shared selections/endpoints replace only the last unprotected entries.
  const budget = Math.min(MAX_NODES, Math.max(baseBudget, included.size));
  for (const id of priorityIds) {
    if (included.has(id)) continue;
    if (included.size >= budget) {
      const replaceable = Array.from(included).reverse().find((candidate) => !priorityIds.includes(candidate));
      if (replaceable) included.delete(replaceable);
    }
    add(id, budget);
  }
  const nodes = Array.from(included).map((id) => entityById(id)!);
  const visibleRelations = matching.filter((relation) =>
    included.has(relation.source) && included.has(relation.target));
  const activeIds = new Set(visibleRelations.flatMap((relation) => [relation.source, relation.target]));
  const contextIds = nodes.filter((entity) =>
    entity.start > state.toYear || entity.end < state.fromYear || !activeIds.has(entity.id)
  ).map((entity) => entity.id);
  return {
    nodes, relations: visibleRelations, contextIds,
    centerId: state.centerId, selectedId: state.selectedId, relationId: state.relationId,
  };
}

// Explicit character normalization supports common historical names without fuzzy substitutions.
const TRADITIONAL = '劉備孫權瑜諸葛趙雲張飛關羽曹操黃蓋魯肅呂蒙陸遜龐統漢獻帝董卓袁紹術馬超騰魏蜀吳戰爭赤壁官渡夷陵長坂黃巾討伐聯盟師親屬傳統風雲東吳孟德玄德仲謀孔明公瑾鳳雛臥龍銅雀臺華容道荊州營軍潼臧儁讓穎璋曄寧興歸烏襲奪議劃';
const SIMPLIFIED  = '刘备孙权瑜诸葛赵云张飞关羽曹操黄盖鲁肃吕蒙陆逊庞统汉献帝董卓袁绍术马超腾魏蜀吴战争赤壁官渡夷陵长坂黄巾讨伐联盟师亲属传统风云东吴孟德玄德仲谋孔明公瑾凤雏卧龙铜雀台华容道荆州营军潼臧俊让颖璋晔宁兴归乌袭夺议划';
const charMap = new Map(Array.from(TRADITIONAL).map((char, index) => [char, SIMPLIFIED[index]]));
const normalize = (value: string) => Array.from(value.normalize('NFKC').toLocaleLowerCase())
  .map((char) => charMap.get(char) ?? char).join('').replace(/\s+/g, '').trim();

export function searchEntities(query: string): Entity[] {
  const needle = normalize(query.slice(0, 200));
  if (!needle) return [];
  const result = entities.map((entity, order) => {
    const names = [entity.name, ...entity.aliases].map(normalize);
    const rank = names.some((name) => name === needle) ? 0
      : names.some((name) => name.startsWith(needle)) ? 1
      : names.some((name) => name.includes(needle)) ? 2 : -1;
    return { entity, order, rank };
  }).filter(({ rank }) => rank >= 0).sort((a, b) => a.rank - b.rank || a.order - b.order);
  const seen = new Set<string>();
  return result.filter(({ entity }) => {
    if (seen.has(entity.id)) return false;
    seen.add(entity.id);
    return true;
  }).map(({ entity }) => entity);
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function validEntityId(value: unknown): string | null {
  return typeof value === 'string' && entityById(value) ? value : null;
}

function year(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value
    : typeof value === 'string' && /^\d{1,4}$/.test(value) ? Number(value) : NaN;
  return Number.isFinite(numeric) ? Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(numeric))) : fallback;
}

function vector(value: unknown): Vec3 | undefined {
  if (!Array.isArray(value) || value.length !== 3 || !value.every((number) =>
    typeof number === 'number' && Number.isFinite(number) && Math.abs(number) <= 1_000_000)) return undefined;
  return [value[0] as number, value[1] as number, value[2] as number];
}

function spatialSnapshot(value: unknown): SpatialSnapshot | undefined {
  const input = record(value);
  const camera = record(input.camera);
  const position = vector(camera.position);
  const target = vector(camera.target);
  if (!position || !target) return undefined;
  const positions: Record<string, Vec3> = {};
  for (const [id, coordinates] of Object.entries(record(input.positions)).slice(0, MAX_NODES)) {
    const point = vector(coordinates);
    if (validEntityId(id) && point) positions[id] = point;
  }
  return { positions, camera: { position, target } };
}

export function sanitizeState(input: unknown): ExploreState {
  const value = record(input);
  const centerId = validEntityId(value.centerId) ?? DEFAULT_STATE.centerId;
  const firstYear = year(value.fromYear, DEFAULT_STATE.fromYear);
  const lastYear = year(value.toYear, DEFAULT_STATE.toYear);
  const categoryInput = value.categories;
  const categories = Array.isArray(categoryInput)
    ? ALL_CATEGORIES.filter((category) => categoryInput.includes(category))
    : [...DEFAULT_STATE.categories];
  const expandedIds = Array.isArray(value.expandedIds)
    ? [...new Set(value.expandedIds.filter((id): id is string => validEntityId(id) !== null))].slice(0, MAX_NODES)
    : [];
  const spatial = spatialSnapshot(value.spatial);
  return {
    centerId,
    selectedId: value.selectedId === undefined ? centerId : validEntityId(value.selectedId),
    relationId: typeof value.relationId === 'string' && relationById(value.relationId) ? value.relationId : null,
    fromYear: Math.min(firstYear, lastYear), toYear: Math.max(firstYear, lastYear),
    categories, showUndated: value.showUndated === true,
    viewMode: value.viewMode === 'list' ? 'list' : 'graph3d',
    expandedIds, fullId: validEntityId(value.fullId),
    sourceId: typeof value.sourceId === 'string' && sources.some((source) => source.id === value.sourceId)
      ? value.sourceId : null,
    ...(spatial ? { spatial } : {}),
  };
}

export function shareUrl(input: ExploreState, baseUrl: string): string {
  const state = sanitizeState(input);
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.username = '';
  url.password = '';
  url.searchParams.set('center', state.centerId);
  // An empty selection is explicit, so opening a shared closed panel keeps it closed.
  url.searchParams.set('selected', state.selectedId ?? '');
  if (state.relationId) url.searchParams.set('relation', state.relationId);
  if (state.fullId) url.searchParams.set('entity', state.fullId);
  url.searchParams.set('from', String(state.fromYear));
  url.searchParams.set('to', String(state.toYear));
  url.searchParams.set('categories', state.categories.join(','));
  url.searchParams.set('undated', state.showUndated ? '1' : '0');
  url.searchParams.set('view', state.viewMode);
  return url.toString();
}

export function stateFromUrl(value: string): ExploreState | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const params = url.searchParams;
  const fullId = params.has('entity') ? validEntityId(params.get('entity')) : null;
  // An invalid requested detail must not silently fall back to another object.
  if (params.has('entity') && !fullId) return null;
  // A standalone detail link starts an exploration centered on that same object.
  const centerId = params.has('center') ? validEntityId(params.get('center')) : fullId;
  if (!centerId) return null;
  return sanitizeState({
    centerId,
    fullId,
    selectedId: params.has('selected') ? params.get('selected') : centerId,
    relationId: params.get('relation'),
    fromYear: params.get('from'), toYear: params.get('to'),
    categories: params.has('categories') ? params.get('categories')!.split(',') : undefined,
    showUndated: params.get('undated') === '1',
    viewMode: params.get('view'),
  });
}
