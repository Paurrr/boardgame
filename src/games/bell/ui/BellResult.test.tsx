import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PLAYER_COLORS } from '../../../shell/ui/colors';
import { BellResult } from './BellResult';

const names = ['민준', '서연', '아빠'];

function renderResult() {
  const onReplay = vi.fn();
  const onExit = vi.fn();
  render(<BellResult playerNames={names} ranking={[1, 0, 2]} onReplay={onReplay} onExit={onExit} />);
  return { onReplay, onExit };
}

describe('BellResult', () => {
  it('1등 이름으로 우승을 알린다', () => {
    renderResult();
    expect(screen.getByRole('heading', { name: '서연 우승!' })).toBeInTheDocument();
  });

  it('순위대로 줄을 세우고 1등 줄에만 우승 표시를 붙인다', () => {
    renderResult();
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('1등 서연');
    expect(rows[1]).toHaveTextContent('2등 민준');
    expect(rows[2]).toHaveTextContent('3등 아빠');
    expect(rows[0]).toHaveTextContent('우승');
    expect(rows[1]).not.toHaveTextContent('우승');
    expect(rows[2]).not.toHaveTextContent('우승');
  });

  it('줄 왼쪽 테두리는 그 플레이어 색', () => {
    renderResult();
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveStyle({ borderLeftColor: PLAYER_COLORS[1] });
    expect(rows[2]).toHaveStyle({ borderLeftColor: PLAYER_COLORS[2] });
  });

  it('메뉴로·다시 하기 버튼이 각각의 콜백을 부른다', () => {
    const { onReplay, onExit } = renderResult();
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onReplay).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });
});

