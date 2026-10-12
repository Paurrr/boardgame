import { PIECES } from './pieces';
import { cellKey } from './shape';
import { orient, uniqueOrientations } from './transform';
import type { Cell, PieceId, Placement } from './types';

/**
 * 백트래킹으로 target을 pieceIds로 빈틈없이 채우는 배치를 찾는다. 없으면 null.
 * 생성기 검증용 — 아직 비어 있는 칸 중 (y, x) 순서로 가장 앞 칸은
 * 그 칸을 덮는 조각의 (y, x) 순서상 첫 칸이어야 한다는 점을 이용한다.
 */
export function solve(target: readonly Cell[], pieceIds: readonly PieceId[], allowFlip: boolean): Placement[] | null {
  const targetSet = new Set(target.map(cellKey));
  let total = 0;
  for (const id of pieceIds) total += PIECES[id].cells.length;
  if (total !== targetSet.size) return null;

  const order = target.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const shapes = pieceIds.map((id) =>
    uniqueOrientations(PIECES[id].cells, allowFlip).map((o) => ({ o, cells: orient(PIECES[id].cells, o) })),
  );
  const filled = new Set<string>();
  const used = pieceIds.map(() => false);
  const result: Placement[] = [];

  const firstEmpty = (): Cell | null => {
    for (const c of order) if (!filled.has(cellKey(c))) return c;
    return null;
  };

  const search = (): boolean => {
    const cell = firstEmpty();
    if (!cell) return true;
    for (let i = 0; i < pieceIds.length; i++) {
      if (used[i]) continue;
      for (const { o, cells } of shapes[i]) {
        const anchor = cells[0];
        const at = { x: cell.x - anchor.x, y: cell.y - anchor.y };
        const keys = cells.map((c) => cellKey({ x: c.x + at.x, y: c.y + at.y }));
        if (!keys.every((k) => targetSet.has(k) && !filled.has(k))) continue;
        for (const k of keys) filled.add(k);
        used[i] = true;
        result.push({ pieceId: pieceIds[i], orientation: o, at });
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
