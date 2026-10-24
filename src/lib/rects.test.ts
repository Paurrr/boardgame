import { describe, expect, it } from 'vitest';
import { freeSpot } from './rects';
import type { Rect } from './rects';

describe('freeSpot', () => {
  // 1탄 칸 하나(20 x 11)의 빈 영역: 버튼 줄 아래 x 0.5~19.5 · y 6.5~10.5, 판(x 7.5~12.5) 양옆 너비 7, 판 위는 높이 0
  const free: Rect[] = [
    { x: 0.5, y: 6.5, w: 19, h: 4 },
    { x: 0.5, y: 0.5, w: 7, h: 4 },
    { x: 12.5, y: 0.5, w: 7, h: 4 },
    { x: 7.5, y: 0.5, w: 5, h: 0 },
  ];

  it('빈 영역 안이면 그대로 둔다', () => {
    expect(freeSpot(free, { x: 1, y: 7 }, 2, 2)).toEqual({ x: 1, y: 7 });
    expect(freeSpot(free, { x: 13, y: 1 }, 2, 2)).toEqual({ x: 13, y: 1 });
  });

  it('영역 밖으로 나가면 가장 가까운 영역 안으로 당긴다', () => {
    expect(freeSpot(free, { x: 1, y: 10 }, 2, 2)).toEqual({ x: 1, y: 8.5 });
    expect(freeSpot(free, { x: 19, y: 7 }, 2, 2)).toEqual({ x: 17.5, y: 7 });
    expect(freeSpot(free, { x: -1, y: 7 }, 2, 2)).toEqual({ x: 0.5, y: 7 });
  });

  it('두 영역 사이에 걸치면 가까운 쪽 영역으로 보낸다', () => {
    expect(freeSpot(free, { x: 2, y: 4.2 }, 2, 1)).toEqual({ x: 2, y: 3.5 });
    expect(freeSpot(free, { x: 2, y: 5.8 }, 2, 1)).toEqual({ x: 2, y: 6.5 });
  });

  it('안 들어가는 영역은 건너뛴다', () => {
    // 가로 8 조각은 판 옆(너비 7)에 못 들어가 버튼 줄 아래로 간다
    expect(freeSpot(free, { x: 0, y: 1 }, 8, 1)).toEqual({ x: 0.5, y: 6.5 });
  });

  it('들어가는 영역이 없으면 그대로 둔다', () => {
    expect(freeSpot(free, { x: 3, y: 3 }, 30, 1)).toEqual({ x: 3, y: 3 });
  });
});
