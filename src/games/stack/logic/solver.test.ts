import { describe, expect, it } from 'vitest';
import { createRng } from '../../../lib/random';
import { isSolved } from './board';
import { STACK_PIECES } from './pieces';
import { heightOf, orientations } from './rotate';
import { buildable, permutations, solveStack } from './solver';
import type { Cell2, Placed, StackPieceId, Vec3 } from './types';
import { MAX_H } from './types';

const cells2 = (list: [number, number][]): Cell2[] => list.map(([x, y]) => ({ x, y }));
const vecs = (list: [number, number, number][]): Vec3[] => list.map(([x, y, z]) => ({ x, y, z }));

/** solution이 footprint × 2층을 정확히 덮고, 조각마다 높이 2 이하의 실제 방향이며, ids를 하나씩 쓴다 */
function expectCovers(footprint: Cell2[], ids: StackPieceId[], solution: Placed[] | null) {
  expect(solution).not.toBeNull();
  const placed = solution as Placed[];
  const target = [0, 1].flatMap((z) => footprint.map((f) => ({ x: f.x, y: f.y, z })));
  const xs = footprint.map((f) => f.x);
  const ys = footprint.map((f) => f.y);
  const area = { width: Math.max(...xs) + 1, depth: Math.max(...ys) + 1, target, inside: false };
  expect(isSolved(area, placed)).toBe(true);
  expect(placed.map((p) => p.id).sort()).toEqual(ids.slice().sort());
  for (const p of placed) {
    expect(orientations(STACK_PIECES[p.id].cells)).toContainEqual(p.cells);
    expect(heightOf(p.cells)).toBeLessThanOrEqual(MAX_H);
  }
}

const SQUARE = cells2([[0, 0], [1, 0], [0, 1], [1, 1]]);
const LINE3 = cells2([[0, 0], [1, 0], [2, 0]]);
const CORNER3 = cells2([[0, 0], [1, 0], [1, 1]]);
const HOOK = cells2([[0, 0], [1, 0], [2, 0], [2, 1]]);
const RECT_2X3 = cells2([[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]);

describe('solveStack', () => {
  it('2×2 바닥은 O4 두 개로 2층까지 채운다', () => {
    expectCovers(SQUARE, ['O4', 'O4'], solveStack(SQUARE, ['O4', 'O4']));
  });

  it('일자 3칸은 I3·L3로 못 채운다', () => {
    expect(solveStack(LINE3, ['I3', 'L3'])).toBeNull();
  });

  it('ㄱ자 3칸도 I3·L3로 못 채운다 (I3를 세우면 3층)', () => {
    expect(solveStack(CORNER3, ['I3', 'L3'])).toBeNull();
  });

  it('갈고리 4칸은 L4·R4로 채우고 떨어뜨려 지을 수 있다', () => {
    const solution = solveStack(HOOK, ['L4', 'R4']);
    expectCovers(HOOK, ['L4', 'R4'], solution);
    expect(buildable(solution as Placed[])).toBe(true);
  });

  it('2×3 바닥은 T4·Y4·R4로 채운다', () => {
    expectCovers(RECT_2X3, ['T4', 'Y4', 'R4'], solveStack(RECT_2X3, ['T4', 'Y4', 'R4']));
  });

  it('정육면체 합이 바닥 × 2와 다르면 null이다', () => {
    expect(solveStack(SQUARE, ['O4'])).toBeNull();
    expect(solveStack(SQUARE, ['O4', 'I4', 'I3'])).toBeNull();
  });

  it('rng를 주어도 정답이고, 같은 시드면 같은 답이다', () => {
    const a = solveStack(RECT_2X3, ['T4', 'Y4', 'R4'], createRng(3));
    expectCovers(RECT_2X3, ['T4', 'Y4', 'R4'], a);
    expect(solveStack(RECT_2X3, ['T4', 'Y4', 'R4'], createRng(3))).toEqual(a);
  });
});

describe('permutations', () => {
  it('서로 다른 순서를 모두 낸다', () => {
    const all = permutations([1, 2, 3]);
    expect(all).toHaveLength(6);
    expect(new Set(all.map((p) => p.join(''))).size).toBe(6);
    for (const p of all) expect(p.slice().sort()).toEqual([1, 2, 3]);
  });

  it('하나뿐이면 그 하나다', () => {
    expect(permutations(['a'])).toEqual([['a']]);
  });
});

describe('buildable', () => {
  it('아래 조각을 먼저 두면 지어진다', () => {
    const solution: Placed[] = [
      { id: 'I3', cells: STACK_PIECES.I3.cells, at: { x: 0, y: 0, z: 1 } },
      { id: 'I3', cells: STACK_PIECES.I3.cells, at: { x: 0, y: 0, z: 0 } },
    ];
    expect(buildable(solution)).toBe(true);
  });

  it('서로 상대 밑으로 파고든 두 조각은 어떤 순서로도 못 짓는다', () => {
    // A는 (1,0) 기둥에서 B 위, B는 (0,1) 기둥에서 A 위에 걸친다
    const a = vecs([[0, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1]]);
    const b = vecs([[1, 0, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]]);
    const origin = { x: 0, y: 0, z: 0 };
    expect(
      buildable([
        { id: 'R4', cells: a, at: origin },
        { id: 'Q4', cells: b, at: origin },
      ]),
    ).toBe(false);
  });
});
