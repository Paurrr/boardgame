import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PIECES } from '../../blocks/logic/pieces';
import { FRUITS } from '../logic/cards';
import type { FruitCount } from '../logic/types';
import { CARD_H, CARD_W, FruitCard, ICON_SIZE, PIP_LAYOUT } from './FruitCard';
import { FRUIT_COLOR, LEAF_COLOR } from './FruitIcon';

const COUNTS: FruitCount[] = [1, 2, 3, 4, 5];

describe('FruitCard', () => {
  it('과일 4가지 × 개수 1~5마다 그 과일을 개수만큼 그린다', () => {
    for (const fruit of FRUITS) {
      for (const count of COUNTS) {
        const { unmount } = render(<FruitCard card={{ fruit, count }} />);
        expect(screen.getByTestId('fruit-card')).toHaveAttribute('viewBox', `0 0 ${CARD_W} ${CARD_H}`);
        const icons = screen.getAllByTestId('fruit');
        expect(icons).toHaveLength(count);
        for (const icon of icons) expect(icon).toHaveAttribute('data-fruit', fruit);
        unmount();
      }
    }
  });

  it('카드가 없으면 빈 자리만 그리고 과일은 없다', () => {
    render(<FruitCard card={null} />);
    expect(screen.getByTestId('empty-card')).toBeInTheDocument();
    expect(screen.queryByTestId('fruit-card')).toBeNull();
    expect(screen.queryAllByTestId('fruit')).toHaveLength(0);
  });
});

describe('PIP_LAYOUT', () => {
  it('개수마다 점 수가 개수와 같다', () => {
    for (const count of COUNTS) expect(PIP_LAYOUT[count]).toHaveLength(count);
  });

  it('모든 점이 카드 안쪽 여백 6 이상 안에 있다', () => {
    const pad = ICON_SIZE / 2 + 6;
    for (const count of COUNTS) {
      for (const p of PIP_LAYOUT[count]) {
        expect(p.x).toBeGreaterThanOrEqual(pad);
        expect(p.x).toBeLessThanOrEqual(CARD_W - pad);
        expect(p.y).toBeGreaterThanOrEqual(pad);
        expect(p.y).toBeLessThanOrEqual(CARD_H - pad);
      }
    }
  });

  it('같은 카드의 두 점은 과일 크기 이상 떨어져 있다', () => {
    for (const count of COUNTS) {
      const pips = PIP_LAYOUT[count];
      for (let i = 0; i < pips.length; i++) {
        for (let j = i + 1; j < pips.length; j++) {
          expect(Math.hypot(pips[i].x - pips[j].x, pips[i].y - pips[j].y)).toBeGreaterThanOrEqual(ICON_SIZE);
        }
      }
    }
  });
});

describe('FRUIT_COLOR', () => {
  it('과일·잎 색은 블록 퍼즐 조각 색에서 가져온다', () => {
    expect(FRUIT_COLOR.strawberry).toBe(PIECES.I3.color);
    expect(FRUIT_COLOR.banana).toBe(PIECES.L3.color);
    expect(FRUIT_COLOR.lime).toBe(PIECES.L5.color);
    expect(FRUIT_COLOR.blueberry).toBe(PIECES.U5.color);
    expect(LEAF_COLOR).toBe(PIECES.T4.color);
  });
});
