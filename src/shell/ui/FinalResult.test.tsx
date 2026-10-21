import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerConfig, Standing } from '../logic/match';
import { FinalResult } from './FinalResult';

const players = [
  { name: '민준', difficulty: 'easy' as const },
  { name: '서연', difficulty: 'normal' as const },
  { name: '아빠', difficulty: 'hard' as const },
];

const row = (player: number, total: number, winner = false, timeMs = 60000, solved = 5): Standing => ({
  player,
  total,
  timeMs,
  solved,
  winner,
});

type Options = { players?: PlayerConfig[]; roundsPlayed?: number; rounds?: number; onReplay?: () => void; onExit?: () => void };

function renderResult(standings: Standing[], options: Options = {}) {
  return render(
    <FinalResult
      players={options.players ?? players}
      standings={standings}
      roundsPlayed={options.roundsPlayed ?? 5}
      rounds={options.rounds ?? 5}
      onReplay={options.onReplay ?? vi.fn()}
      onExit={options.onExit ?? vi.fn()}
    />,
  );
}

describe('FinalResult', () => {
  it('우승자가 한 명이면 그 사람이 우승, 순위표 순서대로 보여준다', () => {
    renderResult([row(1, 9, true), row(2, 7), row(0, 5)]);
    expect(screen.getByRole('heading', { name: '서연 우승!' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('서연');
    expect(items[0]).toHaveTextContent('9점');
    expect(items[0]).toHaveTextContent('우승');
    expect(items[1]).toHaveTextContent('아빠');
    expect(items[1]).toHaveTextContent('7점');
    expect(items[1]).not.toHaveTextContent('우승');
    expect(items[2]).toHaveTextContent('민준');
    expect(items[2]).toHaveTextContent('5점');
  });

  it('동점이면 공동 우승', () => {
    renderResult([row(0, 9, true), row(1, 9, true), row(2, 1)]);
    expect(screen.getByRole('heading', { name: '공동 우승!' })).toBeInTheDocument();
    expect(screen.getAllByText('우승')).toHaveLength(2);
  });

  it('점수가 같아도 시간으로 가린 우승자가 한 명이면 그 사람만 우승', () => {
    renderResult([row(2, 9, true, 50000), row(0, 9, false, 62300), row(1, 3)]);
    expect(screen.getByRole('heading', { name: '아빠 우승!' })).toBeInTheDocument();
    expect(screen.getAllByText('우승')).toHaveLength(1);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('아빠');
    expect(items[1]).toHaveTextContent('민준');
  });

  it('각 줄에 총 걸린 시간과 푼 라운드 수를 보여준다', () => {
    renderResult([row(1, 9, true, 62300, 4), row(0, 5, false, 45200, 2)]);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('총 1분 02.3초');
    expect(items[0]).toHaveTextContent('4/5 완성');
    expect(items[1]).toHaveTextContent('총 45.2초');
    expect(items[1]).toHaveTextContent('2/5 완성');
  });

  it('판 시간이 다 돼 일찍 끝났으면 몇 라운드까지 했는지 알려준다', () => {
    renderResult([row(1, 6, true, 50000, 2), row(0, 2, false, 50000, 1)], { roundsPlayed: 3, rounds: 5 });
    expect(screen.getByText('시간이 다 됐어요 · 3/5 라운드')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('2/3 완성');
  });

  it('라운드를 다 했으면 시간이 다 됐다는 글자가 없다', () => {
    renderResult([row(1, 6, true), row(0, 2)], { roundsPlayed: 5, rounds: 5 });
    expect(screen.queryByText(/시간이 다 됐어요/)).toBeNull();
  });

  it('혼자 했으면 우승 대신 끝 인사', () => {
    renderResult([row(0, 12, true)], { players: [players[0]] });
    expect(screen.getByRole('heading', { name: '다 했어요!' })).toBeInTheDocument();
  });

  it('혼자면 순위표가 winner여도 우승 표시가 없다', () => {
    renderResult([row(0, 12, true)], { players: [players[0]] });
    expect(screen.queryByText('우승')).toBeNull();
  });

  it('다시 하기 / 메뉴로', () => {
    const onReplay = vi.fn();
    const onExit = vi.fn();
    renderResult([row(2, 3, true), row(1, 2), row(0, 1)], { onReplay, onExit });
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
