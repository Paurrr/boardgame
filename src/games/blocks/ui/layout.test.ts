import { describe, expect, it } from 'vitest';
import type { BoardArea } from '../logic/types';
import {
  ACTION_H,
  bestLayout,
  cellSizeFor,
  computeLayout,
  freeAreas,
  freeSpot,
  PAD,
  SLOT,
  trayPosition,
  visibleArea,
} from './layout';

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

describe('visibleArea', () => {
  const l = computeLayout(area(10, 9), 4, 2); // 11 x 21

  it('칸이 가로로 남으면 좌우로 넓어진다', () => {
    // 칸 크기 20px → 1100px = 55칸, 가운데 맞춤
    expect(visibleArea(l, 1100, 420)).toEqual({ x: -22, y: 0, w: 55, h: 21 });
  });

  it('칸이 세로로 남으면 위로 넓어진다 (아래 맞춤)', () => {
    expect(visibleArea(l, 220, 1000)).toEqual({ x: 0, y: -29, w: 11, h: 50 });
  });

  it('크기를 아직 모르면 viewBox 그대로', () => {
    expect(visibleArea(l, 0, 0)).toEqual({ x: 0, y: 0, w: 11, h: 21 });
  });
});

describe('freeAreas', () => {
  it('보이는 범위에서 판과 버튼 줄을 빼고, 가장자리는 PAD만큼 띄운다', () => {
    // 전체 20 x 11, 판(5x4)은 x 7.5~12.5 · y 0.5~4.5, 버튼 줄 y 4.5~6.5
    const l = computeLayout(area(5, 4), 4, 4);
    expect(freeAreas(l, area(5, 4), { x: -10, y: -5, w: 40, h: 16 })).toEqual([
      { x: -9.5, y: PAD + 4 + ACTION_H, w: 39, h: SLOT },
      { x: -9.5, y: -4.5, w: 17, h: 9 },
      { x: 12.5, y: -4.5, w: 17, h: 9 },
      { x: 7.5, y: -4.5, w: 5, h: 5 },
    ]);
  });
});

describe('freeSpot', () => {
  // 전체 20 x 11을 그대로 보는 칸: 버튼 줄 아래 x 0.5~19.5 · y 6.5~10.5, 판 양옆 너비 7
  const l = computeLayout(area(5, 4), 4, 4);
  const free = freeAreas(l, area(5, 4), { x: 0, y: 0, w: 20, h: 11 });

  it('빈 영역 안이면 그대로 둔다', () => {
    expect(freeSpot(free, { x: 1, y: 7 }, 2, 2)).toEqual({ x: 1, y: 7 });
    expect(freeSpot(free, { x: 13, y: 1 }, 2, 2)).toEqual({ x: 13, y: 1 });
  });

  it('칸 밖으로 나가면 안으로 당긴다', () => {
    expect(freeSpot(free, { x: 1, y: 10 }, 2, 2)).toEqual({ x: 1, y: 8.5 });
    expect(freeSpot(free, { x: 19, y: 7 }, 2, 2)).toEqual({ x: 17.5, y: 7 });
    expect(freeSpot(free, { x: -1, y: 7 }, 2, 2)).toEqual({ x: 0.5, y: 7 });
  });

  it('버튼 줄에 걸치면 가까운 쪽 영역으로 보낸다', () => {
    expect(freeSpot(free, { x: 2, y: 4.2 }, 2, 1)).toEqual({ x: 2, y: 3.5 });
    expect(freeSpot(free, { x: 2, y: 5.8 }, 2, 1)).toEqual({ x: 2, y: 6.5 });
  });

  it('판 옆이 좁아 안 들어가면 버튼 줄 아래로 보낸다', () => {
    // 판 13칸 → 판 양옆 너비 3이라 가로 4 조각은 못 들어간다
    const narrow = freeAreas(computeLayout(area(13, 4), 4, 4), area(13, 4), { x: 0, y: 0, w: 20, h: 11 });
    expect(freeSpot(narrow, { x: 0, y: 1 }, 4, 1)).toEqual({ x: PAD, y: PAD + 4 + ACTION_H });
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
