import { describe, expect, it } from 'vitest';
import { STACK_IDS, STACK_PIECES } from './pieces';
import { centerOf, heightOf, key3, normalize, orientations, rotateAbout, rotZ, sizeOf } from './rotate';
import type { StackPieceId, Vec3 } from './types';
import { MAX_H } from './types';

const vecs = (list: [number, number, number][]): Vec3[] => list.map(([x, y, z]) => ({ x, y, z }));
const X_AXIS = { x: 1, y: 0, z: 0 };
const Z_AXIS = { x: 0, y: 0, z: 1 };

const times = (n: number, f: (c: Vec3[]) => Vec3[], c: Vec3[]): Vec3[] => {
  let out = c;
  for (let i = 0; i < n; i++) out = f(out);
  return out;
};

describe('key3', () => {
  it('좌표를 문자열로 만든다', () => {
    expect(key3({ x: 1, y: 2, z: 0 })).toBe('1,2,0');
  });
});

describe('normalize', () => {
  it('최소 좌표를 0으로 옮기고 (z, y, x) 순으로 정렬한다', () => {
    expect(normalize(vecs([[3, 2, 2], [2, 3, 1], [3, 1, 1], [2, 1, 1]]))).toEqual(
      vecs([[0, 0, 0], [1, 0, 0], [0, 2, 0], [1, 1, 1]]),
    );
  });
});

describe('rotZ', () => {
  it('가로 막대를 세로(y)로 돌린다', () => {
    expect(rotZ(STACK_PIECES.I3.cells)).toEqual(vecs([[0, 0, 0], [0, 1, 0], [0, 2, 0]]));
  });

  it('높이는 그대로다', () => {
    expect(rotZ(STACK_PIECES.Y4.cells).filter((c) => c.z === 1)).toHaveLength(1);
  });

  it('네 번 돌리면 정규화한 원래 모양이다', () => {
    for (const id of STACK_IDS) {
      const cells = STACK_PIECES[id].cells;
      expect(times(4, rotZ, cells)).toEqual(normalize(cells));
    }
  });
});

describe('rotateAbout', () => {
  it('x축 둘레 +90°는 +y로 뻗은 칸을 위(+z)로 세운다', () => {
    expect(rotateAbout(vecs([[0, 0, 0], [0, 1, 0]]), X_AXIS)).toEqual(vecs([[0, 0, 0], [0, 0, 1]]));
  });

  it('x축 둘레로 네 번 돌리면 원래 모양이다', () => {
    for (const id of STACK_IDS) {
      const cells = STACK_PIECES[id].cells;
      expect(times(4, (c) => rotateAbout(c, X_AXIS), cells)).toEqual(normalize(cells));
    }
  });

  it('-y축 둘레로도 네 번 돌리면 원래 모양이다', () => {
    const cells = STACK_PIECES.R4.cells;
    expect(times(4, (c) => rotateAbout(c, { x: 0, y: -1, z: 0 }), cells)).toEqual(normalize(cells));
  });

  it('z축 둘레로 돌리면 rotZ와 같다', () => {
    for (const id of STACK_IDS) {
      const cells = STACK_PIECES[id].cells;
      expect(rotateAbout(cells, Z_AXIS)).toEqual(rotZ(cells));
    }
  });
});

describe('orientations', () => {
  const COUNTS: Record<StackPieceId, [number, number, number]> = {
    I3: [3, 2, 2],
    L3: [12, 12, 4],
    I4: [3, 2, 2],
    O4: [3, 3, 1],
    T4: [12, 8, 4],
    L4: [24, 16, 4],
    S4: [12, 8, 2],
    Y4: [8, 8, 4],
    R4: [12, 12, 4],
    Q4: [12, 12, 4],
  };

  for (const id of STACK_IDS) {
    const [all, low, zOnly] = COUNTS[id];
    it(`${id}: 전체 ${all}, 높이 ≤ 2 ${low}, 옆 돌리기만 ${zOnly}`, () => {
      const cells = STACK_PIECES[id].cells;
      expect(orientations(cells)).toHaveLength(all);
      expect(orientations(cells).filter((o) => heightOf(o) <= MAX_H)).toHaveLength(low);
      expect(orientations(cells, true)).toHaveLength(zOnly);
    });
  }

  it('서로 다른 정규화된 방향만 돌려주고, 첫째는 원래 모양이다', () => {
    for (const id of STACK_IDS) {
      const os = orientations(STACK_PIECES[id].cells);
      expect(os[0]).toEqual(normalize(STACK_PIECES[id].cells));
      for (const o of os) expect(o).toEqual(normalize(o));
      expect(new Set(os.map((o) => o.map(key3).join(' '))).size).toBe(os.length);
    }
  });

  it('옆 돌리기만이면 바닥에 닿은 층이 바뀌지 않는다', () => {
    for (const o of orientations(STACK_PIECES.Y4.cells, true)) {
      expect(o.filter((c) => c.z === 1)).toHaveLength(1);
    }
  });

  it('Q4는 R4를 돌려서 만들 수 없는 거울상이다', () => {
    const q4 = normalize(STACK_PIECES.Q4.cells);
    expect(orientations(STACK_PIECES.R4.cells)).not.toContainEqual(q4);
    const mirrored = normalize(STACK_PIECES.R4.cells.map((c) => ({ x: c.x, y: -c.y, z: c.z })));
    expect(orientations(STACK_PIECES.Q4.cells)).toContainEqual(mirrored);
  });
});

describe('heightOf · sizeOf · centerOf', () => {
  it('평면 조각', () => {
    const i4 = STACK_PIECES.I4.cells;
    expect(heightOf(i4)).toBe(1);
    expect(sizeOf(i4)).toEqual({ w: 4, d: 1 });
    expect(centerOf(i4)).toEqual({ x: 2, y: 0.5, z: 0.5 });
  });

  it('입체 조각', () => {
    const y4 = STACK_PIECES.Y4.cells;
    expect(heightOf(y4)).toBe(2);
    expect(sizeOf(y4)).toEqual({ w: 2, d: 2 });
    expect(centerOf(y4)).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('세운 막대', () => {
    const up = vecs([[0, 0, 0], [0, 0, 1], [0, 0, 2]]);
    expect(heightOf(up)).toBe(3);
    expect(sizeOf(up)).toEqual({ w: 1, d: 1 });
  });
});
