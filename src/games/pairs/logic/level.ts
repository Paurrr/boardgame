import type { Difficulty } from '../../../lib/difficulty';

/** 판 전체 난이도 하나: 카드 수(rows×cols)와 틀린 두 장이 보이는 시간 */
export type PairsLevel = { rows: number; cols: number; showMs: number };

export const PAIRS_LEVELS: Record<Difficulty, PairsLevel> = {
  easy: { rows: 4, cols: 4, showMs: 3000 },
  normal: { rows: 4, cols: 8, showMs: 2000 },
  hard: { rows: 6, cols: 8, showMs: 1000 },
};

/** 그릴 수 있는 그림 종류. 판마다 이 중에서 필요한 만큼 뽑는다 */
export const PICTURE_COUNT = 24;

export function cardCount(level: Difficulty): number {
  const { rows, cols } = PAIRS_LEVELS[level];
  return rows * cols;
}
