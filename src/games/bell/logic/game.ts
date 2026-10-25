import { createRng } from '../../../lib/random';
import { deal, hasFive, makeDeck } from './cards';
import type { BellAction, BellState, Card } from './types';

export function createBellGame(playerCount: number, seed: number): BellState {
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4) {
    throw new RangeError(`인원은 2~4명이어야 합니다: ${playerCount}`);
  }
  const hands = deal(createRng(seed).shuffle(makeDeck()), playerCount);
  return {
    piles: hands.map((down) => ({ down, up: [] })),
    turn: 0,
    outOrder: [],
    winner: null,
    lastRing: null,
  };
}

/** 자리마다 보이는 카드. 펼친 카드가 없으면 null */
export function topCards(state: BellState): (Card | null)[] {
  return state.piles.map((pile) => (pile.up.length > 0 ? pile.up[pile.up.length - 1] : null));
}

export function isOut(state: BellState, player: number): boolean {
  return state.outOrder.includes(player);
}

/** from 다음 자리부터 돌며 탈락하지 않은 첫 사람 */
function nextPlayer(playerCount: number, outOrder: readonly number[], from: number): number {
  for (let i = 1; i <= playerCount; i++) {
    const q = (from + i) % playerCount;
    if (!outOrder.includes(q)) return q;
  }
  return from;
}

/** 탈락하지 않은 사람이 한 명이면 그 사람 */
function lastOneLeft(playerCount: number, outOrder: readonly number[]): number | null {
  if (outOrder.length !== playerCount - 1) return null;
  for (let p = 0; p < playerCount; p++) {
    if (!outOrder.includes(p)) return p;
  }
  return null;
}

function flip(state: BellState, player: number): BellState {
  if (player !== state.turn) return state;
  const n = state.piles.length;
  const { down, up } = state.piles[player];
  const rest = down.slice(1);
  const piles = state.piles.slice();
  piles[player] = { down: rest, up: [...up, down[0]] };
  const outOrder = rest.length === 0 ? [...state.outOrder, player] : state.outOrder;
  return {
    ...state,
    piles,
    outOrder,
    turn: nextPlayer(n, outOrder, player),
    winner: lastOneLeft(n, outOrder),
  };
}

function ring(state: BellState, player: number): BellState {
  if (isOut(state, player)) return state;
  const n = state.piles.length;

  if (hasFive(topCards(state))) {
    const taken = state.piles.flatMap((pile) => pile.up);
    const piles = state.piles.map((pile, i) => ({
      down: i === player ? [...pile.down, ...taken] : pile.down,
      up: [],
    }));
    return { ...state, piles, turn: player, lastRing: { kind: 'correct', player, gained: taken.length } };
  }

  const downs = state.piles.map((pile) => pile.down.slice());
  const paidTo: number[] = [];
  for (let i = 1; i < n && downs[player].length > 0; i++) {
    const q = (player + i) % n;
    if (isOut(state, q)) continue;
    downs[q].push(downs[player].shift() as Card);
    paidTo.push(q);
  }
  const piles = state.piles.map((pile, i) => ({ down: downs[i], up: pile.up }));
  const goneOut = downs[player].length === 0;
  const outOrder = goneOut ? [...state.outOrder, player] : state.outOrder;
  const turn = goneOut && state.turn === player ? nextPlayer(n, outOrder, player) : state.turn;
  return {
    ...state,
    piles,
    outOrder,
    turn,
    winner: lastOneLeft(n, outOrder),
    lastRing: { kind: 'wrong', player, paidTo },
  };
}

/** 무시되는 동작은 같은 객체를 돌려준다 */
export function bellReducer(state: BellState, action: BellAction): BellState {
  if (action.type === 'CONTINUE') return state.lastRing === null ? state : { ...state, lastRing: null };
  if (state.lastRing !== null || state.winner !== null) return state;
  return action.type === 'FLIP' ? flip(state, action.player) : ring(state, action.player);
}

/** 이긴 사람 → 아직 남은 사람(자리 순) → 늦게 탈락한 사람 순 */
export function ranking(state: BellState): number[] {
  const left = state.piles
    .map((_, i) => i)
    .filter((i) => i !== state.winner && !isOut(state, i));
  const first = state.winner === null ? [] : [state.winner];
  return [...first, ...left, ...state.outOrder.slice().reverse()];
}
