import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { OwnMatchGame, OwnMatchProps } from './games/types';

// 경기 화면을 통째로 맡는 게임(own)이 셸에서 이어지는지 보려고 등록 목록에 가짜 게임 하나를 더한다
const { ownGame } = vi.hoisted(() => {
  function FakeMatch({ playerNames, seed, level, onExit, onReplay }: OwnMatchProps) {
    return (
      <div data-testid="own-match" data-seed={seed} data-level={level}>
        {playerNames.join(',')}
        <button type="button" onClick={onExit}>
          나가기
        </button>
        <button type="button" onClick={onReplay}>
          또
        </button>
      </div>
    );
  }
  const game: OwnMatchGame = {
    kind: 'own',
    id: 'own-test',
    name: '시험 경기',
    description: '셸 시험용',
    minPlayers: 2,
    maxPlayers: 4,
    Match: FakeMatch,
    levels: { easy: '쉬운 설명', normal: '보통 설명', hard: '어려운 설명' },
  };
  return { ownGame: game };
});

vi.mock('./games/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./games/registry')>();
  return { ...actual, GAMES: [...actual.GAMES, ownGame] };
});

const startOwnMatch = () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /시험 경기/ }));
  fireEvent.click(screen.getByRole('button', { name: '시작!' }));
};

describe('App (경기 화면을 맡는 게임)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('메뉴 → 설정 → 시작하면 게임의 경기 화면에 플레이어 이름을 넘긴다', () => {
    startOwnMatch();
    expect(screen.getByTestId('own-match')).toHaveTextContent('플레이어 1,플레이어 2');
  });

  it('판 난이도는 처음에 보통이고, 고른 난이도를 경기 화면에 넘기고 다음에도 기억한다', () => {
    startOwnMatch();
    expect(screen.getByTestId('own-match')).toHaveAttribute('data-level', 'normal');
    fireEvent.click(screen.getByRole('button', { name: '나가기' }));
    fireEvent.click(screen.getByRole('button', { name: /시험 경기/ }));
    fireEvent.click(screen.getByRole('button', { name: '어려움' }));
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(screen.getByTestId('own-match')).toHaveAttribute('data-level', 'hard');
    fireEvent.click(screen.getByRole('button', { name: '또' }));
    expect(screen.getByTestId('own-match')).toHaveAttribute('data-level', 'hard');
    fireEvent.click(screen.getByRole('button', { name: '나가기' }));
    fireEvent.click(screen.getByRole('button', { name: /시험 경기/ }));
    expect(screen.getByRole('button', { name: '어려움' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('또 하면 새 시드로 다시 마운트하고, 나가면 메뉴로 간다', () => {
    startOwnMatch();
    const firstSeed = screen.getByTestId('own-match').getAttribute('data-seed');
    fireEvent.click(screen.getByRole('button', { name: '또' }));
    expect(screen.getByTestId('own-match')).toBeInTheDocument();
    expect(screen.getByTestId('own-match').getAttribute('data-seed')).not.toBe(firstSeed);
    fireEvent.click(screen.getByRole('button', { name: '나가기' }));
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
  });
});
