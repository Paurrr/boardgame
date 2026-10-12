import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App (터치 시험 화면)', () => {
  it('기본 2명 칸에 퍼즐을 하나씩 그린다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /터치 시험/ })).toBeInTheDocument();
    expect(screen.getAllByTestId('player-column')).toHaveLength(2);
    expect(screen.getAllByTestId('puzzle-svg')).toHaveLength(2);
  });

  it('4명을 누르면 칸이 4개가 된다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '4명' }));
    expect(screen.getAllByTestId('player-column')).toHaveLength(4);
  });
});
