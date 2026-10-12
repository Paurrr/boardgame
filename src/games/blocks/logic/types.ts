export type Cell = { x: number; y: number };

export type PieceId = 'I3' | 'L3' | 'I4' | 'O4' | 'T4' | 'L4' | 'S4' | 'P5' | 'L5' | 'U5';

export type Rotation = 0 | 1 | 2 | 3;

/** 기본 모양에 (뒤집기 →) 시계방향 90° × rotation 순서로 적용한다 */
export type Orientation = { rotation: Rotation; flipped: boolean };

/** at = 방향을 적용해 정규화한 모양의 (0,0) 칸이 놓이는 판 좌표 */
export type Placement = { pieceId: PieceId; orientation: Orientation; at: Cell };

/** inside: 목표 모양 안에만 놓임(쉬움), free: 판 격자 안이면 어디든(보통·어려움) */
export type PlaceMode = 'inside' | 'free';

/** target은 (0,0) 기준으로 정규화돼 있고, solution은 target 좌표계다 */
export type Puzzle = { target: Cell[]; pieceIds: PieceId[]; solution: Placement[] };

/** 퍼즐판 격자 = 목표 바운딩박스 + 사방 여유 칸. target은 판 좌표다 */
export type BoardArea = { width: number; height: number; target: Cell[] };
