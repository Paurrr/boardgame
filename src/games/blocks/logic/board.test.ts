import { describe, expect, it } from 'vitest';
import {
  BOARD_MARGIN,
  boardAreaFor,
  canPlace,
  flipPlacement,
  isSolved,
  placedCells,
  placeModeOf,
  rotatePlacement,
} from './board';
import { PIECE_IDS } from './pieces';
import type { BoardArea, Cell, Placement } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));
const BASE = { rotation: 0, flipped: false } as const;
const at = (x: number, y: number): Cell => ({ x, y });

// 목표: 가로 I3 한 줄 + 그 아래 L3 = 6칸, 판 5x4(여유 칸 포함)
//   x: 0 1 2 3 4
// y0   . . . . .
// y1   . ■ ■ ■ .
// y2   . ■ . . .
// y3   . ■ ■ . .
const AREA: BoardArea = { width: 5, height: 4, target: cells([[1, 1], [2, 1], [3, 1], [1, 2], [1, 3], [2, 3]]) };

describe('placedCells', () => {
  it('방향을 적용한 모양을 at만큼 옮긴다', () => {
    expect(placedCells({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: at(2, 5) })).toEqual(
      cells([[2, 5], [2, 6], [2, 7]]),
    );
  });
});

describe('placeModeOf', () => {
  it('쉬움은 inside, 보통·어려움은 free', () => {
    expect(placeModeOf('easy')).toBe('inside');
    expect(placeModeOf('normal')).toBe('free');
    expect(placeModeOf('hard')).toBe('free');
  });
});

describe('boardAreaFor', () => {
  const target = cells([[0, 0], [1, 0], [2, 0], [0, 1]]);

  it('쉬움은 여유 칸 없이 목표 크기 그대로', () => {
    expect(BOARD_MARGIN.easy).toBe(0);
    expect(boardAreaFor(target, 'easy')).toEqual({ width: 3, height: 2, target });
  });

  it('어려움은 사방 2칸 여유를 두고 목표를 옮긴다', () => {
    const area = boardAreaFor(target, 'hard');
    expect(area.width).toBe(7);
    expect(area.height).toBe(6);
    expect(area.target).toEqual(cells([[2, 2], [3, 2], [4, 2], [2, 3]]));
  });
});

describe('canPlace — inside(쉬움)', () => {
  it('목표 안이면 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(1, 1) }, 'inside')).toBe(true);
  });

  it('목표 밖으로 한 칸이라도 나가면 안 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(2, 1) }, 'inside')).toBe(false);
  });

  it('다른 조각과 겹치면 안 놓인다', () => {
    const other: Placement = { pieceId: 'I3', orientation: BASE, at: at(1, 1) };
    expect(canPlace(AREA, [other], { pieceId: 'L3', orientation: BASE, at: at(1, 1) }, 'inside')).toBe(false);
  });
});

describe('canPlace — free(보통·어려움)', () => {
  it('목표 밖으로 삐져나와도 판 안이면 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(2, 0) }, 'free')).toBe(true);
  });

  it('판 밖으로 나가면 안 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(3, 0) }, 'free')).toBe(false);
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(-1, 0) }, 'free')).toBe(false);
    expect(canPlace(AREA, [], { pieceId: 'L3', orientation: BASE, at: at(0, 3) }, 'free')).toBe(false);
  });

  it('겹치면 안 놓인다', () => {
    const other: Placement = { pieceId: 'I3', orientation: BASE, at: at(0, 0) };
    expect(canPlace(AREA, [other], { pieceId: 'L3', orientation: BASE, at: at(2, 0) }, 'free')).toBe(false);
  });
});

describe('isSolved', () => {
  const target = cells([[0, 0], [1, 0], [2, 0], [3, 0]]);

  it('목표를 정확히 덮으면 true', () => {
    expect(isSolved(target, [{ pieceId: 'I4', orientation: BASE, at: at(0, 0) }])).toBe(true);
  });

  it('덜 덮으면 false', () => {
    expect(isSolved(target, [{ pieceId: 'I3', orientation: BASE, at: at(0, 0) }])).toBe(false);
  });

  it('목표 밖에 걸친 칸이 있으면 false', () => {
    expect(isSolved(target, [{ pieceId: 'I4', orientation: BASE, at: at(1, 0) }])).toBe(false);
  });

  it('놓인 조각이 없으면 false', () => {
    expect(isSolved(target, [])).toBe(false);
  });
});

describe('rotatePlacement', () => {
  it('가로 I4를 세우면 가운데 근처에 선다', () => {
    const r = rotatePlacement({ pieceId: 'I4', orientation: BASE, at: at(2, 2) });
    expect(r.orientation).toEqual({ rotation: 1, flipped: false });
    expect(r.at).toEqual(at(3, 1));
  });

  it.each(PIECE_IDS)('%s: 네 번 돌리면 같은 자리 같은 방향으로 돌아온다', (pieceId) => {
    for (const flipped of [false, true]) {
      const start: Placement = { pieceId, orientation: { rotation: 0, flipped }, at: at(5, 5) };
      let p = start;
      for (let i = 0; i < 4; i++) p = rotatePlacement(p);
      expect(p).toEqual(start);
    }
  });
});

describe('flipPlacement', () => {
  it('자리는 그대로 두고 뒤집는다', () => {
    const f = flipPlacement({ pieceId: 'L4', orientation: { rotation: 1, flipped: false }, at: at(3, 4) });
    expect(f).toEqual({ pieceId: 'L4', orientation: { rotation: 3, flipped: true }, at: at(3, 4) });
  });
});
