import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blocksGame } from '../../games/blocks';
import type { OwnMatchGame, PuzzleGame } from '../../games/types';
import { defaultSetup } from '../logic/setup';
import type { SavedSetup } from '../logic/setup';
import { PlayerSetup } from './PlayerSetup';

const renderSetup = (game = blocksGame, initial = defaultSetup()) => {
  const onStart = vi.fn();
  const onBack = vi.fn();
  render(<PlayerSetup game={game} initial={initial} onStart={onStart} onBack={onBack} />);
  return { onStart, onBack };
};

const nameInputs = () => screen.getAllByRole('textbox');

// 경기 화면을 통째로 맡는 게임. 설정에서는 인원·이름만 고른다
const ownGame: OwnMatchGame = {
  kind: 'own',
  id: 'own',
  name: '시험 경기',
  description: '',
  minPlayers: 2,
  maxPlayers: 4,
  Match: () => null,
};

// 판 전체 난이도를 고르는 own 게임. 단계별 설명은 게임이 준다
const leveledGame: OwnMatchGame = {
  ...ownGame,
  levels: { easy: '쉬운 설명', normal: '보통 설명', hard: '어려운 설명' },
};

describe('PlayerSetup', () => {
  it('처음 설정값을 보여준다', () => {
    renderSetup();
    expect(nameInputs().map((el) => (el as HTMLInputElement).value)).toEqual(['플레이어 1', '플레이어 2']);
    expect(screen.getByRole('button', { name: '2명' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '5판' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '90초' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('게임이 정한 제한시간 선택지로 버튼을 만든다', () => {
    renderSetup({ ...(blocksGame as PuzzleGame), timeOptions: [90, 120, 150], defaultTimeSec: 120 });
    const group = screen.getByRole('group', { name: '제한시간' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['90초', '120초', '150초']);
  });

  it('저장된 제한시간이 이 게임 선택지에 없으면 기본값으로 맞추고 이름은 그대로 둔다', () => {
    const initial = { ...defaultSetup(), players: [{ name: '서연', difficulty: 'easy' as const }], timeLimitSec: 150 };
    renderSetup(blocksGame, initial);
    expect(screen.getByRole('button', { name: '90초' })).toHaveAttribute('aria-pressed', 'true');
    expect((nameInputs()[0] as HTMLInputElement).value).toBe('서연');
  });

  it('인원을 바꾸면 이름 칸 수가 바뀐다', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '4명' }));
    expect(nameInputs()).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '1명' }));
    expect(nameInputs()).toHaveLength(1);
  });

  it('고른 이름·난이도·라운드·시간으로 시작한다', () => {
    const { onStart } = renderSetup();
    fireEvent.change(screen.getByRole('textbox', { name: '1번 이름' }), { target: { value: '민준' } });
    fireEvent.click(within(screen.getByRole('group', { name: '1번 플레이어' })).getByRole('button', { name: '쉬움' }));
    fireEvent.click(within(screen.getByRole('group', { name: '2번 플레이어' })).getByRole('button', { name: '어려움' }));
    fireEvent.click(screen.getByRole('button', { name: '3판' }));
    fireEvent.click(screen.getByRole('button', { name: '60초' }));
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(onStart).toHaveBeenCalledWith({
      players: [
        { name: '민준', difficulty: 'easy' },
        { name: '플레이어 2', difficulty: 'hard' },
      ],
      rounds: 3,
      timeMode: 'round',
      timeLimitSec: 60,
      gameTimeSec: 300,
      level: 'normal',
    });
  });

  it('이름을 비우고 시작하면 기본 이름을 쓴다', () => {
    const { onStart } = renderSetup();
    fireEvent.change(screen.getByRole('textbox', { name: '2번 이름' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(onStart.mock.calls[0][0].players[1].name).toBe('플레이어 2');
  });

  it('게임 최대 인원까지만 고를 수 있고, 저장된 인원이 많으면 줄인다', () => {
    const initial = { ...defaultSetup(), players: [...defaultSetup().players, { name: 'C', difficulty: 'easy' as const }] };
    renderSetup({ ...blocksGame, maxPlayers: 2 }, initial);
    expect(screen.queryByRole('button', { name: '3명' })).toBeNull();
    expect(nameInputs()).toHaveLength(2);
  });

  it('처음에는 라운드마다 방식이고 제한시간 줄만 보인다', () => {
    renderSetup();
    expect(screen.getByRole('button', { name: '라운드마다' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '판 전체' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('group', { name: '제한시간' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '판 전체 시간' })).toBeNull();
  });

  it('판 전체를 고르면 판 전체 시간 줄이 제한시간 줄을 대신한다', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '판 전체' }));
    expect(screen.getByRole('button', { name: '판 전체' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: '판 전체 시간' })).toBeInTheDocument();
    expect(screen.getByTestId('game-time')).toHaveTextContent('5:00');
    expect(screen.queryByRole('group', { name: '제한시간' })).toBeNull();
  });

  it('판 전체 시간을 10초씩 늘리고 줄인다', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '판 전체' }));
    fireEvent.click(screen.getByRole('button', { name: '10초 늘리기' }));
    expect(screen.getByTestId('game-time')).toHaveTextContent('5:10');
    fireEvent.click(screen.getByRole('button', { name: '10초 줄이기' }));
    fireEvent.click(screen.getByRole('button', { name: '10초 줄이기' }));
    expect(screen.getByTestId('game-time')).toHaveTextContent('4:50');
  });

  it('저장된 판 전체 설정을 복원하고 최솟값에서는 줄이기를 막는다', () => {
    renderSetup(blocksGame, { ...defaultSetup(), timeMode: 'game', gameTimeSec: 30 });
    expect(screen.getByRole('button', { name: '판 전체' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('game-time')).toHaveTextContent('0:30');
    expect(screen.getByRole('button', { name: '10초 줄이기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10초 늘리기' })).toBeEnabled();
  });

  it('최댓값에서는 늘리기를 막는다', () => {
    renderSetup(blocksGame, { ...defaultSetup(), timeMode: 'game', gameTimeSec: 600 });
    expect(screen.getByTestId('game-time')).toHaveTextContent('10:00');
    expect(screen.getByRole('button', { name: '10초 늘리기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10초 줄이기' })).toBeEnabled();
  });

  it('판 전체 방식으로 시작하면 라운드 제한시간도 그대로 함께 넘긴다', () => {
    const { onStart } = renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '판 전체' }));
    for (let i = 0; i < 25; i++) fireEvent.click(screen.getByRole('button', { name: '10초 줄이기' }));
    expect(screen.getByTestId('game-time')).toHaveTextContent('0:50');
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    const setup = onStart.mock.calls[0][0];
    expect(setup.timeMode).toBe('game');
    expect(setup.gameTimeSec).toBe(50);
    expect(setup.timeLimitSec).toBe(90);
  });

  it('own 게임은 난이도 버튼과 라운드·시간 줄을 그리지 않는다', () => {
    renderSetup(ownGame);
    expect(nameInputs()).toHaveLength(2);
    expect(screen.getByRole('button', { name: '3명' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '보통' })).toBeNull();
    expect(screen.queryByRole('group', { name: '라운드' })).toBeNull();
    expect(screen.queryByRole('group', { name: '시간 방식' })).toBeNull();
    expect(screen.queryByRole('group', { name: '제한시간' })).toBeNull();
    expect(screen.getByRole('button', { name: '← 메뉴' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작!' })).toBeInTheDocument();
  });

  it('own 게임은 라운드·시간을 건드리지 않고 넘기고 최소 인원으로 맞춘다', () => {
    const initial: SavedSetup = {
      players: [{ name: '서연', difficulty: 'easy' }],
      rounds: 9,
      timeMode: 'game',
      timeLimitSec: 150,
      gameTimeSec: 200,
      level: 'normal',
    };
    const { onStart } = renderSetup(ownGame, initial);
    expect(nameInputs()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    const setup: SavedSetup = onStart.mock.calls[0][0];
    expect(setup.players.map((p) => p.name)).toEqual(['서연', '플레이어 2']);
    expect({
      rounds: setup.rounds,
      timeMode: setup.timeMode,
      timeLimitSec: setup.timeLimitSec,
      gameTimeSec: setup.gameTimeSec,
    }).toEqual({ rounds: 9, timeMode: 'game', timeLimitSec: 150, gameTimeSec: 200 });
  });

  it('난이도 설명이 없는 own 게임에는 판 난이도 줄도 없다', () => {
    renderSetup(ownGame);
    expect(screen.queryByRole('group', { name: '난이도' })).toBeNull();
    expect(screen.queryByTestId('level-desc')).toBeNull();
  });

  it('난이도 설명이 있는 own 게임은 판 난이도 줄과 고른 단계의 설명을 보이고 고른 값으로 시작한다', () => {
    const { onStart } = renderSetup(leveledGame, { ...defaultSetup(), level: 'hard' });
    const row = screen.getByRole('group', { name: '난이도' });
    expect(within(row).getAllByRole('button').map((b) => b.textContent)).toEqual(['쉬움', '보통', '어려움']);
    expect(within(row).getByRole('button', { name: '어려움' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('level-desc')).toHaveTextContent('어려운 설명');
    fireEvent.click(within(row).getByRole('button', { name: '쉬움' }));
    expect(screen.getByTestId('level-desc')).toHaveTextContent('쉬운 설명');
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(onStart.mock.calls[0][0].level).toBe('easy');
  });

  it('퍼즐 게임은 판 난이도 줄이 없고 저장된 판 난이도를 그대로 넘긴다', () => {
    const { onStart } = renderSetup(blocksGame, { ...defaultSetup(), level: 'hard' });
    expect(screen.queryByRole('group', { name: '난이도' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(onStart.mock.calls[0][0].level).toBe('hard');
  });

  it('메뉴 버튼은 onBack', () => {
    const { onBack } = renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '← 메뉴' }));
    expect(onBack).toHaveBeenCalled();
  });
});
