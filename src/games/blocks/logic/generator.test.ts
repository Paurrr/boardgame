import { beforeAll, describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../../lib/difficulty';
import { createRng } from '../../../lib/random';
import { isSolved } from './board';
import { generatePuzzle, RULES } from './generator';
import { PENTOMINO_IDS, PIECES } from './pieces';
import { hasHoles, isConnected, normalize, shapeSize } from './shape';
import { solve } from './solver';
import type { Puzzle } from './types';

const SEEDS = 1000;

describe.each(DIFFICULTIES)('generatePuzzle(%s) — 시드 1000개 속성 테스트', (difficulty) => {
  const rules = RULES[difficulty];
  let puzzles: Puzzle[] = [];

  beforeAll(() => {
    puzzles = Array.from({ length: SEEDS }, (_, i) => generatePuzzle(createRng(i + 1), difficulty));
  });

  it('조각 수, 조각 풀, 펜토미노 수 규칙을 지킨다', () => {
    for (const p of puzzles) {
      expect(p.pieceIds.length).toBeGreaterThanOrEqual(rules.minPieces);
      expect(p.pieceIds.length).toBeLessThanOrEqual(rules.maxPieces);
      expect(new Set(p.pieceIds).size).toBe(p.pieceIds.length);
      for (const id of p.pieceIds) expect(rules.pool).toContain(id);
      const pentominoes = p.pieceIds.filter((id) => PENTOMINO_IDS.includes(id)).length;
      expect(pentominoes).toBeLessThanOrEqual(rules.maxPentominoes);
    }
  });

  it('목표 모양은 정규화돼 있고, 크기 제한 안이며, 이어져 있고, 구멍이 없다', () => {
    for (const p of puzzles) {
      expect(p.target).toEqual(normalize(p.target));
      const { w, h } = shapeSize(p.target);
      expect(w).toBeLessThanOrEqual(rules.maxW);
      expect(h).toBeLessThanOrEqual(rules.maxH);
      expect(isConnected(p.target)).toBe(true);
      expect(hasHoles(p.target)).toBe(false);
    }
  });

  it('목표 칸 수는 조각 칸 수의 합과 같다', () => {
    for (const p of puzzles) {
      const total = p.pieceIds.reduce((sum, id) => sum + PIECES[id].cells.length, 0);
      expect(p.target).toHaveLength(total);
    }
  });

  it('함께 주는 solution이 실제 정답이다', () => {
    for (const p of puzzles) expect(isSolved(p.target, p.solution)).toBe(true);
  });

  it('독립 솔버로도 풀린다 (쉬움은 뒤집기 없이)', () => {
    for (const p of puzzles) expect(solve(p.target, p.pieceIds, rules.allowFlip)).not.toBeNull();
  });

  it('같은 시드는 같은 퍼즐을 만든다', () => {
    expect(generatePuzzle(createRng(99), difficulty)).toEqual(generatePuzzle(createRng(99), difficulty));
  });
});

describe('쉬움', () => {
  it('정답 배치에 뒤집은 조각이 없다', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = generatePuzzle(createRng(seed), 'easy');
      expect(p.solution.every((s) => !s.orientation.flipped)).toBe(true);
    }
  });
});
