import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blocksGame } from '../../games/blocks';
import { PLAYER_COLORS } from './colors';
import { GameMenu } from './GameMenu';

describe('GameMenu', () => {
  it('앱 제목과 게임 카드를 보여준다', () => {
    render(<GameMenu onSelect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /블록 퍼즐/ })).toHaveTextContent('1~4명');
  });

  it('게임 카드를 누르면 그 게임을 고른다', () => {
    const onSelect = vi.fn();
    render(<GameMenu onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /블록 퍼즐/ }));
    expect(onSelect).toHaveBeenCalledWith(blocksGame);
  });

  it('기기 확인 페이지로 가는 링크가 있다', () => {
    render(<GameMenu onSelect={vi.fn()} />);
    expect(screen.getByRole('link', { name: '기기 확인' }).getAttribute('href')).toMatch(/check\.html$/);
  });

  it('제목 위에 플레이어 색 블록을 장식으로 늘어놓는다', () => {
    render(<GameMenu onSelect={vi.fn()} />);
    const blocks = screen.getAllByTestId('deco-block');
    expect(blocks).toHaveLength(PLAYER_COLORS.length);
    blocks.forEach((b, i) => expect(b).toHaveStyle({ backgroundColor: PLAYER_COLORS[i] }));
  });

  it('그림이 있는 게임은 카드에 그림을 함께 그린다', () => {
    render(<GameMenu onSelect={vi.fn()} />);
    const card = screen.getByRole('button', { name: /블록 퍼즐/ });
    expect(within(card).getByTestId('game-art').querySelector('svg')).not.toBeNull();
  });
});
