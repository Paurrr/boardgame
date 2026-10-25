import type { Card, Fruit, FruitCount } from './types';

export const FRUITS: readonly Fruit[] = ['strawberry', 'banana', 'lime', 'blueberry'];

/** 과일 하나에서 개수별 장수 (과일마다 14장, 과일 수 합 33) */
export const COPIES: Record<FruitCount, number> = { 1: 5, 2: 3, 3: 3, 4: 2, 5: 1 };

const COUNTS: readonly FruitCount[] = [1, 2, 3, 4, 5];

/** 56장, 섞기 전 순서 */
export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const fruit of FRUITS) {
    for (const count of COUNTS) {
      for (let i = 0; i < COPIES[count]; i++) deck.push({ fruit, count });
    }
  }
  return deck;
}

/**
 * i번째 카드는 i % playerCount번 사람에게 간다. 받은 순서가 그대로 엎은 더미 순서다.
 * cardsEach가 있으면 앞에서부터 playerCount × cardsEach장만 나누고 나머지는 쓰지 않는다
 */
export function deal(cards: readonly Card[], playerCount: number, cardsEach: number | null = null): Card[][] {
  const used = cardsEach === null ? cards : cards.slice(0, playerCount * cardsEach);
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  used.forEach((card, i) => hands[i % playerCount].push(card));
  return hands;
}

/** 보이는 카드의 과일 수를 과일별로 더한다. null(빈 자리)은 건너뛴다 */
export function fruitTotals(tops: readonly (Card | null)[]): Record<Fruit, number> {
  const totals: Record<Fruit, number> = { strawberry: 0, banana: 0, lime: 0, blueberry: 0 };
  for (const card of tops) {
    if (card) totals[card.fruit] += card.count;
  }
  return totals;
}

/** 어느 과일이든 합이 정확히 5면 종을 쳐도 된다 */
export function hasFive(tops: readonly (Card | null)[]): boolean {
  const totals = fruitTotals(tops);
  return FRUITS.some((fruit) => totals[fruit] === 5);
}
