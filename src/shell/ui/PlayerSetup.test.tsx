import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blocksGame } from '../../games/blocks';
import { defaultSetup } from '../logic/setup';
import { PlayerSetup } from './PlayerSetup';

const renderSetup = (game = blocksGame, initial = defaultSetup()) => {
  const onStart = vi.fn();
  const onBack = vi.fn();
  render(<PlayerSetup game={game} initial={initial} onStart={onStart} onBack={onBack} />);
  return { onStart, onBack };
};

const nameInputs = () => screen.getAllByRole('textbox');

describe('PlayerSetup', () => {
  it('처음 설정값을 보여준다', () => {
    renderSetup();
    expect(nameInputs().map((el) => (el as HTMLInputElement).value)).toEqual(['플레이어 1', '플레이어 2']);
    expect(screen.getByRole('button', { name: '2명' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '5판' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '90초' })).toHaveAttribute('aria-pressed', 'true');
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
      timeLimitSec: 60,
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

  it('메뉴 버튼은 onBack', () => {
    const { onBack } = renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '← 메뉴' }));
    expect(onBack).toHaveBeenCalled();
  });
});
