import { describe, expect, it } from 'vitest';
import type { BoardArea } from '../logic/types';
import { ACTION_H, bestLayout, cellSizeFor, computeLayout, PAD, SLOT, trayPosition } from './layout';

const area = (width: number, height: number): BoardArea => ({ width, height, target: [] });

describe('computeLayout', () => {
  it('판 아래에 버튼 줄, 그 아래 트레이를 둔다', () => {
    const l = computeLayout(area(10, 9), 4, 2);
    expect(l.boardY).toBe(PAD);
    expect(l.actionY).toBe(PAD + 9);
    expect(l.slots[0].y).toBe(PAD + 9 + ACTION_H);
  });

  it('2열 트레이: 조각 4개면 2줄', () => {
    const l = computeLayout(area(10, 9), 4, 2);
    expect(l.columns).toBe(2);
    // 트레이 가로 = 4*2 + 1, 세로 = 4*2 + 1
    expect(l.width).toBe(10 + 2 * PAD);
    expect(l.height).toBe(PAD + 9 + ACTION_H + 9 + PAD);
  });

  it('4열 트레이: 조각 4개면 1줄', () => {
    const l = computeLayout(area(10, 9), 4, 4);
    expect(l.columns).toBe(4);
    expect(l.width).toBe(19 + 2 * PAD);
    expect(l.height).toBe(PAD + 9 + ACTION_H + SLOT + PAD);
  });

  it('열 수는 조각 수를 넘지 않는다', () => {
    expect(computeLayout(area(5, 4), 2, 4).columns).toBe(2);
  });

  it('칸끼리 겹치지 않는다', () => {
    const { slots } = computeLayout(area(10, 9), 4, 2);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const apart = Math.abs(slots[i].x - slots[j].x) >= SLOT || Math.abs(slots[i].y - slots[j].y) >= SLOT;
        expect(apart).toBe(true);
      }
    }
  });

  it('판이 트레이보다 좁으면 가운데 정렬', () => {
    const l = computeLayout(area(5, 4), 3, 2);
    // 트레이 가로 9 → 판(5)은 (9-5)/2 만큼 들여쓴다
    expect(l.boardX).toBe(PAD + 2);
  });
});

describe('bestLayout', () => {
  it('넓은 칸에서는 4열 트레이', () => {
    expect(bestLayout(area(10, 9), 4, 2000, 700).columns).toBe(4);
  });

  it('좁고 긴 칸에서는 2열 트레이', () => {
    expect(bestLayout(area(10, 9), 4, 480, 720).columns).toBe(2);
  });

  it('크기를 아직 모르면 2열', () => {
    expect(bestLayout(area(10, 9), 4, 0, 0).columns).toBe(2);
  });
});

describe('cellSizeFor', () => {
  it('가로·세로 중 빡빡한 쪽에 맞춘다', () => {
    const l = computeLayout(area(10, 9), 4, 2); // 11 x 21
    expect(cellSizeFor(l, 1100, 420)).toBe(20);
  });
});

describe('trayPosition', () => {
  it('슬롯 가운데에 둔다', () => {
    expect(trayPosition({ x: 1, y: 2 }, 2, 3)).toEqual({ x: 2, y: 2.5 });
  });
});
