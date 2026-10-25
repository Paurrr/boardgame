import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS } from '../../../shell/ui/colors';
import { TurnHeader } from './TurnHeader';

describe('TurnHeader', () => {
  it('여럿이면 차례인 사람 이름을 그 사람 색으로 크게 쓴다', () => {
    render(<TurnHeader names={['민수', '지우']} pairs={[3, 0]} turn={1} tries={4} totalPairs={8} />);
    expect(screen.getByText('지우 차례')).toHaveStyle({ color: PLAYER_COLORS[1] });
    expect(screen.queryByText('민수 차례')).toBeNull();
  });

  it('사람마다 이름과 짝 수를 보이고 차례인 사람만 표시한다', () => {
    render(<TurnHeader names={['민수', '지우']} pairs={[3, 0]} turn={1} tries={4} totalPairs={8} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('민수')).toBeInTheDocument();
    expect(within(items[0]).getByText('3쌍')).toBeInTheDocument();
    expect(within(items[1]).getByText('지우')).toBeInTheDocument();
    expect(within(items[1]).getByText('0쌍')).toBeInTheDocument();
    expect(items[0]).not.toHaveAttribute('aria-current');
    expect(items[1]).toHaveAttribute('aria-current', 'true');
    expect(items[1]).toHaveStyle({ borderBottomColor: PLAYER_COLORS[1] });
  });

  it('혼자면 찾은 짝과 뒤집은 횟수만 보이고 차례는 없다', () => {
    render(<TurnHeader names={['민수']} pairs={[3]} turn={0} tries={5} totalPairs={8} />);
    expect(screen.getByText('찾은 짝 3/8')).toBeInTheDocument();
    expect(screen.getByText('5번')).toBeInTheDocument();
    expect(screen.queryByText(/차례/)).toBeNull();
    expect(screen.queryByRole('listitem')).toBeNull();
  });
});
