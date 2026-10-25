import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Slot } from '../logic/types';
import { Board } from './Board';

const COLOR = '#2A6FD0';

/** 16칸, taken에 든 칸은 0번 사람이 가져갔다 */
function slots16(taken: number[] = []): Slot[] {
  return Array.from({ length: 16 }, (_, i) => ({ picture: i % 8, takenBy: taken.includes(i) ? 0 : null }));
}

function renderBoard(props: { open?: number[]; taken?: number[] } = {}) {
  const onTap = vi.fn<(i: number) => void>();
  render(<Board rows={4} cols={4} slots={slots16(props.taken)} open={props.open ?? []} color={COLOR} onTap={onTap} />);
  return onTap;
}

const slotAt = (i: number) => screen.getAllByTestId('slot')[i];

describe('Board', () => {
  beforeEach(() => {
    // usePointerDrag는 누른 시간을 Date.now()로 잰다
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('칸마다 카드를 줄 순서로 그린다', () => {
    renderBoard();
    const slots = screen.getAllByTestId('slot');
    expect(slots).toHaveLength(16);
    slots.forEach((s, i) => expect(s).toHaveAttribute('data-index', String(i)));
  });

  it('viewBox를 칸 크기·간격·여백으로 정하고 부모를 채운다', () => {
    renderBoard();
    const board = screen.getByTestId('board');
    const [x, y, w, h] = (board.getAttribute('viewBox') ?? '').split(' ').map(Number);
    expect([x, y]).toEqual([0, 0]);
    // 4칸 × 100 + 간격 3 × 8 + 여백 2 × 16 = 456
    expect(w).toBe(456);
    expect(h).toBeGreaterThanOrEqual(456);
    expect(board).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  });

  it('open에 든 칸만 앞면이고 가져간 칸은 빈자리다', () => {
    renderBoard({ open: [2, 5], taken: [0, 9] });
    expect(screen.getAllByTestId('card-face')).toHaveLength(2);
    expect(slotAt(2).querySelector('[data-testid="card-face"]')).not.toBeNull();
    expect(slotAt(5).querySelector('[data-testid="card-face"]')).not.toBeNull();
    expect(screen.getAllByTestId('empty-slot')).toHaveLength(2);
    expect(slotAt(0).querySelector('[data-testid="empty-slot"]')).not.toBeNull();
    expect(slotAt(9).querySelector('[data-testid="empty-slot"]')).not.toBeNull();
    expect(screen.getAllByTestId('card-back')).toHaveLength(12);
  });

  it('칸을 탭하면 그 칸 번호를 알린다', () => {
    const onTap = renderBoard();
    fireEvent.pointerDown(slotAt(5), { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(screen.getByTestId('board'), { pointerId: 1, clientX: 50, clientY: 50 });
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith(5);
  });

  it('뒤집어도 되는지는 따지지 않고 앞면·빈자리 칸의 탭도 알린다', () => {
    const onTap = renderBoard({ open: [2], taken: [9] });
    const board = screen.getByTestId('board');
    fireEvent.pointerDown(slotAt(2), { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerDown(slotAt(9), { pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(board, { pointerId: 2, clientX: 0, clientY: 0 });
    expect(onTap.mock.calls).toEqual([[2], [9]]);
  });

  it('오래 누르거나 끌면 뒤집지 않는다', () => {
    const onTap = renderBoard();
    const board = screen.getByTestId('board');

    // 판에 기댄 손바닥: 오래 누르고 뗀다
    fireEvent.pointerDown(slotAt(3), { pointerId: 1, clientX: 50, clientY: 50 });
    vi.advanceTimersByTime(400);
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 50, clientY: 50 });

    // 끄는 손가락: 20px 움직인 뒤 뗀다
    fireEvent.pointerDown(slotAt(4), { pointerId: 2, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(board, { pointerId: 2, clientX: 70, clientY: 50 });
    fireEvent.pointerUp(board, { pointerId: 2, clientX: 70, clientY: 50 });

    expect(onTap).not.toHaveBeenCalled();
  });

  it('두 손가락이 서로 다른 칸을 탭하면 둘 다 알린다', () => {
    const onTap = renderBoard();
    const board = screen.getByTestId('board');
    fireEvent.pointerDown(slotAt(1), { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerDown(slotAt(6), { pointerId: 2, clientX: 300, clientY: 0 });
    fireEvent.pointerUp(board, { pointerId: 2, clientX: 300, clientY: 0 });
    fireEvent.pointerUp(board, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(onTap.mock.calls).toEqual([[6], [1]]);
  });

  it('판 테두리는 받은 색이다', () => {
    renderBoard();
    const frame = screen.getByTestId('board-frame');
    expect(frame).toHaveAttribute('stroke', COLOR);
    expect(frame).toHaveAttribute('fill', 'none');
  });
});
