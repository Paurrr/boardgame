import { describe, expect, it } from 'vitest';
import { isSolved } from './board';
import { PIECES } from './pieces';
import { solve } from './solver';
import { flipH } from './transform';
import type { Cell } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

describe('solve', () => {
  it('풀 수 있는 모양의 정답 배치를 찾는다', () => {
    // ■■■
    // ■
    // ■■
    const target = cells([[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2]]);
    const result = solve(target, ['I3', 'L3'], true);
    expect(result).not.toBeNull();
    expect(isSolved(target, result ?? [])).toBe(true);
  });

  it('칸 수가 다르면 null', () => {
    expect(solve(cells([[0, 0], [1, 0]]), ['I3'], true)).toBeNull();
  });

  it('칸 수가 같아도 못 채우면 null', () => {
    expect(solve(cells([[0, 0], [1, 0], [2, 0], [3, 0]]), ['O4'], true)).toBeNull();
  });

  it('거울 모양은 뒤집기를 허용해야만 풀린다', () => {
    const mirrored = flipH(PIECES.L4.cells);
    expect(solve(mirrored, ['L4'], false)).toBeNull();
    expect(solve(mirrored, ['L4'], true)).not.toBeNull();
  });
});
