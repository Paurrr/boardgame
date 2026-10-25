import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../../lib/difficulty';
import { createPairsGame, isOver, pairsReducer, standings } from './game';
import { cardCount, PICTURE_COUNT } from './level';
import type { PairsState } from './types';

const flip = (s: PairsState, index: number) => pairsReducer(s, { type: 'FLIP', index });
const cont = (s: PairsState) => pairsReducer(s, { type: 'CONTINUE' });

/** 같은 그림인 두 칸 */
function pairOf(s: PairsState, picture: number): [number, number] {
  const found = s.slots.flatMap((slot, i) => (slot.picture === picture ? [i] : []));
  return [found[0], found[1]];
}

/** 0번 칸과 그 짝 */
const matchPair = (s: PairsState) => pairOf(s, s.slots[0].picture);

/** 0번 칸과 그림이 다른 첫 칸 */
function missPair(s: PairsState): [number, number] {
  return [0, s.slots.findIndex((slot) => slot.picture !== s.slots[0].picture)];
}

function pictures(s: PairsState): number[] {
  return s.slots.map((slot) => slot.picture);
}

describe('createPairsGame', () => {
  it('난이도마다 장수만큼 칸을 만들고 그림마다 정확히 2장씩 둔다', () => {
    for (const level of DIFFICULTIES) {
      const s = createPairsGame(2, 7, level);
      expect(s.slots).toHaveLength(cardCount(level));
      const counts = new Map<number, number>();
      for (const p of pictures(s)) counts.set(p, (counts.get(p) ?? 0) + 1);
      expect(counts.size).toBe(cardCount(level) / 2);
      expect([...counts.values()].every((c) => c === 2)).toBe(true);
      expect(pictures(s).every((p) => Number.isInteger(p) && p >= 0 && p < PICTURE_COUNT)).toBe(true);
    }
    expect(new Set(pictures(createPairsGame(2, 7, 'easy'))).size).toBe(8);
    expect(new Set(pictures(createPairsGame(2, 7, 'normal'))).size).toBe(16);
    expect(new Set(pictures(createPairsGame(2, 7, 'hard'))).size).toBe(24);
  });

  it('모두 엎은 채 0번부터 시작하고 짝과 횟수는 0이다', () => {
    const s = createPairsGame(3, 7, 'easy');
    expect(s.playerCount).toBe(3);
    expect(s.slots.every((slot) => slot.takenBy === null)).toBe(true);
    expect(s.open).toEqual([]);
    expect(s.pending).toBeNull();
    expect(s.turn).toBe(0);
    expect(s.pairs).toEqual([0, 0, 0]);
    expect(s.tries).toBe(0);
  });

  it('같은 시드면 같은 판이고 시드가 다르면 배치가 다르다', () => {
    expect(createPairsGame(2, 1, 'normal')).toEqual(createPairsGame(2, 1, 'normal'));
    expect(pictures(createPairsGame(2, 1, 'normal'))).not.toEqual(pictures(createPairsGame(2, 2, 'normal')));
  });

  it('인원이 1~4명이 아니면 RangeError, 1명은 된다', () => {
    expect(() => createPairsGame(0, 1, 'easy')).toThrow(RangeError);
    expect(() => createPairsGame(5, 1, 'easy')).toThrow(RangeError);
    expect(createPairsGame(1, 1, 'easy').pairs).toEqual([0]);
  });
});

describe('FLIP', () => {
  it('첫 장을 누르면 그 칸이 열리고 원래 상태는 그대로다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const next = flip(s, 4);
    expect(next.open).toEqual([4]);
    expect(next.pending).toBeNull();
    expect(next.tries).toBe(0);
    expect(s.open).toEqual([]);
  });

  it('이미 열린 칸을 다시 누르면 같은 객체다', () => {
    const one = flip(createPairsGame(2, 3, 'easy'), 4);
    expect(flip(one, 4)).toBe(one);
  });

  it('판 밖 칸 번호는 같은 객체다', () => {
    const s = createPairsGame(2, 3, 'easy');
    expect(flip(s, -1)).toBe(s);
    expect(flip(s, 16)).toBe(s);
    expect(flip(s, 1.5)).toBe(s);
  });

  it('같은 그림 두 장이면 match를 기다리고 횟수가 1 는다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const [a, b] = matchPair(s);
    const next = flip(flip(s, a), b);
    expect(next.open).toEqual([a, b]);
    expect(next.pending).toBe('match');
    expect(next.tries).toBe(1);
  });

  it('다른 그림 두 장이면 miss를 기다린다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const [a, b] = missPair(s);
    const next = flip(flip(s, a), b);
    expect(next.open).toEqual([a, b]);
    expect(next.pending).toBe('miss');
    expect(next.tries).toBe(1);
  });

  it('두 장이 보이는 동안의 FLIP은 무시한다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const [a, b] = missPair(s);
    const two = flip(flip(s, a), b);
    const third = s.slots.findIndex((_, i) => i !== a && i !== b);
    expect(flip(two, third)).toBe(two);
  });

  it('가져간 칸을 누르면 같은 객체다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const [a, b] = matchPair(s);
    const taken = cont(flip(flip(s, a), b));
    expect(flip(taken, a)).toBe(taken);
    expect(flip(taken, b)).toBe(taken);
  });
});

describe('CONTINUE', () => {
  it('match면 두 장을 차례인 사람이 가져가고 같은 사람이 한 번 더 한다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const [a, b] = matchPair(s);
    const next = cont(flip(flip(s, a), b));
    expect(next.slots[a].takenBy).toBe(0);
    expect(next.slots[b].takenBy).toBe(0);
    expect(next.slots.filter((slot) => slot.takenBy !== null)).toHaveLength(2);
    expect(next.pairs).toEqual([1, 0]);
    expect(next.turn).toBe(0);
    expect(next.open).toEqual([]);
    expect(next.pending).toBeNull();
  });

  it('miss면 두 장을 다시 엎고 다음 사람 차례다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const [a, b] = missPair(s);
    const next = cont(flip(flip(s, a), b));
    expect(next.open).toEqual([]);
    expect(next.pending).toBeNull();
    expect(next.turn).toBe(1);
    expect(next.slots.every((slot) => slot.takenBy === null)).toBe(true);
    expect(next.pairs).toEqual([0, 0]);
  });

  it('차례가 넘어간 사람이 맞히면 그 사람이 가져간다', () => {
    const s = createPairsGame(2, 3, 'easy');
    const [m1, m2] = missPair(s);
    const second = cont(flip(flip(s, m1), m2));
    const [a, b] = matchPair(second);
    const next = cont(flip(flip(second, a), b));
    expect(next.slots[a].takenBy).toBe(1);
    expect(next.pairs).toEqual([0, 1]);
    expect(next.turn).toBe(1);
  });

  it('3명에서 2번 차례가 틀리면 0번으로 돌아간다', () => {
    const s = { ...createPairsGame(3, 3, 'easy'), turn: 2 };
    const [a, b] = missPair(s);
    expect(cont(flip(flip(s, a), b)).turn).toBe(0);
  });

  it('1명이면 틀려도 차례가 그대로다', () => {
    const s = createPairsGame(1, 3, 'easy');
    const [a, b] = missPair(s);
    expect(cont(flip(flip(s, a), b)).turn).toBe(0);
  });

  it('기다리는 것이 없으면 같은 객체다', () => {
    const s = createPairsGame(2, 3, 'easy');
    expect(cont(s)).toBe(s);
    const one = flip(s, 0);
    expect(cont(one)).toBe(one);
  });
});

describe('isOver', () => {
  it('쉬움에서 짝을 모두 맞추면 끝나고 그 뒤 FLIP은 같은 객체다', () => {
    let s = createPairsGame(1, 9, 'easy');
    expect(isOver(s)).toBe(false);
    for (const picture of new Set(pictures(s))) {
      const [a, b] = pairOf(s, picture);
      s = cont(flip(flip(s, a), b));
    }
    expect(isOver(s)).toBe(true);
    expect(s.tries).toBe(8);
    expect(s.pairs).toEqual([8]);
    expect(flip(s, 0)).toBe(s);
  });
});

describe('standings', () => {
  it('짝 수 내림차순, 같으면 자리 순으로 줄 세운다', () => {
    const s = { ...createPairsGame(4, 1, 'easy'), pairs: [3, 5, 3, 1] };
    expect(standings(s)).toEqual([
      { player: 1, pairs: 5, place: 1 },
      { player: 0, pairs: 3, place: 2 },
      { player: 2, pairs: 3, place: 2 },
      { player: 3, pairs: 1, place: 4 },
    ]);
  });

  it('standings는 같은 짝 수를 공동 순위로 매긴다', () => {
    const s = { ...createPairsGame(3, 1, 'easy'), pairs: [4, 4, 0] };
    expect(standings(s).map((r) => r.player)).toEqual([0, 1, 2]);
    expect(standings(s).map((r) => r.place)).toEqual([1, 1, 3]);
  });
});
