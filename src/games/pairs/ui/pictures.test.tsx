import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PIECES } from '../../blocks/logic/pieces';
import { PICTURE_COUNT } from '../logic/level';
import { MenuIcon } from './MenuIcon';
import { Picture, PICTURE_IDS } from './pictures';

const ALL = Array.from({ length: PICTURE_COUNT }, (_, i) => i);

describe('PICTURE_IDS', () => {
  it('그림 수만큼 있고 서로 겹치지 않는다', () => {
    expect(PICTURE_IDS).toHaveLength(PICTURE_COUNT);
    expect(new Set(PICTURE_IDS).size).toBe(PICTURE_COUNT);
  });

  it('번호 순서가 정해져 있다 (번호 = slots[i].picture)', () => {
    expect(PICTURE_IDS.slice(0, 3)).toEqual(['fish', 'turtle', 'snail']);
    expect(PICTURE_IDS[PICTURE_COUNT - 1]).toBe('house');
  });
});

describe('Picture', () => {
  it('번호마다 그림 하나를 그리고 data-picture가 그 id다', () => {
    for (const picture of ALL) {
      const { container, unmount } = render(
        <svg>
          <Picture picture={picture} />
        </svg>,
      );
      const drawn = screen.getAllByTestId('picture');
      expect(drawn).toHaveLength(1);
      expect(drawn[0]).toHaveAttribute('data-picture', PICTURE_IDS[picture]);
      // 빈 그룹이 아니라 실제 모양이 있다
      expect(container.querySelectorAll('path, circle, ellipse, rect, polygon, line').length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('색은 none, :root 변수, 블록 퍼즐 조각 색만 쓴다 (새 색 없음)', () => {
    const allowed = new Set<string>(['none', ...Object.values(PIECES).map((p) => p.color)]);
    const { container } = render(
      <svg>
        {ALL.map((picture) => (
          <Picture key={picture} picture={picture} />
        ))}
      </svg>,
    );
    const values: string[] = [];
    for (const el of container.querySelectorAll('[fill], [stroke]')) {
      for (const attr of ['fill', 'stroke']) {
        const v = el.getAttribute(attr);
        if (v !== null) values.push(v);
      }
    }
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(allowed.has(v) || /^var\(--[a-z-]+\)$/.test(v)).toBe(true);
  });
});

describe('MenuIcon', () => {
  it('같은 그림(고래) 앞면 두 장과 뒷면 한 장을 그린다', () => {
    render(<MenuIcon />);
    const drawn = screen.getAllByTestId('picture');
    expect(drawn).toHaveLength(2);
    for (const p of drawn) expect(p).toHaveAttribute('data-picture', 'whale');
    expect(screen.getAllByTestId('card-face')).toHaveLength(2);
    expect(screen.getAllByTestId('card-back')).toHaveLength(1);
  });

  it('꾸밈이라 보조기기에는 숨긴다', () => {
    const { container } = render(<MenuIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
