import type { Entity, Vec3 } from '../domain/types';

/** Layout coordinates express exploration space, never dates or geography. */
export function createLayout(nodes: Entity[], centerId: string, previous: Record<string, Vec3> = {}): Record<string, Vec3> {
  const positions: Record<string, Vec3> = {};
  const neighbors = nodes.filter(node => node.id !== centerId).sort((a, b) => a.id.localeCompare(b.id));
  if (nodes.some(node => node.id === centerId)) positions[centerId] = [0, 0, 0];
  for (const node of neighbors) if (validVector(previous[node.id])) positions[node.id] = [...previous[node.id]];
  neighbors.forEach((node, index) => {
    const old = previous[node.id];
    if (validVector(old)) return;
    const ring = Math.floor(index / 9);
    const count = Math.min(9, neighbors.length - ring * 9);
    const seed = hash(`${centerId}/${node.id}`);
    const angle = ((index % 9) / count) * Math.PI * 2 + Math.PI / 2 + ring * 0.34;
    const radius = 44 + ring * 26 + (seed % 7);
    const point: Vec3 = [Math.cos(angle) * radius * 1.32, Math.sin(angle) * radius * 0.91, ((seed >>> 8) % 25) - 12];
    // Only new arrivals move when the graph expands.
    for (let iteration = 0; iteration < 20; iteration++) {
      let moved = false;
      for (const neighbor of Object.values(positions)) {
        const dx = point[0] - neighbor[0];
        const dy = point[1] - neighbor[1];
        const distance = Math.hypot(dx, dy);
        if (distance < 22) {
          const direction = distance > 0.01 ? Math.atan2(dy, dx) : angle;
          point[0] += Math.cos(direction) * (22 - distance);
          point[1] += Math.sin(direction) * (22 - distance);
          moved = true;
        }
      }
      if (!moved) break;
    }
    positions[node.id] = point;
  });
  return positions;
}

export function validVector(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(number => typeof number === 'number' && Number.isFinite(number) && Math.abs(number) <= 10000);
}

export function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) result = Math.imul(result ^ value.charCodeAt(index), 16777619);
  return result >>> 0;
}
