import type { Rng } from '../../../lib/random';
import { dropZ } from './board';
import { STACK_PIECES } from './pieces';
import { heightOf, key3, orientations } from './rotate';
import { MAX_H } from './types';
import type { Cell2, Placed, StackPieceId, Vec3 } from './types';

/**
 * 백트래킹으로 footprint × 2층을 ids로 빈틈없이 채우는 배치를 찾는다. 없으면 null.
 * 1탄 solver.ts와 같은 방식 — 아직 비어 있는 칸 중 (z, y, x) 순서로 가장 앞 칸은
 * 그 칸을 덮는 조각의 (z, y, x) 순서상 첫 칸이어야 한다. rng가 있으면 조각·방향 순서를 섞는다.
 */
export function solveStack(footprint: Cell2[], ids: StackPieceId[], rng?: Rng): Placed[] | null {
  const order: Vec3[] = [];
  for (let z = 0; z < MAX_H; z++) for (const f of footprint) order.push({ x: f.x, y: f.y, z });
  let total = 0;
  for (const id of ids) total += STACK_PIECES[id].cells.length;
  if (total !== order.length) return null;

  order.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  const targetSet = new Set(order.map(key3));
  const shuffle = <T>(xs: T[]): T[] => (rng ? rng.shuffle(xs) : xs);
  // 정규화한 방향은 (z, y, x) 순으로 정렬돼 있어 cells[0]이 기준점이다
  const shapes = ids.map((id) => shuffle(orientations(STACK_PIECES[id].cells).filter((o) => heightOf(o) <= MAX_H)));
  const pieceOrder = shuffle(ids.map((_, i) => i));
  const filled = new Set<string>();
  const used = ids.map(() => false);
  const result: Placed[] = [];

  const firstEmpty = (): Vec3 | null => {
    for (const c of order) if (!filled.has(key3(c))) return c;
    return null;
  };

  const search = (): boolean => {
    const cell = firstEmpty();
    if (!cell) return true;
    for (const i of pieceOrder) {
      if (used[i]) continue;
      for (const cells of shapes[i]) {
        const anchor = cells[0];
        const at = { x: cell.x - anchor.x, y: cell.y - anchor.y, z: cell.z - anchor.z };
        const keys = cells.map((c) => key3({ x: c.x + at.x, y: c.y + at.y, z: c.z + at.z }));
        if (!keys.every((k) => targetSet.has(k) && !filled.has(k))) continue;
        for (const k of keys) filled.add(k);
        used[i] = true;
        result.push({ id: ids[i], cells, at });
        if (search()) return true;
        result.pop();
        used[i] = false;
        for (const k of keys) filled.delete(k);
      }
    }
    return false;
  };

  return search() ? result.slice() : null;
}

/** 모든 순서 (n!개) */
export function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs.slice()];
  const out: T[][] = [];
  xs.forEach((x, i) => {
    for (const rest of permutations([...xs.slice(0, i), ...xs.slice(i + 1)])) out.push([x, ...rest]);
  });
  return out;
}

/** 어떤 순서로든 위에서 떨어뜨리기만으로 정답 배치를 지을 수 있는가 */
export function buildable(solution: Placed[]): boolean {
  return permutations(solution).some((order) => {
    const placed: Placed[] = [];
    for (const p of order) {
      if (dropZ(p.cells, p.at.x, p.at.y, placed) !== p.at.z) return false;
      placed.push(p);
    }
    return true;
  });
}
