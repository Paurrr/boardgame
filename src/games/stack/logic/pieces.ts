import { PIECES } from '../../blocks/logic/pieces';
import type { StackPieceId, Vec3 } from './types';

export type StackPieceDef = { cells: Vec3[]; color: string };

type PlanarId = 'I3' | 'L3' | 'I4' | 'O4' | 'T4' | 'L4' | 'S4';

/** 1탄 평면 조각을 바닥(z = 0)에 눕힌 것 */
const planar = (id: PlanarId): StackPieceDef => ({
  cells: PIECES[id].cells.map((c) => ({ x: c.x, y: c.y, z: 0 })),
  color: PIECES[id].color,
});

const vecs = (list: [number, number, number][]): Vec3[] => list.map(([x, y, z]) => ({ x, y, z }));

/** 자체 정의 10종. 평면 7종은 1탄 조각, 입체 3종의 색은 1탄 5칸 조각에서 빌린다 (docs/UI_GUIDE.md) */
export const STACK_PIECES: Record<StackPieceId, StackPieceDef> = {
  I3: planar('I3'),
  L3: planar('L3'),
  I4: planar('I4'),
  O4: planar('O4'),
  T4: planar('T4'),
  L4: planar('L4'),
  S4: planar('S4'),
  /** 세 갈래: 한 정육면체에 세 방향으로 하나씩 */
  Y4: { cells: vecs([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]), color: PIECES.P5.color },
  /** 오른쪽 꽈배기 */
  R4: { cells: vecs([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]]), color: PIECES.L5.color },
  /** 왼쪽 꽈배기 (R4의 거울상 — 돌려서는 못 만든다) */
  Q4: { cells: vecs([[0, 1, 0], [1, 1, 0], [1, 0, 0], [1, 0, 1]]), color: PIECES.U5.color },
};

export const STACK_IDS: readonly StackPieceId[] = ['I3', 'L3', 'I4', 'O4', 'T4', 'L4', 'S4', 'Y4', 'R4', 'Q4'];

/** 바닥에 납작하게 눕는 조각 (쉬움에서만 쓴다) */
export const PLANAR_IDS: readonly StackPieceId[] = ['I3', 'L3', 'I4', 'O4', 'T4', 'L4', 'S4'];
