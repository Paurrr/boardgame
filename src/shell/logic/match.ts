import type { Difficulty } from '../../lib/difficulty';
import { deriveSeed } from '../../lib/random';

export type PlayerConfig = { name: string; difficulty: Difficulty };

/** round: 라운드마다 제한시간, game: 판 전체 제한시간(타임어택) */
export type TimeMode = 'round' | 'game';

export type MatchConfig = {
  gameId: string;
  players: PlayerConfig[];
  rounds: number;
  timeMode: TimeMode;
  /** 라운드마다 방식의 라운드 제한시간(초) — 뜻은 기존 그대로 */
  timeLimitSec: number;
  /** 판 전체 방식의 전체 제한시간(초) */
  gameTimeSec: number;
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
  /** 방금 끝난 라운드에서 얻은 점수 (순위 점수 + 빠르기 보너스) */
  roundPoints: number[];
  /** 방금 끝난 라운드의 빠르기 보너스 */
  roundBonus: number[];
  totals: number[];
  /** 끝난 라운드 길이의 합(ms) — 판 전체 시계는 이것으로 계산한다 */
  usedMs: number;
  /** 끝난 라운드들에서 플레이어별로 쓴 시간의 합(ms): 푼 라운드는 푼 시간, 못 푼 라운드는 그 라운드 길이 */
  totalTimesMs: number[];
  /** 플레이어별로 푼 라운드 수 */
  solvedCounts: number[];
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
    roundBonus: new Array<number>(n).fill(0),
    totals: new Array<number>(n).fill(0),
    usedMs: 0,
    totalTimesMs: new Array<number>(n).fill(0),
    solvedCounts: new Array<number>(n).fill(0),
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

/** 빠르기 보너스 기준 시간(ms): round → timeLimitSec*1000, game → gameTimeSec*1000/rounds */
export function speedBaseMs(config: MatchConfig): number {
  if (config.timeMode === 'game') return (config.gameTimeSec * 1000) / config.rounds;
  return config.timeLimitSec * 1000;
}

/** 기준의 1/3 이내 2점, 2/3 이내 1점, 그 뒤 0점 (경계 포함). 경계에서 흔들리지 않게 곱셈으로 비교한다 */
export function speedBonus(timeMs: number, baseMs: number): number {
  if (3 * timeMs <= baseMs) return 2;
  if (3 * timeMs <= 2 * baseMs) return 1;
  return 0;
}

/** 이번 라운드에 쓸 수 있는 최대 시간(ms). round: 라운드 제한시간, game: 남은 판 시간 */
export function roundBudgetMs(state: MatchState): number {
  if (state.config.timeMode === 'game') return Math.max(0, state.config.gameTimeSec * 1000 - state.usedMs);
  return state.config.timeLimitSec * 1000;
}

/** 이번이 마지막 라운드인가: 라운드 수를 다 했거나, 판 전체 방식에서 판 시간이 다 됐다 */
export function isLastRound(state: MatchState): boolean {
  return state.round >= state.config.rounds || (state.config.timeMode === 'game' && roundBudgetMs(state) <= 0);
}

function finishRound(state: MatchState, durationMs: number): MatchState {
  const rank = roundPoints(state.solveOrder, state.config.players.length);
  const base = speedBaseMs(state.config);
  const bonus = state.solveTimesMs.map((t) => (t === null ? 0 : speedBonus(t, base)));
  const points = rank.map((r, i) => r + bonus[i]);
  return {
    ...state,
    phase: 'roundResult',
    roundPoints: points,
    roundBonus: bonus,
    totals: state.totals.map((t, i) => t + points[i]),
    usedMs: state.usedMs + durationMs,
    totalTimesMs: state.totalTimesMs.map((t, i) => t + (state.solveTimesMs[i] ?? durationMs)),
    solvedCounts: state.solvedCounts.map((c, i) => (state.solveTimesMs[i] === null ? c : c + 1)),
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
      // 화면은 시간을 띄엄띄엄 확인하므로 시간이 끝난 뒤의 풀이가 TIME_UP보다 먼저 올 수 있다
      const elapsed = action.now - state.roundStartedAt;
      if (elapsed >= roundBudgetMs(state)) return state;
      const solveTimesMs = state.solveTimesMs.slice();
      solveTimesMs[action.player] = elapsed;
      const next = { ...state, solveOrder: [...state.solveOrder, action.player], solveTimesMs };
      if (next.solveOrder.length < state.config.players.length) return next;
      return finishRound(next, Math.max(...solveTimesMs.map((t) => t ?? 0)));
    }

    case 'TIME_UP':
      return state.phase === 'playing' ? finishRound(state, roundBudgetMs(state)) : state;

    case 'NEXT_ROUND':
      if (state.phase !== 'roundResult') return state;
      if (isLastRound(state)) return { ...state, phase: 'final' };
      return {
        ...state,
        phase: 'countdown',
        round: state.round + 1,
        roundStartedAt: null,
        solveOrder: [],
        solveTimesMs: state.solveTimesMs.map(() => null),
        roundPoints: state.roundPoints.map(() => 0),
        roundBonus: state.roundBonus.map(() => 0),
      };
  }
}

/** 남은 시간(ms). 플레이 중이 아니면 라운드 예산 전체, 0~예산 사이로 자른다 */
export function remainingMs(state: MatchState, now: number): number {
  const budget = roundBudgetMs(state);
  if (state.phase !== 'playing' || state.roundStartedAt === null) return budget;
  return Math.min(budget, Math.max(0, budget - (now - state.roundStartedAt)));
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

export type Standing = {
  /** 플레이어 번호 */
  player: number;
  /** 총점 */
  total: number;
  /** 총 걸린 시간(ms) */
  timeMs: number;
  /** 푼 라운드 수 */
  solved: number;
  /** 1등과 총점·시간(0.1초 단위)이 모두 같으면 공동 우승 */
  winner: boolean;
};

/** 최종 순위표. 총점 내림차순 → 총 걸린 시간(0.1초 단위) 오름차순 → 플레이어 번호 오름차순 */
export function standings(state: MatchState): Standing[] {
  const tenths = (ms: number) => Math.round(ms / 100);
  const rows = state.totals.map((total, player) => ({
    player,
    total,
    timeMs: state.totalTimesMs[player],
    solved: state.solvedCounts[player],
  }));
  rows.sort((a, b) => b.total - a.total || tenths(a.timeMs) - tenths(b.timeMs) || a.player - b.player);
  const first = rows[0];
  return rows.map((r) => ({
    ...r,
    winner: r.total === first.total && tenths(r.timeMs) === tenths(first.timeMs),
  }));
}
