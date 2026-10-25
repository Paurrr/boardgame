import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STACK_PIECES } from '../logic/pieces';
import type { StackPieceId } from '../logic/types';
import { MenuIcon } from './MenuIcon';

describe('MenuIcon', () => {
  it('메뉴 카드 그림으로 입체 조각 셋(O4·Y4·R4)을 제 색으로 그린다', () => {
    const { container } = render(<MenuIcon />);
    const ids = new Set(Array.from(container.querySelectorAll('[data-piece]')).map((g) => g.getAttribute('data-piece')));
    expect(Array.from(ids).sort()).toEqual(['O4', 'R4', 'Y4']);
    for (const id of ids as Set<StackPieceId>) {
      const face = container.querySelector(`[data-piece="${id}"] polygon`);
      expect(face).toHaveAttribute('fill', STACK_PIECES[id].color);
    }
  });

  it('꾸밈이라 보조기기에는 숨긴다', () => {
    const { container } = render(<MenuIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
