import type { Cell, PieceId } from './types';

export type PieceDef = { id: PieceId; cells: Cell[]; color: string };

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

/** 자체 정의 폴리오미노 10종. 색은 docs/UI_GUIDE.md 조각 색 */
export const PIECES: Record<PieceId, PieceDef> = {
  I3: { id: 'I3', color: '#D9442E', cells: cells([[0, 0], [1, 0], [2, 0]]) },
  L3: { id: 'L3', color: '#F2B53A', cells: cells([[0, 0], [0, 1], [1, 1]]) },
  I4: { id: 'I4', color: '#2A6FD0', cells: cells([[0, 0], [1, 0], [2, 0], [3, 0]]) },
  O4: { id: 'O4', color: '#EA8A26', cells: cells([[0, 0], [1, 0], [0, 1], [1, 1]]) },
  T4: { id: 'T4', color: '#2E9E55', cells: cells([[0, 0], [1, 0], [2, 0], [1, 1]]) },
  L4: { id: 'L4', color: '#DE5A97', cells: cells([[0, 0], [0, 1], [0, 2], [1, 2]]) },
  S4: { id: 'S4', color: '#1FA3A0', cells: cells([[1, 0], [2, 0], [0, 1], [1, 1]]) },
  P5: { id: 'P5', color: '#8A5A3B', cells: cells([[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]) },
  L5: { id: 'L5', color: '#8DBB2E', cells: cells([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]) },
  U5: { id: 'U5', color: '#22507C', cells: cells([[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) },
};

export const PIECE_IDS: readonly PieceId[] = ['I3', 'L3', 'I4', 'O4', 'T4', 'L4', 'S4', 'P5', 'L5', 'U5'];

export const PENTOMINO_IDS: readonly PieceId[] = ['P5', 'L5', 'U5'];

export const SMALL_PIECE_IDS: readonly PieceId[] = PIECE_IDS.filter((id) => !PENTOMINO_IDS.includes(id));

/** 어떤 조각이든 어느 방향으로 돌려도 이 크기의 정사각형 안에 들어간다 */
export const MAX_PIECE_EXTENT = 4;
