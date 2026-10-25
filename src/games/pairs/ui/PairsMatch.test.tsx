import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Difficulty } from '../../../lib/difficulty';
import { isMuted, setMuted, sounds } from '../../../lib/sound';
import { memoryStore } from '../../../lib/storage';
import type { KeyValueStore } from '../../../lib/storage';
import { loadBestTimes } from '../../../shell/logic/persistence';
import { PLAYER_COLORS } from '../../../shell/ui/colors';
import { createPairsGame } from '../logic/game';
import { FLIP_MS } from './Card';
import { BANNER_MS, END_SHOW_MS, MATCH_SHOW_MS, PairsMatch } from './PairsMatch';

const TWO = ['민수', '지우'];
const SEED = 1;

type Options = { names?: readonly string[]; level?: Difficulty; store?: KeyValueStore };

function renderMatch({ names = TWO, level = 'easy', store = memoryStore() }: Options = {}) {
  const onExit = vi.fn();
  const onReplay = vi.fn();
  const utils = render(
    <PairsMatch playerNames={names} seed={SEED} level={level} store={store} onExit={onExit} onReplay={onReplay} />,
  );
  return { ...utils, onExit, onReplay };
}

/** 같은 seed로 따로 만든 판에서 그림마다 두 칸을 찾는다 (처음 나온 순서) */
function pairsOf(names: readonly string[] = TWO, level: Difficulty = 'easy'): number[][] {
  const byPicture = new Map<number, number[]>();
  createPairsGame(names.length, SEED, level).slots.forEach((slot, i) => {
    byPicture.set(slot.picture, [...(byPicture.get(slot.picture) ?? []), i]);
  });
  return [...byPicture.values()];
}

const slot = (i: number) => screen.getAllByTestId('slot')[i];
const faces = () => screen.queryAllByTestId('card-face').length;
const banner = () => screen.queryByRole('status');
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

/** 같은 손가락으로 같은 자리에서 눌렀다 뗀다 */
function tap(i: number) {
  fireEvent.pointerDown(slot(i), { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(slot(i), { pointerId: 1, clientX: 10, clientY: 10 });
}

/** 짝을 차례로 모두 맞춘다. 마지막 짝이 빠진 순간에 멈춘다 */
function findAll(pairs: number[][]) {
  pairs.forEach(([a, b], k) => {
    tap(a);
    tap(b);
    advance(FLIP_MS + MATCH_SHOW_MS);
    if (k < pairs.length - 1) advance(BANNER_MS);
  });
}

describe('PairsMatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('2명 쉬움이면 16장을 깔고 첫 사람 차례로 시작한다', () => {
    renderMatch();
    expect(screen.getAllByTestId('slot')).toHaveLength(16);
    expect(screen.getByText('민수 차례')).toBeInTheDocument();
    expect(screen.getByText('쉬움 · 16장 · 3초')).toBeInTheDocument();
    expect(screen.getByTestId('board-frame')).toHaveAttribute('stroke', PLAYER_COLORS[0]);
    expect(faces()).toBe(0);
    expect(banner()).toBeNull();
  });

  it('맞는 두 장은 잠시 보여 준 뒤 빠지고 같은 사람이 한 번 더 한다', () => {
    const solved = vi.spyOn(sounds, 'solved');
    renderMatch();
    const [[a, b]] = pairsOf();
    tap(a);
    tap(b);
    expect(faces()).toBe(2);
    expect(solved).toHaveBeenCalledTimes(1);

    advance(FLIP_MS + MATCH_SHOW_MS - 1);
    expect(faces()).toBe(2);
    expect(screen.queryAllByTestId('empty-slot')).toHaveLength(0);

    advance(1);
    expect(screen.getAllByTestId('empty-slot')).toHaveLength(2);
    expect(slot(a).querySelector('[data-testid="empty-slot"]')).not.toBeNull();
    expect(slot(b).querySelector('[data-testid="empty-slot"]')).not.toBeNull();
    expect(screen.getByText('1쌍')).toBeInTheDocument();
    expect(banner()).toHaveTextContent('한 번 더!');
    expect(banner()).toHaveStyle({ color: PLAYER_COLORS[0] });
    expect(screen.getByText('민수 차례')).toBeInTheDocument();
    expect(screen.getByTestId('board-frame')).toHaveAttribute('stroke', PLAYER_COLORS[0]);

    advance(BANNER_MS);
    expect(banner()).toBeNull();
  });

  it('틀린 두 장은 쉬움에서 3초 보여 준 뒤 엎고 다음 사람 차례를 알린다', () => {
    const go = vi.spyOn(sounds, 'go');
    renderMatch();
    const pairs = pairsOf();
    tap(pairs[0][0]);
    tap(pairs[1][0]);

    advance(FLIP_MS + 3000 - 1);
    expect(faces()).toBe(2);
    expect(banner()).toBeNull();
    expect(go).not.toHaveBeenCalled();

    advance(1);
    expect(faces()).toBe(0);
    expect(banner()).toHaveTextContent('지우 차례');
    expect(banner()).toHaveStyle({ color: PLAYER_COLORS[1] });
    expect(screen.getAllByText('지우 차례')).toHaveLength(2);
    expect(screen.queryByText('민수 차례')).toBeNull();
    expect(screen.getByTestId('board-frame')).toHaveAttribute('stroke', PLAYER_COLORS[1]);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('어려움에서 틀리면 1초만 보여 준다', () => {
    renderMatch({ level: 'hard' });
    expect(screen.getAllByTestId('slot')).toHaveLength(48);
    const pairs = pairsOf(TWO, 'hard');
    tap(pairs[0][0]);
    tap(pairs[1][0]);
    advance(FLIP_MS + 1000 - 1);
    expect(faces()).toBe(2);
    advance(1);
    expect(faces()).toBe(0);
  });

  it('두 장이 보이는 동안 셋째 칸을 눌러도 뒤집히지 않는다', () => {
    renderMatch();
    const pairs = pairsOf();
    tap(pairs[0][0]);
    tap(pairs[1][0]);
    tap(pairs[2][0]);
    expect(faces()).toBe(2);
    expect(slot(pairs[2][0]).querySelector('[data-testid="card-back"]')).not.toBeNull();
  });

  it('배너가 떠 있는 동안 누른 카드는 뒤집히지 않는다', () => {
    renderMatch();
    const pairs = pairsOf();
    tap(pairs[0][0]);
    tap(pairs[1][0]);
    advance(FLIP_MS + 3000);
    expect(banner()).not.toBeNull();

    tap(pairs[2][0]);
    expect(faces()).toBe(0);

    advance(BANNER_MS);
    expect(banner()).toBeNull();
    tap(pairs[2][0]);
    expect(faces()).toBe(1);
  });

  it('2명에서 한 사람이 다 찾으면 잠시 보여 준 뒤 결과로 간다', () => {
    renderMatch();
    findAll(pairsOf());
    expect(banner()).toBeNull();
    expect(screen.getByText('8쌍')).toBeInTheDocument();

    advance(END_SHOW_MS - 1);
    expect(screen.queryByRole('heading')).toBeNull();
    advance(1);
    expect(screen.getByRole('heading', { name: '민수 우승!' })).toBeInTheDocument();
  });

  it('1인 기록은 더 적을 때만 바뀐다', () => {
    const go = vi.spyOn(sounds, 'go');
    const store = memoryStore();
    const solo = ['민수'];
    const pairs = pairsOf(solo);

    // 처음: 틀리지 않고 다 찾는다. 혼자면 '한 번 더!'가 없다
    const first = renderMatch({ names: solo, store });
    tap(pairs[0][0]);
    tap(pairs[0][1]);
    advance(FLIP_MS + MATCH_SHOW_MS);
    expect(banner()).toBeNull();
    findAll(pairs.slice(1));
    advance(END_SHOW_MS);
    expect(screen.getByRole('heading', { name: '다 찾았어요!' })).toBeInTheDocument();
    expect(screen.getByText('8번 만에 다 찾았어요')).toBeInTheDocument();
    expect(screen.getByText('최고기록 8번')).toBeInTheDocument();
    expect(screen.getByText('새 기록!')).toBeInTheDocument();
    expect(loadBestTimes(store, 'pairs').easy).toBe(8);
    first.unmount();

    // 다시: 한 번 틀린다. 혼자면 차례 배너·소리가 없고 바로 다시 뒤집을 수 있다
    renderMatch({ names: solo, store });
    tap(pairs[0][0]);
    tap(pairs[1][0]);
    advance(FLIP_MS + 3000);
    expect(faces()).toBe(0);
    expect(banner()).toBeNull();
    expect(go).not.toHaveBeenCalled();
    findAll(pairs);
    advance(END_SHOW_MS);
    expect(screen.getByText('9번 만에 다 찾았어요')).toBeInTheDocument();
    expect(screen.getByText('최고기록 8번')).toBeInTheDocument();
    expect(screen.queryByText('새 기록!')).toBeNull();
    expect(loadBestTimes(store, 'pairs').easy).toBe(8);
  });

  it('보여 주는 중에 나가도 에러가 없다', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const quit = (onExit: () => void) => {
      fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
      expect(onExit).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: '정말 그만?' }));
    };
    const pairs = pairsOf();

    // 틀린 두 장을 보여 주는 중
    const showing = renderMatch();
    tap(pairs[0][0]);
    tap(pairs[1][0]);
    quit(showing.onExit);
    expect(showing.onExit).toHaveBeenCalledTimes(1);
    showing.unmount();
    expect(() => act(() => vi.runAllTimers())).not.toThrow();

    // 차례 배너 중
    const bannered = renderMatch();
    tap(pairs[0][0]);
    tap(pairs[1][0]);
    advance(FLIP_MS + 3000);
    expect(banner()).not.toBeNull();
    quit(bannered.onExit);
    expect(bannered.onExit).toHaveBeenCalledTimes(1);
    bannered.unmount();
    expect(() => act(() => vi.runAllTimers())).not.toThrow();

    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('소리 끄기·켜기는 위쪽 막대에서 바꾼다', () => {
    renderMatch();
    fireEvent.click(screen.getByRole('button', { name: '소리 끄기' }));
    expect(isMuted()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '소리 켜기' }));
    expect(isMuted()).toBe(false);
    setMuted(false);
  });
});
