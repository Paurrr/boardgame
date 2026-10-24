import { TIME_OPTIONS } from './match';
import type { MatchConfig, PlayerConfig, TimeMode } from './match';

/** 플레이어 설정 화면에서 고르는 값 (저장해 두고 다음에 다시 쓴다) */
export type SavedSetup = {
  players: PlayerConfig[];
  rounds: number;
  timeMode: TimeMode;
  timeLimitSec: number;
  gameTimeSec: number;
};

export const MAX_NAME_LENGTH = 8;

export const GAME_TIME_MIN_SEC = 30;
export const GAME_TIME_MAX_SEC = 600;
export const GAME_TIME_STEP_SEC = 10;
export const DEFAULT_GAME_TIME_SEC = 300;

/** 10초 단위로 반올림하고 30~600으로 자른다. 숫자가 아니거나 유한하지 않으면 기본값 */
export function clampGameTime(sec: number): number {
  if (!Number.isFinite(sec)) return DEFAULT_GAME_TIME_SEC;
  const rounded = Math.round(sec / GAME_TIME_STEP_SEC) * GAME_TIME_STEP_SEC;
  return Math.min(GAME_TIME_MAX_SEC, Math.max(GAME_TIME_MIN_SEC, rounded));
}

/** 10초 늘리거나 줄인다 (범위 밖으로 나가지 않는다) */
export function stepGameTime(sec: number, dir: 1 | -1): number {
  return clampGameTime(sec + dir * GAME_TIME_STEP_SEC);
}

export function defaultName(index: number): string {
  return '플레이어 ' + (index + 1);
}

/** 게임이 제한시간 선택지·기본값을 따로 정할 때 쓰는 모양 (GameModule의 일부) */
export type TimeRules = { timeOptions?: readonly number[]; defaultTimeSec?: number };

const DEFAULT_TIME_SEC = 90;

export function timeOptionsOf(rules: TimeRules): readonly number[] {
  return rules.timeOptions ?? TIME_OPTIONS;
}

export function defaultTimeOf(rules: TimeRules): number {
  return rules.defaultTimeSec ?? DEFAULT_TIME_SEC;
}

/** 선택지에 있는 값이면 그대로, 아니면 게임 기본값 */
export function fitTimeLimit(rules: TimeRules, sec: number): number {
  return timeOptionsOf(rules).includes(sec) ? sec : defaultTimeOf(rules);
}

export function defaultSetup(rules?: TimeRules): SavedSetup {
  return {
    players: [
      { name: defaultName(0), difficulty: 'normal' },
      { name: defaultName(1), difficulty: 'normal' },
    ],
    rounds: 5,
    timeMode: 'round',
    timeLimitSec: defaultTimeOf(rules ?? {}),
    gameTimeSec: DEFAULT_GAME_TIME_SEC,
  };
}

/** 인원 수를 바꾼다. 기존 플레이어는 그대로 두고 모자라면 기본값으로 채운다 */
export function resizePlayers(players: readonly PlayerConfig[], count: number): PlayerConfig[] {
  const out = players.slice(0, count);
  for (let i = out.length; i < count; i++) out.push({ name: defaultName(i), difficulty: 'normal' });
  return out;
}

/** 시작 직전 정리: 이름 공백 제거, 빈 이름은 기본 이름, 너무 길면 자르기 */
export function finalizeSetup(setup: SavedSetup): SavedSetup {
  return {
    ...setup,
    players: setup.players.map((p, i) => ({
      name: (p.name.trim() || defaultName(i)).slice(0, MAX_NAME_LENGTH),
      difficulty: p.difficulty,
    })),
  };
}

export function toMatchConfig(gameId: string, setup: SavedSetup): MatchConfig {
  return {
    gameId,
    players: setup.players,
    rounds: setup.rounds,
    timeMode: setup.timeMode,
    timeLimitSec: setup.timeLimitSec,
    gameTimeSec: setup.gameTimeSec,
  };
}
