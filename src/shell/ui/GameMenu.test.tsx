import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blocksGame } from '../../games/blocks';
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
});
