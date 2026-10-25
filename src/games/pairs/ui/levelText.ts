import { DIFFICULTIES, DIFFICULTY_LABEL } from '../../../lib/difficulty';
import type { Difficulty } from '../../../lib/difficulty';
import { cardCount, PAIRS_LEVELS } from '../logic/level';

/** 틀린 두 장이 보이는 시간(초) */
function showSeconds(level: Difficulty): number {
  return PAIRS_LEVELS[level].showMs / 1000;
}

/** 설정 화면에서 단계 버튼 아래에 보이는 설명. 숫자는 PAIRS_LEVELS에서 가져와 늘 맞는다 */
export function levelText(level: Difficulty): string {
  return `카드 ${cardCount(level)}장 · 틀리면 ${showSeconds(level)}초만 보여요`;
}

/** GameModule.levels로 셸에 넘기는 단계별 설명 */
export const LEVEL_TEXT = Object.fromEntries(DIFFICULTIES.map((d) => [d, levelText(d)])) as Record<
  Difficulty,
  string
>;

/** 경기 중 위쪽 막대: 난이도·장수·보이는 시간 */
export function levelBadge(level: Difficulty): string {
  return `${DIFFICULTY_LABEL[level]} · ${cardCount(level)}장 · ${showSeconds(level)}초`;
}
