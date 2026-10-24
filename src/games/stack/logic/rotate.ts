import type { Vec3 } from './types';

export const key3 = (c: Vec3): string => `${c.x},${c.y},${c.z}`;

const shapeKey = (cells: Vec3[]): string => cells.map(key3).join(' ');

/** 최소 좌표를 0으로 옮기고 (z, y, x) 순으로 정렬한다 */
export function normalize(cells: Vec3[]): Vec3[] {
  const mx = Math.min(...cells.map((c) => c.x));
  const my = Math.min(...cells.map((c) => c.y));
  const mz = Math.min(...cells.map((c) => c.z));
  // + 0: 회전에서 생긴 -0을 0으로 (toEqual이 둘을 구분한다)
  return cells
    .map((c) => ({ x: c.x - mx + 0, y: c.y - my + 0, z: c.z - mz + 0 }))
    .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
}

/** 옆으로 돌리기: z축 둘레 +90° */
export function rotZ(cells: Vec3[]): Vec3[] {
  return normalize(cells.map((c) => ({ x: -c.y, y: c.x, z: c.z })));
}

/** 정수 단위 축 k 둘레 +90°(오른손). v' = k × v + (k·v)k */
export function rotateAbout(cells: Vec3[], k: Vec3): Vec3[] {
  return normalize(
    cells.map((v) => {
      const dot = k.x * v.x + k.y * v.y + k.z * v.z;
      return {
        x: k.y * v.z - k.z * v.y + dot * k.x,
        y: k.z * v.x - k.x * v.z + dot * k.y,
        z: k.x * v.y - k.y * v.x + dot * k.z,
      };
    }),
  );
}

const X_AXIS: Vec3 = { x: 1, y: 0, z: 0 };

/** 돌리기만으로 나오는 서로 다른 방향(정규화, 첫째는 원래 모양). zOnly면 옆으로 돌리기만 */
export function orientations(cells: Vec3[], zOnly = false): Vec3[][] {
  const seen = new Set<string>();
  const out: Vec3[][] = [];
  const queue = [normalize(cells)];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i];
    const k = shapeKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    queue.push(rotZ(c));
    if (!zOnly) queue.push(rotateAbout(c, X_AXIS));
  }
  return out;
}

/** 정규화된 cells 기준 층 수 */
export function heightOf(cells: Vec3[]): number {
  return Math.max(...cells.map((c) => c.z)) + 1;
}

/** 정규화된 cells 기준 바닥 너비(x)·깊이(y) */
export function sizeOf(cells: Vec3[]): { w: number; d: number } {
  return { w: Math.max(...cells.map((c) => c.x)) + 1, d: Math.max(...cells.map((c) => c.y)) + 1 };
}

/** 정규화된 cells를 감싸는 상자의 중심 */
export function centerOf(cells: Vec3[]): Vec3 {
  const { w, d } = sizeOf(cells);
  return { x: w / 2, y: d / 2, z: heightOf(cells) / 2 };
}
