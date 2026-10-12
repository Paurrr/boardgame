import type { Difficulty } from '../../../lib/difficulty';
import { PIECES } from './pieces';
import { cellKey, normalize, shapeSize } from './shape';
import { flipOrientation, orient, rotateOrientation } from './transform';
import type { BoardArea, Cell, Placement, PlaceMode } from './types';

/** 퍼즐판에서 목표 바운딩박스 바깥에 두는 여유 칸 수 */
export const BOARD_MARGIN: Record<Difficulty, number> = { easy: 0, normal: 2, hard: 2 };

export function placeModeOf(difficulty: Difficulty): PlaceMode {
  return difficulty === 'easy' ? 'inside' : 'free';
}

export function placedCells(p: Placement): Cell[] {
  return orient(PIECES[p.pieceId].cells, p.orientation).map((c) => ({ x: c.x + p.at.x, y: c.y + p.at.y }));
}

export function boardAreaFor(target: readonly Cell[], difficulty: Difficulty): BoardArea {
  const m = BOARD_MARGIN[difficulty];
  const norm = normalize(target);
  const { w, h } = shapeSize(norm);
  return { width: w + 2 * m, height: h + 2 * m, target: norm.map((c) => ({ x: c.x + m, y: c.y + m })) };
}

/** others에는 지금 옮기는 조각을 빼고 넘긴다 */
export function canPlace(area: BoardArea, others: readonly Placement[], p: Placement, mode: PlaceMode): boolean {
  const targetSet = new Set(area.target.map(cellKey));
  const occupied = new Set<string>();
  for (const o of others) for (const c of placedCells(o)) occupied.add(cellKey(c));
  for (const c of placedCells(p)) {
    if (c.x < 0 || c.y < 0 || c.x >= area.width || c.y >= area.height) return false;
    const k = cellKey(c);
    if (occupied.has(k)) return false;
    if (mode === 'inside' && !targetSet.has(k)) return false;
  }
  return true;
}

/** 목표 칸을 전부 덮고, 목표 밖에 놓인 칸이 하나도 없으면 정답 */
export function isSolved(target: readonly Cell[], placements: readonly Placement[]): boolean {
  const targetSet = new Set(target.map(cellKey));
  const covered = new Set<string>();
  for (const p of placements) {
    for (const c of placedCells(p)) {
      const k = cellKey(c);
      if (!targetSet.has(k)) return false;
      covered.add(k);
    }
  }
  return covered.size === targetSet.size;
}

/** 시계방향으로 돌리되 조각 가운데가 제자리에 머물게 at을 보정한다 (네 번 돌리면 원위치) */
export function rotatePlacement(p: Placement): Placement {
  const shape = PIECES[p.pieceId].cells;
  const orientation = rotateOrientation(p.orientation);
  const before = shapeSize(orient(shape, p.orientation));
  const after = shapeSize(orient(shape, orientation));
  return {
    pieceId: p.pieceId,
    orientation,
    at: {
      x: p.at.x + Math.trunc((before.w - after.w) / 2),
      y: p.at.y + Math.trunc((before.h - after.h) / 2),
    },
  };
}

/** 뒤집어도 바운딩박스 크기는 같으므로 at은 그대로 */
export function flipPlacement(p: Placement): Placement {
  return { pieceId: p.pieceId, orientation: flipOrientation(p.orientation), at: p.at };
}
