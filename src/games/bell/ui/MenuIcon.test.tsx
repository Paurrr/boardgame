import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MenuIcon } from './MenuIcon';

describe('MenuIcon', () => {
  it('바나나 2 카드와 바나나 3 카드를 겹쳐 과일 5개를 그린다', () => {
    render(<MenuIcon />);
    const icons = screen.getAllByTestId('fruit');
    expect(icons).toHaveLength(5);
    for (const icon of icons) expect(icon).toHaveAttribute('data-fruit', 'banana');
  });

  it('꾸밈이라 보조기기에는 숨긴다', () => {
    const { container } = render(<MenuIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
