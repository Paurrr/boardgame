import { describe, expect, it } from 'vitest';
import { bellReducer, createBellGame, isOut, ranking, topCards } from './game';
import type { BellState, Card, Fruit, FruitCount, Pile } from './types';

const card = (fruit: Fruit, count: FruitCount): Card => ({ fruit, count });
const S1 = card('strawberry', 1);
const S2 = card('strawberry', 2);
const S3 = card('strawberry', 3);
const B2 = card('banana', 2);
const B3 = card('banana', 3);
const B4 = card('banana', 4);
const L1 = card('lime', 1);
const L2 = card('lime', 2);
const L4 = card('lime', 4);
const U1 = card('blueberry', 1);

const pile = (down: Card[], up: Card[] = []): Pile => ({ down, up });
const state = (piles: Pile[], over: Partial<BellState> = {}): BellState => ({
  piles,
  turn: 0,
  outOrder: [],
  winner: null,
  lastRing: null,
  ...over,
});
const flip = (s: BellState, player: number) => bellReducer(s, { type: 'FLIP', player });
const ring = (s: BellState, player: number) => bellReducer(s, { type: 'RING', player });

describe('createBellGame', () => {
  it('섞은 카드를 나눠 엎어 두고 0번부터 시작한다', () => {
    const s = createBellGame(3, 42);
    expect(s.piles.map((p) => p.down.length)).toEqual([19, 19, 18]);
    expect(s.piles.every((p) => p.up.length === 0)).toBe(true);
    expect(s.turn).toBe(0);
    expect(s.outOrder).toEqual([]);
    expect(s.winner).toBeNull();
    expect(s.lastRing).toBeNull();
  });

  it('같은 시드면 같은 판이다', () => {
    expect(createBellGame(3, 42)).toEqual(createBellGame(3, 42));
  });

  it('인원이 2~4명이 아니면 RangeError', () => {
    expect(() => createBellGame(1, 1)).toThrow(RangeError);
    expect(() => createBellGame(5, 1)).toThrow(RangeError);
  });
});

describe('FLIP', () => {
  it('차례가 아닌 사람이 누르면 그대로다', () => {
    const s = state([pile([S1]), pile([B3])]);
    expect(flip(s, 1)).toBe(s);
  });

  it('엎은 더미 맨 위 카드를 펼친 더미 위에 놓고 차례를 넘긴다', () => {
    const s = state([pile([S1, L2], [B2]), pile([B3])]);
    const next = flip(s, 0);
    expect(next.piles[0]).toEqual({ down: [L2], up: [B2, S1] });
    expect(next.turn).toBe(1);
    expect(s.piles[0]).toEqual({ down: [S1, L2], up: [B2] });
  });

  it('차례는 탈락한 사람을 건너뛰고 끝에서 처음으로 돈다', () => {
    const s = state([pile([S1, S2]), pile([], [B2]), pile([L1, L2])], { outOrder: [1] });
    const afterZero = flip(s, 0);
    expect(afterZero.turn).toBe(2);
    expect(flip(afterZero, 2).turn).toBe(0);
  });

  it('마지막 카드를 뒤집으면 즉시 탈락하고 그 카드는 보이는 채로 남는다', () => {
    const s = state([pile([B4]), pile([S1]), pile([L1])]);
    const next = flip(s, 0);
    expect(isOut(next, 0)).toBe(true);
    expect(next.outOrder).toEqual([0]);
    expect(topCards(next)[0]).toEqual(B4);
    expect(next.turn).toBe(1);
    expect(next.winner).toBeNull();
  });
});

describe('RING', () => {
  it('합이 5면 모든 펼친 카드를 친 사람 엎은 더미 밑에 넣고 친 사람이 다음 차례다', () => {
    const s = state([pile([S1], [L1, B2]), pile([L4], [B3]), pile([S2], [U1])]);
    const next = ring(s, 2);
    expect(next.lastRing).toEqual({ kind: 'correct', player: 2, gained: 4 });
    expect(next.piles.map((p) => p.up)).toEqual([[], [], []]);
    expect(next.piles[2].down).toEqual([S2, L1, B2, B3, U1]);
    expect(next.piles[0].down).toEqual([S1]);
    expect(next.piles[1].down).toEqual([L4]);
    expect(next.turn).toBe(2);
  });

  it('틀리면 다음 자리부터 다른 사람마다 한 장씩 준다', () => {
    const s = state([pile([L1], [B2]), pile([S1, S2, S3]), pile([L2], [U1])]);
    const next = ring(s, 1);
    expect(next.lastRing).toEqual({ kind: 'wrong', player: 1, paidTo: [2, 0] });
    expect(next.piles[1].down).toEqual([S3]);
    expect(next.piles[2].down).toEqual([L2, S1]);
    expect(next.piles[0].down).toEqual([L1, S2]);
    expect(next.piles.map((p) => p.up)).toEqual([[B2], [], [U1]]);
    expect(next.turn).toBe(0);
  });

  it('카드가 1장인 사람이 셋 앞에서 틀리면 한 명에게만 주고 즉시 탈락한다', () => {
    const s = state([pile([L1]), pile([S1]), pile([L2]), pile([U1])], { turn: 1 });
    const next = ring(s, 1);
    expect(next.lastRing).toEqual({ kind: 'wrong', player: 1, paidTo: [2] });
    expect(next.piles[2].down).toEqual([L2, S1]);
    expect(next.piles[3].down).toEqual([U1]);
    expect(next.piles[0].down).toEqual([L1]);
    expect(isOut(next, 1)).toBe(true);
    expect(next.turn).toBe(2);
    expect(next.winner).toBeNull();
  });

  it('탈락한 사람의 펼친 카드도 합에 들어가고 그 사람의 입력은 무시한다', () => {
    const s = state([pile([], [B2]), pile([S1], [B3]), pile([L1])], { outOrder: [0], turn: 1 });
    const next = ring(s, 2);
    expect(next.lastRing).toEqual({ kind: 'correct', player: 2, gained: 2 });
    expect(next.piles[2].down).toEqual([L1, B2, B3]);
    expect(next.piles[0].up).toEqual([]);
    expect(isOut(next, 0)).toBe(true);
    expect(ring(s, 0)).toBe(s);
    expect(flip(s, 0)).toBe(s);
  });
});

describe('결과 표시와 끝', () => {
  it('결과를 보여 주는 동안 FLIP·RING은 그대로이고 CONTINUE 뒤에는 다시 된다', () => {
    const s = state([pile([S1, S2]), pile([L1, L2])], { lastRing: { kind: 'wrong', player: 1, paidTo: [0] } });
    expect(flip(s, 0)).toBe(s);
    expect(ring(s, 0)).toBe(s);
    const resumed = bellReducer(s, { type: 'CONTINUE' });
    expect(resumed.lastRing).toBeNull();
    expect(flip(resumed, 0).piles[0].down).toEqual([S2]);
  });

  it('보여 줄 결과가 없으면 CONTINUE는 그대로다', () => {
    const s = state([pile([S1]), pile([L1])]);
    expect(bellReducer(s, { type: 'CONTINUE' })).toBe(s);
  });

  it('2명에서 한 명이 마지막 카드를 뒤집으면 다른 사람이 이기고 그 뒤 입력은 그대로다', () => {
    const s = state([pile([B4]), pile([S1, S2])]);
    const over = flip(s, 0);
    expect(over.winner).toBe(1);
    expect(over.outOrder).toEqual([0]);
    expect(flip(over, 1)).toBe(over);
    expect(ring(over, 1)).toBe(over);
  });

  it('2명에서 마지막 카드를 벌칙으로 주면 다른 사람이 이긴다', () => {
    const s = state([pile([S1]), pile([L1])]);
    const over = ring(s, 0);
    expect(over.winner).toBe(1);
    expect(over.piles[1].down).toEqual([L1, S1]);
  });
});

describe('ranking', () => {
  it('이긴 사람 다음에 늦게 탈락한 순서다', () => {
    const s = state([pile([]), pile([S1]), pile([])], { outOrder: [2, 0], winner: 1 });
    expect(ranking(s)).toEqual([1, 0, 2]);
  });

  it('끝나기 전에는 남은 사람을 자리 순으로 먼저 둔다', () => {
    const s = state([pile([S1]), pile([]), pile([L1])], { outOrder: [1] });
    expect(ranking(s)).toEqual([0, 2, 1]);
  });
});
