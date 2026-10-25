import { DIFFICULTIES, DIFFICULTY_LABEL } from '../../../lib/difficulty';
import type { Difficulty } from '../../../lib/difficulty';
import { BELL_LEVELS, turnLimitMs } from '../logic/level';

/** ms를 0.1초 단위로 버려 "2.4"·"3"처럼 적는다 (보이는 시간보다 더 주지 않는다) */
function seconds(ms: number): string {
  return String(Math.floor(ms / 100) / 10);
}

/** 설정 화면에서 단계 버튼 아래에 보이는 설명. 숫자는 BELL_LEVELS에서 가져와 늘 맞는다 */
export function levelText(level: Difficulty): string {
  const { cardsEach, startMs, minMs } = BELL_LEVELS[level];
  const time =
    startMs === null
      ? '시간 제한 없음'
      : `차례마다 ${seconds(startMs)}초 → 점점 빨라져 ${seconds(minMs)}초까지 (지나면 저절로 뒤집혀요)`;
  const cards = cardsEach === null ? '카드는 전부 나눠요' : `한 사람 ${cardsEach}장`;
  return `${time} · ${cards}`;
}

/** GameModule.levels로 셸에 넘기는 단계별 설명 */
export const LEVEL_TEXT = Object.fromEntries(DIFFICULTIES.map((d) => [d, levelText(d)])) as Record<
  Difficulty,
  string
>;

/** 경기 중 위쪽 막대: 난이도와 지금 차례 제한시간 (쉬움은 이름만) */
export function levelBadge(level: Difficulty, flips: number): string {
  const limit = turnLimitMs(level, flips);
  return limit === null ? DIFFICULTY_LABEL[level] : `${DIFFICULTY_LABEL[level]} · ${seconds(limit)}초`;
}
