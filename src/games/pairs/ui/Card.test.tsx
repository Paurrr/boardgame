import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, FLIP_MS } from './Card';
import { PICTURE_IDS } from './pictures';

const flipping = (container: HTMLElement) => container.querySelector('[style*="animation-duration"]');

describe('Card', () => {
  it('정사각형 viewBox에 그려 부모가 크기를 정한다', () => {
    const { container } = render(<Card picture={0} faceUp={false} taken={false} />);
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 100 100');
  });

  it('가져간 카드는 빈자리만 그리고 그림이 없다', () => {
    render(<Card picture={3} faceUp={false} taken />);
    expect(screen.getByTestId('empty-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('picture')).toBeNull();
    expect(screen.queryByTestId('card-back')).toBeNull();
    expect(screen.queryByTestId('card-face')).toBeNull();
  });

  it('엎은 카드는 뒷면이고 그림이 없다', () => {
    render(<Card picture={3} faceUp={false} taken={false} />);
    expect(screen.getByTestId('card-back')).toBeInTheDocument();
    expect(screen.queryByTestId('card-face')).toBeNull();
    expect(screen.queryByTestId('picture')).toBeNull();
  });

  it('앞면 카드는 안쪽에 자기 그림을 그린다', () => {
    render(<Card picture={4} faceUp taken={false} />);
    const face = screen.getByTestId('card-face');
    expect(within(face).getByTestId('picture')).toHaveAttribute('data-picture', PICTURE_IDS[4]);
    expect(screen.queryByTestId('card-back')).toBeNull();
  });

  it('처음 그릴 때는 뒤집기 애니메이션이 없다', () => {
    const { container } = render(<Card picture={4} faceUp taken={false} />);
    expect(flipping(container)).toBeNull();
  });

  it('faceUp이 바뀌면 FLIP_MS 동안 뒤집히고 화면의 면은 바로 바뀐다', () => {
    expect(FLIP_MS).toBe(250);
    const { container, rerender } = render(<Card picture={4} faceUp={false} taken={false} />);

    rerender(<Card picture={4} faceUp taken={false} />);
    expect(flipping(container)).toHaveStyle({ animationDuration: `${FLIP_MS}ms` });
    expect(screen.getAllByTestId('card-face')).toHaveLength(1);
    expect(screen.queryByTestId('card-back')).toBeNull();

    rerender(<Card picture={4} faceUp={false} taken={false} />);
    expect(flipping(container)).toHaveStyle({ animationDuration: `${FLIP_MS}ms` });
    expect(screen.getAllByTestId('card-back')).toHaveLength(1);
    expect(screen.queryByTestId('card-face')).toBeNull();
    expect(screen.queryByTestId('picture')).toBeNull();
  });

  it('앞면이던 카드를 가져가면 빈자리로 바뀐다', () => {
    const { rerender } = render(<Card picture={4} faceUp taken={false} />);
    rerender(<Card picture={4} faceUp={false} taken />);
    expect(screen.getByTestId('empty-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('picture')).toBeNull();
  });
});
