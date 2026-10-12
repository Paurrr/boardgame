import { describe, expect, it } from 'vitest';
import { cellKey, hasHoles, isConnected, normalize, outlinePath, outlineSegments, shapeSize } from './shape';
import type { Cell } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

describe('cellKey', () => {
  it('좌표를 문자열 키로 만든다', () => {
    expect(cellKey({ x: 3, y: -2 })).toBe('3,-2');
  });
});

describe('normalize', () => {
  it('최소 좌표를 (0,0)으로 옮기고 y, x 순으로 정렬한다', () => {
    expect(normalize(cells([[5, 3], [4, 4], [4, 3]]))).toEqual(cells([[0, 0], [1, 0], [0, 1]]));
  });

  it('음수 좌표도 옮긴다', () => {
    expect(normalize(cells([[-2, -1], [-1, -1]]))).toEqual(cells([[0, 0], [1, 0]]));
  });

  it('빈 배열은 빈 배열', () => {
    expect(normalize([])).toEqual([]);
  });
});

describe('shapeSize', () => {
  it('바운딩박스 가로세로를 구한다', () => {
    expect(shapeSize(cells([[0, 0], [2, 0], [2, 1]]))).toEqual({ w: 3, h: 2 });
  });
});

describe('isConnected', () => {
  it('변으로 이어진 모양은 true', () => {
    expect(isConnected(cells([[0, 0], [0, 1], [1, 1]]))).toBe(true);
  });

  it('대각선으로만 닿은 모양은 false', () => {
    expect(isConnected(cells([[0, 0], [1, 1]]))).toBe(false);
  });
});

describe('hasHoles', () => {
  it('가운데가 빈 고리는 구멍이 있다', () => {
    const ring = cells([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]);
    expect(hasHoles(ring)).toBe(true);
  });

  it('꽉 찬 사각형은 구멍이 없다', () => {
    expect(hasHoles(cells([[0, 0], [1, 0], [0, 1], [1, 1]]))).toBe(false);
  });

  it('한쪽이 열린 U 모양은 구멍이 없다', () => {
    expect(hasHoles(cells([[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]))).toBe(false);
  });
});

describe('outlineSegments', () => {
  it('한 칸은 테두리 4개', () => {
    expect(outlineSegments(cells([[0, 0]]))).toHaveLength(4);
  });

  it('가로 2칸은 맞닿은 변을 빼고 6개', () => {
    expect(outlineSegments(cells([[0, 0], [1, 0]]))).toHaveLength(6);
  });

  it('2x2는 바깥 변 8개', () => {
    expect(outlineSegments(cells([[0, 0], [1, 0], [0, 1], [1, 1]]))).toHaveLength(8);
  });
});

describe('outlinePath', () => {
  it('SVG path 문자열을 만든다', () => {
    expect(outlinePath(cells([[0, 0]]))).toBe('M0 0L1 0M1 0L1 1M0 1L1 1M0 0L0 1');
  });
});
