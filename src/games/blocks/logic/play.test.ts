import { describe, expect, it } from 'vitest';
import { createRng } from '../../../lib/random';
import { boardAreaFor } from './board';
import { generatePuzzle } from './generator';
import { dropPiece, flipPiece, initialPieces, piecesSolved, placementsOf, rotatePiece } from './play';
import type { PieceState } from './play';
import type { BoardArea, Cell } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));
const at = (x: number, y: number): Cell => ({ x, y });

// 목표: I3 가로 + 아래 L3 (6칸). 판 5x4
const AREA: BoardArea = { width: 5, height: 4, target: cells([[1, 1], [2, 1], [3, 1], [1, 2], [1, 3], [2, 3]]) };
const start = (): PieceState[] => initialPieces(['I3', 'L3']);
const pieceOf = (pieces: PieceState[], id: string) => pieces.find((p) => p.pieceId === id) as PieceState;

describe('initialPieces', () => {
  it('모든 조각이 기본 방향으로 트레이에 있다', () => {
    expect(start()).toEqual([
      { pieceId: 'I3', orientation: { rotation: 0, flipped: false }, at: null },
      { pieceId: 'L3', orientation: { rotation: 0, flipped: false }, at: null },
    ]);
  });
});

describe('dropPiece', () => {
  it('놓을 수 있으면 판에 놓는다', () => {
    const next = dropPiece(start(), 'I3', at(1, 1), AREA, 'inside');
    expect(pieceOf(next, 'I3').at).toEqual(at(1, 1));
  });

  it('inside에서 목표 밖이면 트레이로 돌아간다', () => {
    const next = dropPiece(start(), 'I3', at(2, 1), AREA, 'inside');
    expect(pieceOf(next, 'I3').at).toBeNull();
  });

  it('free에서는 목표 밖으로 걸쳐도 판 안이면 놓인다', () => {
    const next = dropPiece(start(), 'I3', at(2, 0), AREA, 'free');
    expect(pieceOf(next, 'I3').at).toEqual(at(2, 0));
  });

  it('판 밖이면 트레이로 돌아간다', () => {
    const next = dropPiece(start(), 'I3', at(4, 0), AREA, 'free');
    expect(pieceOf(next, 'I3').at).toBeNull();
  });

  it('다른 조각과 겹치면 트레이로 돌아간다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'free');
    const next = dropPiece(placed, 'L3', at(2, 0), AREA, 'free');
    expect(pieceOf(next, 'L3').at).toBeNull();
  });

  it('판 위 조각을 살짝 옮겨 자기 원래 자리와 겹쳐도 된다', () => {
    const placed = dropPiece(start(), 'I3', at(0, 0), AREA, 'free');
    const next = dropPiece(placed, 'I3', at(1, 0), AREA, 'free');
    expect(pieceOf(next, 'I3').at).toEqual(at(1, 0));
  });

  it('null을 주면 트레이로 보낸다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'free');
    expect(pieceOf(dropPiece(placed, 'I3', null, AREA, 'free'), 'I3').at).toBeNull();
  });

  it('원래 배열은 바꾸지 않는다', () => {
    const before = start();
    dropPiece(before, 'I3', at(1, 1), AREA, 'free');
    expect(before[0].at).toBeNull();
  });
});

describe('rotatePiece', () => {
  it('트레이 조각은 방향만 돈다', () => {
    const next = rotatePiece(start(), 'I3', AREA, 'free');
    expect(pieceOf(next, 'I3')).toEqual({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: null });
  });

  it('판 위에서 돌려도 맞으면 판에 남는다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'free');
    const next = rotatePiece(placed, 'I3', AREA, 'free');
    expect(pieceOf(next, 'I3')).toEqual({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: at(2, 0) });
  });

  it('판 위에서 돌려서 안 맞으면 돌린 채로 트레이로 간다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'inside');
    const next = rotatePiece(placed, 'I3', AREA, 'inside');
    expect(pieceOf(next, 'I3')).toEqual({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: null });
  });
});

describe('flipPiece', () => {
  it('트레이 조각은 방향만 뒤집힌다', () => {
    const next = flipPiece(start(), 'L3', AREA, 'free');
    expect(pieceOf(next, 'L3').orientation).toEqual({ rotation: 0, flipped: true });
    expect(pieceOf(next, 'L3').at).toBeNull();
  });

  it('판 위에서 뒤집어도 맞으면 그 자리에 남는다', () => {
    const placed = dropPiece(start(), 'L3', at(0, 0), AREA, 'free');
    const next = flipPiece(placed, 'L3', AREA, 'free');
    expect(pieceOf(next, 'L3').at).toEqual(at(0, 0));
    expect(pieceOf(next, 'L3').orientation.flipped).toBe(true);
  });

  it('판 위에서 뒤집어서 안 맞으면 트레이로 간다', () => {
    const placed = dropPiece(start(), 'L3', at(1, 2), AREA, 'inside');
    expect(pieceOf(placed, 'L3').at).toEqual(at(1, 2));
    const next = flipPiece(placed, 'L3', AREA, 'inside');
    expect(pieceOf(next, 'L3').at).toBeNull();
  });
});

describe('placementsOf', () => {
  it('판 위 조각만 돌려주고 except는 뺀다', () => {
    const placed = dropPiece(dropPiece(start(), 'I3', at(1, 1), AREA, 'free'), 'L3', at(0, 2), AREA, 'free');
    expect(placementsOf(placed).map((p) => p.pieceId)).toEqual(['I3', 'L3']);
    expect(placementsOf(placed, 'I3').map((p) => p.pieceId)).toEqual(['L3']);
  });
});

describe('piecesSolved', () => {
  it('생성된 퍼즐의 정답대로 놓으면 true, 하나라도 트레이면 false', () => {
    const puzzle = generatePuzzle(createRng(5), 'normal');
    const area = boardAreaFor(puzzle.target, 'normal');
    const solvedPieces: PieceState[] = puzzle.solution.map((s) => ({
      pieceId: s.pieceId,
      orientation: s.orientation,
      at: { x: s.at.x + 2, y: s.at.y + 2 },
    }));
    expect(piecesSolved(solvedPieces, area)).toBe(true);
    const oneInTray = solvedPieces.map((p, i) => (i === 0 ? { ...p, at: null } : p));
    expect(piecesSolved(oneInTray, area)).toBe(false);
  });
});
