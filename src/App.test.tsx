import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const openSetup = () => fireEvent.click(screen.getByRole('button', { name: /블록 퍼즐/ }));

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('메뉴 → 설정 → 시작하면 카운트다운 뒤 칸마다 퍼즐이 나온다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
    openSetup();
    fireEvent.click(screen.getByRole('button', { name: '3명' }));
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(screen.getAllByTestId('player-column')).toHaveLength(3);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getAllByTestId('puzzle-svg')).toHaveLength(3);
  });

  it('마지막 설정을 기억한다', () => {
    render(<App />);
    openSetup();
    fireEvent.click(screen.getByRole('button', { name: '4명' }));
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
    fireEvent.click(screen.getByRole('button', { name: '정말 그만?' }));
    openSetup();
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });

  it('설정에서 메뉴로 돌아갈 수 있다', () => {
    render(<App />);
    openSetup();
    fireEvent.click(screen.getByRole('button', { name: '← 메뉴' }));
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
  });
});
