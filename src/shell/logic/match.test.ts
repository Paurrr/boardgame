import { describe, expect, it } from 'vitest';
import {
  createMatch,
  isLastRound,
  matchReducer,
  playerSeed,
  remainingMs,
  roundBudgetMs,
  roundPoints,
  winners,
} from './match';
import type { MatchConfig, MatchState } from './match';

const config = (players: number, rounds = 3): MatchConfig => ({
  gameId: 'blocks',
  players: Array.from({ length: players }, (_, i) => ({ name: `P${i + 1}`, difficulty: 'normal' as const })),
  rounds,
  timeMode: 'round',
  timeLimitSec: 90,
  gameTimeSec: 300,
});

const playing = (players: number, rounds = 3, now = 1000): MatchState =>
  matchReducer(createMatch(config(players, rounds), 42), { type: 'START_ROUND', now });

const gameConfig = (players: number, rounds: number, gameTimeSec: number): MatchConfig => ({
  ...config(players, rounds),
  timeMode: 'game',
  gameTimeSec,
});

const gamePlaying = (players: number, rounds: number, gameTimeSec: number, now = 0): MatchState =>
  matchReducer(createMatch(gameConfig(players, rounds, gameTimeSec), 42), { type: 'START_ROUND', now });

describe('roundPoints', () => {
  it('1등 3점, 2등 2점, 그 뒤로 푼 사람 1점, 못 풀면 0점', () => {
    expect(roundPoints([2, 0, 3, 1], 5)).toEqual([2, 1, 3, 1, 0]);
  });

  it('아무도 못 풀면 모두 0점', () => {
    expect(roundPoints([], 3)).toEqual([0, 0, 0]);
  });
});

describe('createMatch', () => {
  it('1라운드 카운트다운에서 시작하고 점수는 0', () => {
    const s = createMatch(config(3), 7);
    expect(s.phase).toBe('countdown');
    expect(s.round).toBe(1);
    expect(s.totals).toEqual([0, 0, 0]);
    expect(s.solveTimesMs).toEqual([null, null, null]);
  });

  it('판 시계와 총 시간·푼 라운드 수는 0에서 시작한다', () => {
    const s = createMatch(config(3), 7);
    expect(s.usedMs).toBe(0);
    expect(s.totalTimesMs).toEqual([0, 0, 0]);
    expect(s.solvedCounts).toEqual([0, 0, 0]);
  });
});

describe('matchReducer', () => {
  it('START_ROUND: 카운트다운 → 플레이, 시작 시각 기록', () => {
    const s = playing(2, 3, 5000);
    expect(s.phase).toBe('playing');
    expect(s.roundStartedAt).toBe(5000);
  });

  it('START_ROUND는 카운트다운이 아닐 때 무시한다', () => {
    const s = playing(2);
    expect(matchReducer(s, { type: 'START_ROUND', now: 9999 })).toBe(s);
  });

  it('SOLVED: 푼 순서와 걸린 시간을 기록한다', () => {
    const s = matchReducer(playing(3, 3, 1000), { type: 'SOLVED', player: 1, now: 13500 });
    expect(s.solveOrder).toEqual([1]);
    expect(s.solveTimesMs).toEqual([null, 12500, null]);
    expect(s.phase).toBe('playing');
  });

  it('SOLVED: 같은 사람이 두 번 풀어도 한 번만 센다', () => {
    const once = matchReducer(playing(3), { type: 'SOLVED', player: 1, now: 2000 });
    expect(matchReducer(once, { type: 'SOLVED', player: 1, now: 3000 })).toBe(once);
  });

  it('SOLVED: 없는 플레이어 번호나 플레이 중이 아닐 때는 무시한다', () => {
    const s = playing(2);
    expect(matchReducer(s, { type: 'SOLVED', player: 5, now: 2000 })).toBe(s);
    const countdown = createMatch(config(2), 1);
    expect(matchReducer(countdown, { type: 'SOLVED', player: 0, now: 2000 })).toBe(countdown);
  });

  it('모두 풀면 라운드가 끝나고 점수가 더해진다', () => {
    let s = playing(3);
    s = matchReducer(s, { type: 'SOLVED', player: 2, now: 2000 });
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 3000 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 4000 });
    expect(s.phase).toBe('roundResult');
    expect(s.roundPoints).toEqual([2, 1, 3]);
    expect(s.totals).toEqual([2, 1, 3]);
  });

  it('TIME_UP: 못 푼 사람은 0점으로 라운드를 끝낸다', () => {
    let s = matchReducer(playing(3), { type: 'SOLVED', player: 1, now: 2000 });
    s = matchReducer(s, { type: 'TIME_UP' });
    expect(s.phase).toBe('roundResult');
    expect(s.roundPoints).toEqual([0, 3, 0]);
  });

  it('TIME_UP은 플레이 중이 아니면 무시한다', () => {
    const s = createMatch(config(2), 1);
    expect(matchReducer(s, { type: 'TIME_UP' })).toBe(s);
  });

  it('혼자 하면 풀자마자 라운드가 끝난다', () => {
    const s = matchReducer(playing(1), { type: 'SOLVED', player: 0, now: 4000 });
    expect(s.phase).toBe('roundResult');
    expect(s.totals).toEqual([3]);
  });

  it('NEXT_ROUND: 다음 라운드 카운트다운으로 가며 라운드 기록을 비운다', () => {
    let s = matchReducer(playing(2), { type: 'TIME_UP' });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('countdown');
    expect(s.round).toBe(2);
    expect(s.solveOrder).toEqual([]);
    expect(s.solveTimesMs).toEqual([null, null]);
    expect(s.roundStartedAt).toBeNull();
  });

  it('NEXT_ROUND: 마지막 라운드 뒤에는 최종 결과', () => {
    let s = matchReducer(playing(2, 1), { type: 'TIME_UP' });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('final');
  });

  it('NEXT_ROUND는 라운드 결과 화면이 아니면 무시한다', () => {
    const s = playing(2);
    expect(matchReducer(s, { type: 'NEXT_ROUND' })).toBe(s);
  });

  it('점수는 라운드를 넘어 누적된다', () => {
    let s = playing(2, 3, 0);
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 1 });
    s = matchReducer(s, { type: 'TIME_UP' });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    s = matchReducer(s, { type: 'START_ROUND', now: 100 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 200 });
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 300 });
    expect(s.totals).toEqual([5, 3]);
  });
});

describe('remainingMs', () => {
  it('플레이 중에는 시작 시각부터 줄어든다', () => {
    const s = playing(2, 3, 1000);
    expect(remainingMs(s, 1000)).toBe(90000);
    expect(remainingMs(s, 31000)).toBe(60000);
  });

  it('0 아래로 내려가지 않는다', () => {
    expect(remainingMs(playing(2, 3, 0), 999999)).toBe(0);
  });

  it('시작 시각보다 이른 시각을 받아도 제한시간을 넘지 않는다', () => {
    expect(remainingMs(playing(2, 3, 5000), 4000)).toBe(90000);
  });

  it('플레이 중이 아니면 제한시간 전체', () => {
    expect(remainingMs(createMatch(config(2), 1), 0)).toBe(90000);
  });
});

describe('roundBudgetMs', () => {
  it('라운드마다 방식은 라운드 제한시간', () => {
    expect(roundBudgetMs(createMatch(config(2), 1))).toBe(90000);
  });

  it('판 전체 방식의 첫 라운드는 판 전체 시간', () => {
    expect(roundBudgetMs(createMatch(gameConfig(2, 5, 50), 1))).toBe(50000);
  });
});

describe('판 전체 시계', () => {
  it('라운드 사이에는 시계가 멈춘다', () => {
    let s = gamePlaying(2, 5, 50, 0);
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 10000 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 12000 });
    expect(s.phase).toBe('roundResult');
    expect(s.usedMs).toBe(12000);
    expect(remainingMs(s, 999999999)).toBe(38000);
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('countdown');
    expect(remainingMs(s, 999999999)).toBe(38000);
  });

  it('두 번째 라운드는 남은 판 시간에서 줄어든다', () => {
    let s = gamePlaying(2, 5, 50, 0);
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 10000 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 12000 });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    s = matchReducer(s, { type: 'START_ROUND', now: 100000 });
    expect(remainingMs(s, 100000)).toBe(38000);
    expect(remainingMs(s, 105000)).toBe(33000);
  });

  it('판 시간이 끝나면 남은 라운드가 있어도 최종 결과로 간다', () => {
    let s = gamePlaying(2, 5, 50, 0);
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 10000 });
    s = matchReducer(s, { type: 'TIME_UP' });
    expect(s.phase).toBe('roundResult');
    expect(s.usedMs).toBe(50000);
    expect(isLastRound(s)).toBe(true);
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('final');
    expect(s.round).toBe(1);
  });
});

describe('예산을 넘긴 SOLVED', () => {
  it('라운드마다 방식: 제한시간 이상 지난 풀이는 무시한다', () => {
    const s = playing(2, 3, 0);
    expect(matchReducer(s, { type: 'SOLVED', player: 0, now: 90000 })).toBe(s);
    expect(matchReducer(s, { type: 'SOLVED', player: 0, now: 89999 }).solveOrder).toEqual([0]);
  });

  it('판 전체 방식: 남은 판 시간 이상 지난 풀이는 무시한다', () => {
    let s = gamePlaying(2, 5, 50, 0);
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 10000 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 12000 });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    s = matchReducer(s, { type: 'START_ROUND', now: 0 });
    expect(matchReducer(s, { type: 'SOLVED', player: 0, now: 38000 })).toBe(s);
    expect(matchReducer(s, { type: 'SOLVED', player: 0, now: 37999 }).solveOrder).toEqual([0]);
  });
});

describe('총 걸린 시간', () => {
  it('푼 라운드는 푼 시간, 못 푼 라운드는 라운드 길이를 판 전체에 걸쳐 더한다', () => {
    let s = playing(2, 3, 0);
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 20000 });
    s = matchReducer(s, { type: 'TIME_UP' });
    expect(s.totalTimesMs).toEqual([20000, 90000]);
    expect(s.solvedCounts).toEqual([1, 0]);
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    s = matchReducer(s, { type: 'START_ROUND', now: 0 });
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 5000 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 8000 });
    expect(s.totalTimesMs).toEqual([25000, 98000]);
    expect(s.solvedCounts).toEqual([2, 1]);
  });
});

describe('isLastRound', () => {
  it('라운드마다 방식은 마지막 라운드 번호에서만 참', () => {
    let s = playing(2, 3, 0);
    const seen: boolean[] = [];
    for (let r = 1; r <= 3; r++) {
      expect(s.round).toBe(r);
      seen.push(isLastRound(s));
      s = matchReducer(s, { type: 'TIME_UP' });
      s = matchReducer(s, { type: 'NEXT_ROUND' });
      s = matchReducer(s, { type: 'START_ROUND', now: 0 });
    }
    expect(seen).toEqual([false, false, true]);
  });
});

describe('winners', () => {
  it('최고점인 사람들 (동점이면 여럿)', () => {
    expect(winners([5, 9, 3])).toEqual([1]);
    expect(winners([7, 2, 7])).toEqual([0, 2]);
  });
});

describe('playerSeed', () => {
  it('같은 판·라운드·플레이어면 같고, 하나라도 다르면 다르다', () => {
    const s = playing(2);
    expect(playerSeed(s, 0)).toBe(playerSeed(s, 0));
    expect(playerSeed(s, 0)).not.toBe(playerSeed(s, 1));
    const next = matchReducer(matchReducer(matchReducer(s, { type: 'TIME_UP' }), { type: 'NEXT_ROUND' }), {
      type: 'START_ROUND',
      now: 0,
    });
    expect(playerSeed(next, 0)).not.toBe(playerSeed(s, 0));
  });
});
