export type Fruit = 'strawberry' | 'banana' | 'lime' | 'blueberry';

export type FruitCount = 1 | 2 | 3 | 4 | 5;

export type Card = { fruit: Fruit; count: FruitCount };

/** down[0]이 다음에 뒤집을 카드, up의 마지막이 보이는 카드 */
export type Pile = { down: Card[]; up: Card[] };

export type RingResult =
  | { kind: 'correct'; player: number; gained: number }
  | { kind: 'wrong'; player: number; paidTo: number[] };

export type BellState = {
  piles: Pile[];
  turn: number;
  /** 탈락한 순서 */
  outOrder: number[];
  /** 마지막 한 명. 끝나기 전에는 null */
  winner: number | null;
  /** 결과를 보여 주는 동안 null이 아니고, 그동안 FLIP·RING을 무시한다 */
  lastRing: RingResult | null;
};

export type BellAction = { type: 'FLIP'; player: number } | { type: 'RING'; player: number } | { type: 'CONTINUE' };
