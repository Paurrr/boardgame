import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FinalResult } from './FinalResult';

const players = [
  { name: '민준', difficulty: 'easy' as const },
  { name: '서연', difficulty: 'normal' as const },
  { name: '아빠', difficulty: 'hard' as const },
];

describe('FinalResult', () => {
  it('최고점이 한 명이면 그 사람이 우승, 점수 순으로 보여준다', () => {
    render(<FinalResult players={players} totals={[5, 9, 7]} onReplay={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '서연 우승!' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['서연9점우승', '아빠7점', '민준5점']);
  });

  it('동점이면 공동 우승', () => {
    render(<FinalResult players={players} totals={[9, 9, 1]} onReplay={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '공동 우승!' })).toBeInTheDocument();
    expect(screen.getAllByText('우승')).toHaveLength(2);
  });

  it('혼자 했으면 우승 대신 끝 인사', () => {
    render(<FinalResult players={[players[0]]} totals={[12]} onReplay={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '다 했어요!' })).toBeInTheDocument();
    expect(screen.queryByText('우승')).toBeNull();
  });

  it('다시 하기 / 메뉴로', () => {
    const onReplay = vi.fn();
    const onExit = vi.fn();
    render(<FinalResult players={players} totals={[1, 2, 3]} onReplay={onReplay} onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
