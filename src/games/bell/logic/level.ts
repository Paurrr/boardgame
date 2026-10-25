import type { Difficulty } from '../../../lib/difficulty';

/** 판 전체 난이도 하나 (원작에 없는 집 규칙, ADR-009) */
export type BellLevel = {
  /** 사람당 나눌 카드. null이면 전부 */
  cardsEach: number | null;
  /** 처음 차례 제한시간(ms). null이면 제한 없음 */
  startMs: number | null;
  /** 아무리 빨라져도 이보다 짧아지지 않는다 */
  minMs: number;
  /** 카드가 한 장 뒤집힐 때마다 줄어드는 시간 */
  stepMs: number;
};

export const BELL_LEVELS: Record<Difficulty, BellLevel> = {
  easy: { cardsEach: null, startMs: null, minMs: 0, stepMs: 0 },
  normal: { cardsEach: 12, startMs: 3000, minMs: 1000, stepMs: 50 },
  hard: { cardsEach: 8, startMs: 3000, minMs: 500, stepMs: 50 },
};

/** 지금까지 판 전체에서 flips장 뒤집혔을 때의 차례 제한시간(ms). 제한이 없으면 null */
export function turnLimitMs(level: Difficulty, flips: number): number | null {
  const { startMs, minMs, stepMs } = BELL_LEVELS[level];
  if (startMs === null) return null;
  return Math.max(minMs, startMs - stepMs * flips);
}
