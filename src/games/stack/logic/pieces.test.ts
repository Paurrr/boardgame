import { describe, expect, it } from 'vitest';
import { PIECES } from '../../blocks/logic/pieces';
import { PLANAR_IDS, STACK_IDS, STACK_PIECES } from './pieces';
import type { Vec3 } from './types';

const vecs = (list: [number, number, number][]): Vec3[] => list.map(([x, y, z]) => ({ x, y, z }));

describe('STACK_PIECES', () => {
  it('10종이고 id가 서로 다르다', () => {
    expect(STACK_IDS).toHaveLength(10);
    expect(new Set(STACK_IDS).size).toBe(10);
    expect(Object.keys(STACK_PIECES).sort()).toEqual([...STACK_IDS].sort());
  });

  it('평면 조각은 1탄 조각에 z = 0을 붙인 것이고 색도 같다', () => {
    expect(PLANAR_IDS).toEqual(['I3', 'L3', 'I4', 'O4', 'T4', 'L4', 'S4']);
    for (const id of PLANAR_IDS) {
      const flat = PIECES[id as keyof typeof PIECES];
      expect(STACK_PIECES[id].cells).toEqual(flat.cells.map((c) => ({ x: c.x, y: c.y, z: 0 })));
      expect(STACK_PIECES[id].color).toBe(flat.color);
    }
  });

  it('입체 조각 셋의 모양', () => {
    expect(STACK_PIECES.Y4.cells).toEqual(vecs([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]]));
    expect(STACK_PIECES.R4.cells).toEqual(vecs([[0, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]]));
    expect(STACK_PIECES.Q4.cells).toEqual(vecs([[0, 1, 0], [1, 1, 0], [1, 0, 0], [1, 0, 1]]));
  });

  it('입체 조각 색은 1탄 5칸 조각에서 빌린다 (Y4←P5, R4←L5, Q4←U5)', () => {
    expect(STACK_PIECES.Y4.color).toBe(PIECES.P5.color);
    expect(STACK_PIECES.R4.color).toBe(PIECES.L5.color);
    expect(STACK_PIECES.Q4.color).toBe(PIECES.U5.color);
  });

  it('모든 조각은 정육면체 3~4개이고 면으로 이어져 있다', () => {
    for (const id of STACK_IDS) {
      const cells = STACK_PIECES[id].cells;
      expect(cells.length === 3 || cells.length === 4).toBe(true);
      const seen = new Set([0]);
      const stack = [0];
      while (stack.length > 0) {
        const a = cells[stack.pop() as number];
        cells.forEach((b, j) => {
          const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
          if (dist === 1 && !seen.has(j)) {
            seen.add(j);
            stack.push(j);
          }
        });
      }
      expect(seen.size).toBe(cells.length);
    }
  });
});
