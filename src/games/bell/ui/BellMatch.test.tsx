import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Difficulty } from '../../../lib/difficulty';
import { isMuted, setMuted, sounds } from '../../../lib/sound';
import { hasFive } from '../logic/cards';
import { bellReducer, createBellGame, topCards } from '../logic/game';
import { BellMatch, END_SHOW_MS, RING_SHOW_MS } from './BellMatch';

const NAMES = ['민준', '서연', '아빠'];
const MINUS = '−';

function renderMatch(names: readonly string[] = NAMES, seed = 1, level: Difficulty = 'easy') {
  const onExit = vi.fn();
  const onReplay = vi.fn();
  const utils = render(
    <BellMatch playerNames={names} seed={seed} level={level} onExit={onExit} onReplay={onReplay} />,
  );
  return { ...utils, onExit, onReplay };
}

const column = (i: number) => within(screen.getAllByTestId('player-column')[i]);
const flipButton = (i: number) => column(i).getByRole('button', { name: /뒤집기/ });
const bell = (i: number) => column(i).getByRole('button', { name: '종' });
const notice = (i: number) => column(i).getByTestId('lane-notice');
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function bellDown(i: number, pointerId: number) {
  fireEvent.pointerDown(bell(i), { pointerId, clientX: 50, clientY: 50 });
}

function bellUp(i: number, pointerId: number, clientX = 50) {
  fireEvent.pointerUp(bell(i), { pointerId, clientX, clientY: 50 });
}

/** 같은 손가락으로 같은 자리에서 톡 */
function tap(i: number, pointerId = 10 + i) {
  bellDown(i, pointerId);
  bellUp(i, pointerId);
}

function flip(i: number) {
  fireEvent.pointerDown(flipButton(i), { pointerId: 99 });
}

function expectCounts(counts: number[]) {
  counts.forEach((n, i) => expect(flipButton(i)).toHaveTextContent(`${n}장`));
}

describe('BellMatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('칸마다 뒤집기·종이 있고 처음에는 0번만 뒤집을 수 있다', () => {
    renderMatch();
    expect(screen.getAllByTestId('player-column')).toHaveLength(3);
    expect(screen.queryByTestId('clock')).toBeNull();
    expect(screen.queryByText(/라운드/)).toBeNull();
    expect(flipButton(0)).not.toHaveAttribute('aria-disabled', 'true');
    expect(flipButton(1)).toHaveAttribute('aria-disabled', 'true');
    expect(flipButton(2)).toHaveAttribute('aria-disabled', 'true');
    expect(column(0).queryByTestId('fruit-card')).toBeNull();
    expectCounts([19, 19, 18]);

    flip(0);
    expect(column(0).getByTestId('fruit-card')).toBeInTheDocument();
    expect(flipButton(0)).toHaveAttribute('aria-disabled', 'true');
    expect(flipButton(1)).not.toHaveAttribute('aria-disabled', 'true');
    expect(column(1).getByText('차례!')).toBeInTheDocument();
    expectCounts([18, 19, 18]);
  });

  it('5가 되면 먼저 톡 친 사람이 펼친 카드를 다 가져간다', () => {
    const seed = 1;
    let state = createBellGame(3, seed);
    const order: number[] = [];
    while (!hasFive(topCards(state)) && order.length < 50) {
      order.push(state.turn);
      state = bellReducer(state, { type: 'FLIP', player: state.turn });
    }
    expect(hasFive(topCards(state))).toBe(true);
    const shown = state.piles.reduce((n, pile) => n + pile.up.length, 0);
    const ding = vi.spyOn(sounds, 'ding');

    renderMatch(NAMES, seed);
    order.forEach(flip);
    tap(2);
    expect(notice(2)).toHaveTextContent(`아빠 먼저! +${shown}장`);
    expect(notice(0)).toHaveTextContent('아빠 먼저!');
    expect(flipButton(2)).toHaveTextContent(`${state.piles[2].down.length + shown}장`);
    expect(column(0).queryByTestId('fruit-card')).toBeNull();
    expect(ding).toHaveBeenCalledTimes(1);

    advance(RING_SHOW_MS);
    expect(notice(2)).toBeEmptyDOMElement();
    expect(notice(0)).toBeEmptyDOMElement();
    // 맞게 친 사람이 다음에 뒤집는다
    expect(flipButton(2)).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('틀린 종은 다른 사람마다 한 장씩 주고, 결과를 보여 주는 동안 뒤집기를 막는다', () => {
    const buzz = vi.spyOn(sounds, 'buzz');
    renderMatch();
    tap(1);
    expect(notice(1)).toHaveTextContent(`서연 틀렸어요 ${MINUS}2장`);
    expect(notice(0)).toHaveTextContent('+1장');
    expect(notice(2)).toHaveTextContent('+1장');
    expectCounts([20, 17, 19]);
    expect(buzz).toHaveBeenCalledTimes(1);
    expect(flipButton(0)).toHaveAttribute('aria-disabled', 'true');

    advance(RING_SHOW_MS);
    expect(notice(1)).toBeEmptyDOMElement();
    expect(flipButton(0)).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('길게 누르거나 움직이며 뗀 종은 무시한다', () => {
    renderMatch();
    bellDown(0, 5);
    advance(300);
    bellUp(0, 5);
    bellDown(1, 6);
    bellUp(1, 6, 80);
    advance(RING_SHOW_MS);
    [0, 1, 2].forEach((i) => expect(notice(i)).toBeEmptyDOMElement());
    expectCounts([19, 19, 18]);
  });

  it('종을 누르고 있는 동안(300ms 전)에는 차례인 칸의 뒤집기를 무시한다', () => {
    renderMatch();
    bellDown(1, 7);
    flip(0);
    expect(column(0).queryByTestId('fruit-card')).toBeNull();
    expectCounts([19, 19, 18]);

    advance(300);
    flip(0);
    expect(column(0).getByTestId('fruit-card')).toBeInTheDocument();
  });

  it('판정 뒤 늦게 뗀 손가락과 결과 표시 중의 종은 무시한다', () => {
    renderMatch();
    bellDown(0, 1);
    bellDown(1, 2);
    bellUp(0, 1);
    expect(notice(0)).toHaveTextContent(`민준 틀렸어요 ${MINUS}2장`);
    expectCounts([17, 20, 19]);

    bellUp(1, 2);
    tap(2);
    expect(notice(0)).toHaveTextContent(`민준 틀렸어요 ${MINUS}2장`);
    expect(notice(1)).toHaveTextContent('+1장');
    expect(notice(2)).toHaveTextContent('+1장');
    expectCounts([17, 20, 19]);

    // 남아 있던 300ms 타이머가 돌아도 두 번째 판정이 생기지 않는다
    advance(RING_SHOW_MS);
    [0, 1, 2].forEach((i) => expect(notice(i)).toBeEmptyDOMElement());
    expectCounts([17, 20, 19]);
  });

  it('카드가 떨어진 사람은 탈락하고, 한 명이 남으면 잠시 뒤 결과 화면', () => {
    renderMatch(['민준', '서연']);
    for (let k = 0; k < 27; k++) {
      tap(0);
      advance(RING_SHOW_MS);
    }
    expectCounts([1, 55]);
    tap(0);
    expect(column(0).getByText('탈락')).toBeInTheDocument();
    expect(bell(0)).toBeDisabled();
    expect(screen.queryByRole('heading', { name: '서연 우승!' })).toBeNull();

    advance(END_SHOW_MS);
    expect(screen.getByRole('heading', { name: '서연 우승!' })).toBeInTheDocument();
    expect(screen.queryAllByTestId('player-column')).toHaveLength(0);
  });

  it('결과 화면의 버튼은 다시 하기·메뉴로 콜백을 부른다', () => {
    const { onExit, onReplay } = renderMatch(['민준', '서연']);
    for (let k = 0; k < 28; k++) {
      tap(0);
      advance(RING_SHOW_MS);
    }
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('판정 대기·결과 표시 중에 나가도 에러가 없다', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const quit = (onExit: () => void) => {
      fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
      expect(onExit).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: '정말 그만?' }));
    };

    // 판정 대기 중
    const waiting = renderMatch();
    bellDown(1, 3);
    quit(waiting.onExit);
    expect(waiting.onExit).toHaveBeenCalledTimes(1);
    waiting.unmount();
    expect(() => act(() => vi.runAllTimers())).not.toThrow();

    // 결과 표시 중
    const showing = renderMatch();
    tap(1);
    quit(showing.onExit);
    expect(showing.onExit).toHaveBeenCalledTimes(1);
    showing.unmount();
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
