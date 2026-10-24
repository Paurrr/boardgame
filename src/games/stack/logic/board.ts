import { heightOf, key3 } from './rotate';
import { MAX_H } from './types';
import type { Area, Cell2, Placed, StackPieceId, Vec3 } from './types';

const key2 = (x: number, y: number): string => `${x},${y}`;

const cubesOf = (p: Placed): Vec3[] => p.cells.map((c) => ({ x: p.at.x + c.x, y: p.at.y + c.y, z: p.at.z + c.z }));

/** (ax, ay)에서 위로부터 떨어뜨렸을 때 멈추는 높이. 기둥마다 가장 높은 정육면체 위에 닿는다 */
export function dropZ(cells: Vec3[], ax: number, ay: number, others: Placed[]): number {
  const tops = new Map<string, number>();
  for (const p of others) {
    for (const c of cubesOf(p)) {
      const k = key2(c.x, c.y);
      tops.set(k, Math.max(tops.get(k) ?? -1, c.z));
    }
  }
  let z = 0;
  for (const c of cells) {
    const top = tops.get(key2(ax + c.x, ay + c.y));
    if (top !== undefined) z = Math.max(z, top + 1 - c.z);
  }
  return z;
}

/** (ax, ay)에 떨어뜨린 자리. 높이 제한을 넘거나, inside면 target 밖, 아니면 바운딩박스 밖이 하나라도 있으면 null */
export function landing(area: Area, others: Placed[], cells: Vec3[], ax: number, ay: number): Vec3 | null {
  const z = dropZ(cells, ax, ay, others);
  if (z + heightOf(cells) > MAX_H) return null;
  const target = new Set(area.target.map(key3));
  for (const c of cells) {
    const p = { x: ax + c.x, y: ay + c.y, z: z + c.z };
    const ok = area.inside
      ? target.has(key3(p))
      : p.x >= 0 && p.y >= 0 && p.x < area.width && p.y < area.depth;
    if (!ok) return null;
  }
  return { x: ax, y: ay, z };
}

/** 같은 기둥에서 이 조각보다 높은 곳에 다른 조각이 있으면 들 수 없다 */
export function canLift(placed: Placed[], id: StackPieceId): boolean {
  const lowest = new Map<string, number>();
  for (const p of placed) {
    if (p.id !== id) continue;
    for (const c of cubesOf(p)) {
      const k = key2(c.x, c.y);
      lowest.set(k, Math.min(lowest.get(k) ?? Infinity, c.z));
    }
  }
  for (const p of placed) {
    if (p.id === id) continue;
    for (const c of cubesOf(p)) {
      const low = lowest.get(key2(c.x, c.y));
      if (low !== undefined && c.z > low) return false;
    }
  }
  return true;
}

/** 놓인 정육면체 집합이 target 집합과 같으면 정답 */
export function isSolved(area: Area, placed: Placed[]): boolean {
  const target = new Set(area.target.map(key3));
  const filled = new Set<string>();
  let count = 0;
  for (const p of placed) {
    for (const c of cubesOf(p)) {
      const k = key3(c);
      if (!target.has(k)) return false;
      filled.add(k);
      count++;
    }
  }
  return count === filled.size && filled.size === target.size;
}

/** target의 바닥 칸 (처음 나온 순서, 중복 없음) */
export function footprintOf(target: Vec3[]): Cell2[] {
  const out = new Map<string, Cell2>();
  for (const t of target) {
    const k = key2(t.x, t.y);
    if (!out.has(k)) out.set(k, { x: t.x, y: t.y });
  }
  return [...out.values()];
}
