import type { Difficulty } from '../../lib/difficulty';
import { deriveSeed } from '../../lib/random';

export type PlayerConfig = { name: string; difficulty: Difficulty };

export type MatchConfig = {
  gameId: string;
  players: PlayerConfig[];
  rounds: number;
  timeLimitSec: number;
};

export type Phase = 'countdown' | 'playing' | 'roundResult' | 'final';

export type MatchState = {
  config: MatchConfig;
  /** 판 전체 시드 — 플레이어별 퍼즐 시드는 여기서 파생 */
  seed: number;
  phase: Phase;
  /** 1부터 */
  round: number;
  roundStartedAt: number | null;
  /** 이번 라운드에 푼 플레이어 번호, 푼 순서대로 */
  solveOrder: number[];
  /** 이번 라운드 플레이어별 걸린 시간(ms), 못 풀었으면 null */
  solveTimesMs: (number | null)[];
  /** 방금 끝난 라운드에서 얻은 점수 */
  roundPoints: number[];
  totals: number[];
};

export type MatchAction =
  | { type: 'START_ROUND'; now: number }
  | { type: 'SOLVED'; player: number; now: number }
  | { type: 'TIME_UP' }
  | { type: 'NEXT_ROUND' };

export const COUNTDOWN_SECONDS = 3;
export const ROUND_OPTIONS: readonly number[] = [3, 5, 9];
export const TIME_OPTIONS: readonly number[] = [60, 90, 120];

export function createMatch(config: MatchConfig, seed: number): MatchState {
  const n = config.players.length;
  return {
    config,
    seed,
    phase: 'countdown',
    round: 1,
    roundStartedAt: null,
    solveOrder: [],
    solveTimesMs: new Array<number | null>(n).fill(null),
    roundPoints: new Array<number>(n).fill(0),
    totals: new Array<number>(n).fill(0),
  };
}

/** 1등 3점, 2등 2점, 그 뒤로 푼 사람 1점, 못 풀면 0점 */
export function roundPoints(solveOrder: readonly number[], playerCount: number): number[] {
  const points = new Array<number>(playerCount).fill(0);
  solveOrder.forEach((player, rank) => {
    points[player] = rank === 0 ? 3 : rank === 1 ? 2 : 1;
  });
  return points;
}

function finishRound(state: MatchState): MatchState {
  const points = roundPoints(state.solveOrder, state.config.players.length);
  return {
    ...state,
    phase: 'roundResult',
    roundPoints: points,
    totals: state.totals.map((t, i) => t + points[i]),
  };
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'START_ROUND':
      if (state.phase !== 'countdown') return state;
      return { ...state, phase: 'playing', roundStartedAt: action.now };

    case 'SOLVED': {
      if (state.phase !== 'playing' || state.roundStartedAt === null) return state;
      if (action.player < 0 || action.player >= state.config.players.length) return state;
      if (state.solveOrder.includes(action.player)) return state;
      const solveTimesMs = state.solveTimesMs.slice();
      solveTimesMs[action.player] = action.now - state.roundStartedAt;
      const next = { ...state, solveOrder: [...state.solveOrder, action.player], solveTimesMs };
      return next.solveOrder.length === state.config.players.length ? finishRound(next) : next;
    }

    case 'TIME_UP':
      return state.phase === 'playing' ? finishRound(state) : state;

    case 'NEXT_ROUND':
      if (state.phase !== 'roundResult') return state;
      if (state.round >= state.config.rounds) return { ...state, phase: 'final' };
      return {
        ...state,
        phase: 'countdown',
        round: state.round + 1,
        roundStartedAt: null,
        solveOrder: [],
        solveTimesMs: state.solveTimesMs.map(() => null),
        roundPoints: state.roundPoints.map(() => 0),
      };
  }
}

/** 남은 시간(ms). 플레이 중이 아니면 제한시간 전체, 0~제한시간 사이로 자른다 */
export function remainingMs(state: MatchState, now: number): number {
  const limit = state.config.timeLimitSec * 1000;
  if (state.phase !== 'playing' || state.roundStartedAt === null) return limit;
  return Math.min(limit, Math.max(0, limit - (now - state.roundStartedAt)));
}

export function playerSeed(state: MatchState, player: number): number {
  return deriveSeed(state.seed, state.round, player);
}

/** 최고점인 플레이어 번호들 (동점이면 공동 우승) */
export function winners(totals: readonly number[]): number[] {
  const best = Math.max(...totals);
  const out: number[] = [];
  totals.forEach((t, i) => {
    if (t === best) out.push(i);
  });
  return out;
}
