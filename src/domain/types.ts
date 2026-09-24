export type EntityKind = 'person' | 'event';
export type Group = 'wu' | 'shu' | 'wei' | 'neutral';
export type RelationCategory = 'military' | 'political' | 'family' | 'influence';
export interface Action {
  id: string;
  title: string;
  year: number;
  eventId: string;
  role: string;
  description: string;
  sourceIds: string[];
}
export interface Entity {
  id: string;
  name: string;
  aliases: string[];
  kind: EntityKind;
  group: Group;
  role: string;
  period: string;
  start: number;
  end: number;
  summary: string;
  description: string;
  actions: Action[];
  sourceIds: string[];
}
export interface Relation {
  id: string;
  source: string;
  target: string;
  label: string;
  category: RelationCategory;
  evidence: 'record' | 'interpretation';
  start: number | null;
  end: number | null;
  uncertain?: boolean;
  context: string;
  sourceIds: string[];
}
export interface Source {
  id: string;
  title: string;
  section: string;
  url: string;
  note: string;
}
export interface GuideStep { title: string; question: string; entityId: string; description: string }
export interface Guide { id: string; title: string; subtitle: string; duration: string; steps: GuideStep[] }
export type Vec3 = [number, number, number];
export interface CameraSnapshot { position: Vec3; target: Vec3 }
export interface SpatialSnapshot { positions: Record<string, Vec3>; camera: CameraSnapshot }
export interface GraphView {
  nodes: Entity[];
  relations: Relation[];
  contextIds: string[];
  centerId: string;
  selectedId: string | null;
  relationId: string | null;
}
export interface SceneOptions {
  onSelect: (id: string) => void;
  onRelation: (id: string) => void;
  onCameraChange?: () => void;
  onError: (message: string) => void;
  onReady?: () => void;
}
export interface SceneController {
  setGraph: (view: GraphView, spatial?: SpatialSnapshot) => void;
  getSnapshot: () => SpatialSnapshot;
  fit: () => void;
  resetCamera: () => void;
  zoom: (factor: number) => void;
  focus: (id: string) => void;
  setQuality: (quality: 'low' | 'medium' | 'high') => void;
  setMotion: (enabled: boolean) => void;
  setRotateMode: (enabled: boolean) => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
}
