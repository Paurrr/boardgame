import { describe, expect, it } from 'vitest';
import { COPIES, FRUITS, deal, fruitTotals, hasFive, makeDeck } from './cards';
import type { Card, Fruit, FruitCount } from './types';

const card = (fruit: Fruit, count: FruitCount): Card => ({ fruit, count });
const keys = (cards: readonly Card[]): string[] => cards.map((c) => `${c.fruit}${c.count}`).sort();

describe('makeDeck', () => {
  it('56장이고 과일마다 14장이다', () => {
    expect(FRUITS).toEqual(['strawberry', 'banana', 'lime', 'blueberry']);
    const deck = makeDeck();
    expect(deck).toHaveLength(56);
    for (const fruit of FRUITS) {
      expect(deck.filter((c) => c.fruit === fruit)).toHaveLength(14);
    }
  });

  it('과일마다 개수별 장수가 COPIES와 같고 과일 수 합은 33이다', () => {
    const deck = makeDeck();
    for (const fruit of FRUITS) {
      const mine = deck.filter((c) => c.fruit === fruit);
      for (const count of [1, 2, 3, 4, 5] as const) {
        expect(mine.filter((c) => c.count === count)).toHaveLength(COPIES[count]);
      }
      expect(mine.reduce((sum, c) => sum + c.count, 0)).toBe(33);
    }
  });
});

describe('deal', () => {
  it.each([
    [2, [28, 28]],
    [3, [19, 19, 18]],
    [4, [14, 14, 14, 14]],
  ])('%i명이면 장수가 %j이고 합치면 원래 카드와 같다', (n, sizes) => {
    const deck = makeDeck();
    const hands = deal(deck, n);
    expect(hands.map((h) => h.length)).toEqual(sizes);
    expect(keys(hands.flat())).toEqual(keys(deck));
  });

  it('사람당 장수를 정하면 앞에서부터 인원 × 장수만 나누고 나머지는 쓰지 않는다', () => {
    const deck = makeDeck();
    const hands = deal(deck, 4, 8);
    expect(hands.map((h) => h.length)).toEqual([8, 8, 8, 8]);
    expect(hands.flat()).toHaveLength(32);
    expect(hands[0][0]).toBe(deck[0]);
    expect(hands[3][7]).toBe(deck[31]);
  });

  it('사람당 장수가 null이면 전부 나눈다', () => {
    expect(deal(makeDeck(), 3, null).map((h) => h.length)).toEqual([19, 19, 18]);
  });

  it('i번째 카드는 i % 인원번 사람에게 받은 순서대로 간다', () => {
    const cards = [card('lime', 1), card('lime', 2), card('lime', 3), card('lime', 4), card('lime', 5)];
    expect(deal(cards, 2)).toEqual([
      [cards[0], cards[2], cards[4]],
      [cards[1], cards[3]],
    ]);
  });
});

describe('fruitTotals', () => {
  it('보이는 카드의 과일 수를 과일별로 더하고 빈 자리는 건너뛴다', () => {
    expect(fruitTotals([card('banana', 2), null, card('lime', 3), card('banana', 1)])).toEqual({
      strawberry: 0,
      banana: 3,
      lime: 3,
      blueberry: 0,
    });
  });
});

describe('hasFive', () => {
  it('바나나 2 + 바나나 3이면 맞다 (빈 자리는 건너뛴다)', () => {
    expect(hasFive([card('banana', 2), card('banana', 3), null])).toBe(true);
  });

  it('바나나 2 + 바나나 4는 6이라 틀리다', () => {
    expect(hasFive([card('banana', 2), card('banana', 4)])).toBe(false);
  });

  it('라임 5 한 장이면 맞다', () => {
    expect(hasFive([card('lime', 5)])).toBe(true);
  });

  it('과일이 다르면 더하지 않는다', () => {
    expect(hasFive([card('lime', 2), card('strawberry', 3)])).toBe(false);
  });

  it('보이는 카드가 없으면 틀리다', () => {
    expect(hasFive([])).toBe(false);
  });
});
