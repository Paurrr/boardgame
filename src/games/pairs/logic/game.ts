import type { Difficulty } from '../../../lib/difficulty';
import { createRng } from '../../../lib/random';
import { cardCount, PICTURE_COUNT } from './level';
import type { PairsAction, PairsState, Slot, Standing } from './types';

export function createPairsGame(playerCount: number, seed: number, level: Difficulty): PairsState {
  if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 4) {
    throw new RangeError(`인원은 1~4명이어야 합니다: ${playerCount}`);
  }
  const rng = createRng(seed);
  const all = Array.from({ length: PICTURE_COUNT }, (_, i) => i);
  const chosen = rng.shuffle(all).slice(0, cardCount(level) / 2);
  const deck = rng.shuffle([...chosen, ...chosen]);
  return {
    playerCount,
    slots: deck.map((picture) => ({ picture, takenBy: null })),
    open: [],
    pending: null,
    turn: 0,
    pairs: Array.from({ length: playerCount }, () => 0),
    tries: 0,
  };
}

export function isOver(state: PairsState): boolean {
  return state.slots.every((slot) => slot.takenBy !== null);
}

function flip(state: PairsState, index: number): PairsState {
  if (state.pending !== null || isOver(state)) return state;
  if (!Number.isInteger(index) || index < 0 || index >= state.slots.length) return state;
  if (state.slots[index].takenBy !== null || state.open.includes(index)) return state;

  if (state.open.length === 0) return { ...state, open: [index] };
  const first = state.open[0];
  const same = state.slots[first].picture === state.slots[index].picture;
  return { ...state, open: [first, index], pending: same ? 'match' : 'miss', tries: state.tries + 1 };
}

function settle(state: PairsState): PairsState {
  if (state.pending === 'miss') {
    return { ...state, open: [], pending: null, turn: (state.turn + 1) % state.playerCount };
  }
  const { turn, open } = state;
  const slots: Slot[] = state.slots.map((slot, i) => (open.includes(i) ? { ...slot, takenBy: turn } : slot));
  const pairs = state.pairs.map((n, p) => (p === turn ? n + 1 : n));
  return { ...state, slots, pairs, open: [], pending: null };
}

/** 무시되는 동작은 같은 객체를 돌려준다 */
export function pairsReducer(state: PairsState, action: PairsAction): PairsState {
  if (action.type === 'CONTINUE') return state.pending === null ? state : settle(state);
  return flip(state, action.index);
}

/** 짝 수 내림차순, 같으면 자리 순. place = 1 + 나보다 짝이 많은 사람 수 */
export function standings(state: PairsState): Standing[] {
  return state.pairs
    .map((pairs, player) => ({ player, pairs, place: 1 + state.pairs.filter((n) => n > pairs).length }))
    .sort((a, b) => b.pairs - a.pairs || a.player - b.player);
}
