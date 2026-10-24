import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../../../lib/difficulty';
import { DIFFICULTIES } from '../../../lib/difficulty';
import { createRng } from '../../../lib/random';
import type { Rng } from '../../../lib/random';
import { footprintOf, isSolved, landing } from './board';
import { EASY_MAX_SIDE, EASY_MIN_UPPER, FULL_MAX_SIDE, generatePuzzle } from './generator';
import { PLANAR_IDS, STACK_PIECES } from './pieces';
import { key3, normalize, orientations } from './rotate';
import { permutations } from './solver';
import type { Cell2, Placed, Puzzle } from './types';

const SEEDS = 200;
const COUNT: Record<Difficulty, number> = { easy: 2, normal: 3, hard: 4 };

const batches = new Map<Difficulty, { puzzles: Puzzle[]; ms: number }>();

/** 시드 1~200으로 만든 퍼즐 (난이도마다 한 번만 만들고 걸린 시간을 잰다) */
function batch(difficulty: Difficulty): { puzzles: Puzzle[]; ms: number } {
  let b = batches.get(difficulty);
  if (!b) {
    const start = performance.now();
    const puzzles = Array.from({ length: SEEDS }, (_, i) => generatePuzzle(createRng(i + 1), difficulty));
    b = { puzzles, ms: performance.now() - start };
    batches.set(difficulty, b);
  }
  return b;
}

/** 어떤 순서로 하나씩 landing하면 정답 자리(z 포함)에 차례로 놓인다 */
function placeable(p: Puzzle): boolean {
  return permutations(p.solution).some((order) => {
    const placed: Placed[] = [];
    for (const s of order) {
      const l = landing(p.area, placed, s.cells, s.at.x, s.at.y);
      if (!l || l.x !== s.at.x || l.y !== s.at.y || l.z !== s.at.z) return false;
      placed.push(s);
    }
    return true;
  });
}

function connected(cells: Cell2[]): boolean {
  const set = new Set(cells.map((c) => `${c.x},${c.y}`));
  const seen = new Set([`${cells[0].x},${cells[0].y}`]);
  const stack = [cells[0]];
  while (stack.length > 0) {
    const c = stack.pop() as Cell2;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${c.x + dx},${c.y + dy}`;
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push({ x: c.x + dx, y: c.y + dy });
      }
    }
  }
  return seen.size === set.size;
}

describe.each(DIFFICULTIES)('generatePuzzle(%s) — 시드 200개 속성 테스트', (difficulty) => {
  it('200개를 5초 안에 만든다', () => {
    expect(batch(difficulty).ms).toBeLessThan(5000);
  });

  it('같은 시드면 같은 퍼즐이다', () => {
    const { puzzles } = batch(difficulty);
    puzzles.forEach((p, i) => expect(generatePuzzle(createRng(i + 1), difficulty)).toEqual(p));
  });

  it('함께 주는 solution이 정답이다', () => {
    for (const p of batch(difficulty).puzzles) expect(isSolved(p.area, p.solution)).toBe(true);
  });

  it('어떤 순서로 떨어뜨리면 정답 자리에 차례로 놓인다', () => {
    for (const p of batch(difficulty).puzzles) expect(placeable(p)).toBe(true);
  });

  it(`서로 다른 조각 ${COUNT[difficulty]}개를 트레이와 정답에 똑같이 쓴다`, () => {
    for (const p of batch(difficulty).puzzles) {
      const ids = p.pieces.map((q) => q.id);
      expect(ids).toHaveLength(COUNT[difficulty]);
      expect(new Set(ids).size).toBe(ids.length);
      expect(p.solution.map((s) => s.id).sort()).toEqual(ids.slice().sort());
    }
  });

  it('바닥 최소 좌표가 (0,0)이고 판은 바닥의 바운딩박스다', () => {
    for (const p of batch(difficulty).puzzles) {
      const foot = footprintOf(p.area.target);
      expect(Math.min(...foot.map((c) => c.x))).toBe(0);
      expect(Math.min(...foot.map((c) => c.y))).toBe(0);
      expect(p.area.width).toBe(Math.max(...foot.map((c) => c.x)) + 1);
      expect(p.area.depth).toBe(Math.max(...foot.map((c) => c.y)) + 1);
    }
  });
});

describe('쉬움', () => {
  const puzzles = (): Puzzle[] => batch('easy').puzzles;

  it('평면 조각만 쓴다', () => {
    for (const p of puzzles()) for (const q of p.pieces) expect(PLANAR_IDS).toContain(q.id);
  });

  it(`2층 정육면체가 ${EASY_MIN_UPPER}개 이상이고 떠 있는 칸이 없다`, () => {
    for (const p of puzzles()) {
      const target = new Set(p.area.target.map(key3));
      const upper = p.area.target.filter((c) => c.z === 1);
      expect(upper.length).toBeGreaterThanOrEqual(EASY_MIN_UPPER);
      for (const c of p.area.target) expect([0, 1]).toContain(c.z);
      for (const c of upper) expect(target.has(key3({ ...c, z: 0 }))).toBe(true);
    }
  });

  it(`바닥이 ${EASY_MAX_SIDE}×${EASY_MAX_SIDE} 이내이고 이어져 있다`, () => {
    for (const p of puzzles()) {
      expect(p.area.width).toBeLessThanOrEqual(EASY_MAX_SIDE);
      expect(p.area.depth).toBeLessThanOrEqual(EASY_MAX_SIDE);
      expect(connected(footprintOf(p.area.target))).toBe(true);
    }
  });

  it('안에만 놓는 방식이다', () => {
    for (const p of puzzles()) expect(p.area.inside).toBe(true);
  });

  it('처음 방향은 정답 방향을 옆으로만 돌린 것이다', () => {
    for (const p of puzzles()) {
      for (const q of p.pieces) {
        const answer = p.solution.find((s) => s.id === q.id) as Placed;
        expect(orientations(answer.cells, true)).toContainEqual(q.cells);
      }
    }
  });
});

describe.each(['normal', 'hard'] as const)('%s', (difficulty) => {
  const puzzles = (): Puzzle[] => batch(difficulty).puzzles;

  it('목표는 바닥 × 2층이다', () => {
    for (const p of puzzles()) {
      const foot = footprintOf(p.area.target);
      const full = [0, 1].flatMap((z) => foot.map((f) => key3({ x: f.x, y: f.y, z })));
      expect(p.area.target).toHaveLength(full.length);
      expect(new Set(p.area.target.map(key3))).toEqual(new Set(full));
    }
  });

  it(`바닥이 ${FULL_MAX_SIDE}×${FULL_MAX_SIDE} 이내다`, () => {
    for (const p of puzzles()) {
      expect(p.area.width).toBeLessThanOrEqual(FULL_MAX_SIDE);
      expect(p.area.depth).toBeLessThanOrEqual(FULL_MAX_SIDE);
    }
  });

  it('자유롭게 놓는 방식이다', () => {
    for (const p of puzzles()) expect(p.area.inside).toBe(false);
  });

  it('처음 방향은 조각 정의의 기본 방향이다', () => {
    for (const p of puzzles()) {
      for (const q of p.pieces) expect(q.cells).toEqual(normalize(STACK_PIECES[q.id].cells));
    }
  });
});

describe('시도 상한', () => {
  /** 늘 같은 수만 내는 rng — 조건에 맞는 퍼즐이 영영 안 나온다 (쉬움은 끊긴 바닥, 보통·어려움은 홀수 합) */
  const stuck: Rng = {
    next: () => 0,
    int: () => 0,
    pick: <T>(xs: readonly T[]): T => xs[0],
    shuffle: <T>(xs: readonly T[]): T[] => (xs.length > 1 ? [xs[0], ...xs.slice(2), xs[1]] : xs.slice()),
  };

  it.each(DIFFICULTIES)('%s: 못 만들면 멈추지 않고 오류를 던진다', (difficulty) => {
    expect(() => generatePuzzle(stuck, difficulty)).toThrow('퍼즐 생성 실패');
  });
});
