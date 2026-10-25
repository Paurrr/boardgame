import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PLAYER_COLORS } from '../../../shell/ui/colors';
import type { Standing } from '../logic/types';
import { PairsResult } from './PairsResult';
import type { SoloRecord } from './PairsResult';

function renderResult(playerNames: readonly string[], standings: readonly Standing[], solo: SoloRecord | null = null) {
  const onReplay = vi.fn();
  const onExit = vi.fn();
  render(
    <PairsResult playerNames={playerNames} standings={standings} solo={solo} onReplay={onReplay} onExit={onExit} />,
  );
  return { onReplay, onExit };
}

const TWO: Standing[] = [
  { player: 1, pairs: 5, place: 1 },
  { player: 0, pairs: 3, place: 2 },
];

describe('PairsResult (여럿)', () => {
  it('1등 이름으로 우승을 알린다', () => {
    renderResult(['민수', '지우'], TWO);
    expect(screen.getByRole('heading', { name: '지우 우승!' })).toBeInTheDocument();
  });

  it('받은 순서대로 등수·이름·짝 수를 보이고 1등 줄에만 우승 표시를 붙인다', () => {
    renderResult(['민수', '지우'], TWO);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('1등 지우');
    expect(rows[0]).toHaveTextContent('5쌍');
    expect(rows[0]).toHaveTextContent('우승');
    expect(rows[1]).toHaveTextContent('2등 민수');
    expect(rows[1]).toHaveTextContent('3쌍');
    expect(rows[1]).not.toHaveTextContent('우승');
  });

  it('줄 왼쪽 테두리는 그 플레이어 색', () => {
    renderResult(['민수', '지우'], TWO);
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveStyle({ borderLeftColor: PLAYER_COLORS[1] });
    expect(rows[1]).toHaveStyle({ borderLeftColor: PLAYER_COLORS[0] });
  });

  it('공동 1등이면 공동 우승', () => {
    renderResult(
      ['민수', '지우', '아빠'],
      [
        { player: 0, pairs: 4, place: 1 },
        { player: 1, pairs: 4, place: 1 },
        { player: 2, pairs: 0, place: 3 },
      ],
    );
    expect(screen.getByRole('heading', { name: '민수·지우 공동 우승!' })).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('1등 민수');
    expect(rows[1]).toHaveTextContent('1등 지우');
    expect(rows[2]).toHaveTextContent('3등 아빠');
    expect(rows[0]).toHaveTextContent('우승');
    expect(rows[1]).toHaveTextContent('우승');
    expect(rows[2]).not.toHaveTextContent('우승');
  });
});

describe('PairsResult (혼자)', () => {
  const SOLO_STANDING: Standing[] = [{ player: 0, pairs: 8, place: 1 }];

  it('몇 번 만에 다 찾았는지와 최고기록을 보인다', () => {
    renderResult(['민수'], SOLO_STANDING, { tries: 9, best: 8, isNew: false });
    expect(screen.getByRole('heading', { name: '다 찾았어요!' })).toBeInTheDocument();
    expect(screen.getByText('9번 만에 다 찾았어요')).toBeInTheDocument();
    expect(screen.getByText('최고기록 8번')).toBeInTheDocument();
    expect(screen.queryByText('새 기록!')).not.toBeInTheDocument();
    expect(screen.queryByText(/우승/)).not.toBeInTheDocument();
  });

  it('최고기록을 깼으면 새 기록을 알린다', () => {
    renderResult(['민수'], SOLO_STANDING, { tries: 8, best: 8, isNew: true });
    expect(screen.getByText('8번 만에 다 찾았어요')).toBeInTheDocument();
    expect(screen.getByText('새 기록!')).toBeInTheDocument();
  });
});

describe('PairsResult (버튼)', () => {
  it('메뉴로·다시 하기 버튼이 각각의 콜백을 부른다', () => {
    const { onReplay, onExit } = renderResult(['민수', '지우'], TWO);
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onReplay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
