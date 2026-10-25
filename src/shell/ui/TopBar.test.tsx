import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('라운드·시계를 안 넘기면 소리·그만하기만 그린다', () => {
    render(<TopBar muted={false} onToggleMute={vi.fn()} onExit={vi.fn()} />);
    expect(screen.queryByText(/라운드/)).toBeNull();
    expect(screen.queryByTestId('clock')).toBeNull();
    expect(screen.getByRole('button', { name: '소리 끄기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '그만하기' })).toBeInTheDocument();
  });

  it('라운드·시계를 넘기면 함께 그린다', () => {
    render(
      <TopBar round={2} rounds={5} clock="1:30" urgent={false} muted={false} onToggleMute={vi.fn()} onExit={vi.fn()} />,
    );
    expect(screen.getByText('라운드 2/5')).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toHaveTextContent('1:30');
  });
});
