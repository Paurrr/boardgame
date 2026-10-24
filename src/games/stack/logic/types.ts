export type Vec3 = { x: number; y: number; z: number };

export type Cell2 = { x: number; y: number };

export type StackPieceId = 'I3' | 'L3' | 'I4' | 'O4' | 'T4' | 'L4' | 'S4' | 'Y4' | 'R4' | 'Q4';

/** width×depth = 바닥 바운딩박스(여유 칸 없음). target = 채워야 할 3D 칸. inside = 쉬움 놓기 방식 */
export type Area = { width: number; depth: number; target: Vec3[]; inside: boolean };

/** at = 정규화한 cells의 (0,0,0)이 놓이는 판 좌표 */
export type Placed = { id: StackPieceId; cells: Vec3[]; at: Vec3 };

/** pieces = 트레이 순서와 처음 방향 */
export type Puzzle = { area: Area; pieces: { id: StackPieceId; cells: Vec3[] }[]; solution: Placed[] };

/** 쌓을 수 있는 높이(층 수) */
export const MAX_H = 2;
