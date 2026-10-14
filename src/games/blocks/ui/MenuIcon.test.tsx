import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PIECES } from '../logic/pieces';
import type { PieceId } from '../logic/types';
import { MenuIcon } from './MenuIcon';

describe('MenuIcon', () => {
  it('메뉴 카드 그림으로 조각 세 개(I4·O4·T4)를 제 색으로 그린다', () => {
    const { container } = render(<MenuIcon />);
    const pieces = Array.from(container.querySelectorAll('[data-piece]'));
    expect(pieces.map((p) => p.getAttribute('data-piece'))).toEqual(['I4', 'O4', 'T4']);
    for (const p of pieces) {
      const id = p.getAttribute('data-piece') as PieceId;
      expect(p.querySelector('rect')).toHaveAttribute('fill', PIECES[id].color);
    }
  });
});
