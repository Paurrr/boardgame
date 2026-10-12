import { canPlace, flipPlacement, isSolved, rotatePlacement } from './board';
import { flipOrientation, rotateOrientation } from './transform';
import type { BoardArea, Cell, Orientation, PieceId, Placement, PlaceMode } from './types';

/** 플레이어 칸 하나의 조각 상태. at이 null이면 트레이에 있다 */
export type PieceState = { pieceId: PieceId; orientation: Orientation; at: Cell | null };

export function initialPieces(pieceIds: readonly PieceId[]): PieceState[] {
  return pieceIds.map((pieceId) => ({ pieceId, orientation: { rotation: 0, flipped: false }, at: null }));
}

/** 판 위에 놓인 조각들 (except는 제외) */
export function placementsOf(pieces: readonly PieceState[], except?: PieceId): Placement[] {
  const out: Placement[] = [];
  for (const p of pieces) {
    if (p.at && p.pieceId !== except) out.push({ pieceId: p.pieceId, orientation: p.orientation, at: p.at });
  }
  return out;
}

function find(pieces: readonly PieceState[], pieceId: PieceId): PieceState {
  const piece = pieces.find((p) => p.pieceId === pieceId);
  if (!piece) throw new Error('없는 조각: ' + pieceId);
  return piece;
}

/** next.at이 있으면 놓기 규칙을 검사하고, 안 되면 트레이(at: null)로 보낸다 */
function settle(pieces: readonly PieceState[], next: PieceState, area: BoardArea, mode: PlaceMode): PieceState[] {
  let settled = next;
  if (next.at) {
    const placement = { pieceId: next.pieceId, orientation: next.orientation, at: next.at };
    if (!canPlace(area, placementsOf(pieces, next.pieceId), placement, mode)) settled = { ...next, at: null };
  }
  return pieces.map((p) => (p.pieceId === next.pieceId ? settled : p));
}

export function dropPiece(
  pieces: readonly PieceState[],
  pieceId: PieceId,
  at: Cell | null,
  area: BoardArea,
  mode: PlaceMode,
): PieceState[] {
  return settle(pieces, { ...find(pieces, pieceId), at }, area, mode);
}

export function rotatePiece(pieces: readonly PieceState[], pieceId: PieceId, area: BoardArea, mode: PlaceMode): PieceState[] {
  const cur = find(pieces, pieceId);
  if (!cur.at) return settle(pieces, { ...cur, orientation: rotateOrientation(cur.orientation) }, area, mode);
  const r = rotatePlacement({ pieceId, orientation: cur.orientation, at: cur.at });
  return settle(pieces, { pieceId, orientation: r.orientation, at: r.at }, area, mode);
}

export function flipPiece(pieces: readonly PieceState[], pieceId: PieceId, area: BoardArea, mode: PlaceMode): PieceState[] {
  const cur = find(pieces, pieceId);
  if (!cur.at) return settle(pieces, { ...cur, orientation: flipOrientation(cur.orientation) }, area, mode);
  const f = flipPlacement({ pieceId, orientation: cur.orientation, at: cur.at });
  return settle(pieces, { pieceId, orientation: f.orientation, at: f.at }, area, mode);
}

export function piecesSolved(pieces: readonly PieceState[], area: BoardArea): boolean {
  return isSolved(area.target, placementsOf(pieces));
}
