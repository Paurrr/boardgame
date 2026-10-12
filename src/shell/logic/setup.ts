import type { MatchConfig, PlayerConfig } from './match';

/** 플레이어 설정 화면에서 고르는 값 (저장해 두고 다음에 다시 쓴다) */
export type SavedSetup = { players: PlayerConfig[]; rounds: number; timeLimitSec: number };

export const MAX_NAME_LENGTH = 8;

export function defaultName(index: number): string {
  return '플레이어 ' + (index + 1);
}

export function defaultSetup(): SavedSetup {
  return {
    players: [
      { name: defaultName(0), difficulty: 'normal' },
      { name: defaultName(1), difficulty: 'normal' },
    ],
    rounds: 5,
    timeLimitSec: 90,
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
  return { gameId, players: setup.players, rounds: setup.rounds, timeLimitSec: setup.timeLimitSec };
}
