import { describe, expect, it } from 'vitest';
import { canLift, dropZ, footprintOf, isSolved, landing } from './board';
import { STACK_PIECES } from './pieces';
import type { Area, Placed, StackPieceId, Vec3 } from './types';

const vecs = (list: [number, number, number][]): Vec3[] => list.map(([x, y, z]) => ({ x, y, z }));
const place = (id: StackPieceId, cells: Vec3[], x: number, y: number, z: number): Placed => ({
  id,
  cells,
  at: { x, y, z },
});

const I3 = STACK_PIECES.I3.cells;
const L3 = STACK_PIECES.L3.cells;
const I4 = STACK_PIECES.I4.cells;
const O4 = STACK_PIECES.O4.cells;
const T4 = STACK_PIECES.T4.cells;
/** 세운 ㄱ자: 윗칸 (1,0,1) 밑이 비어 있다 */
const L3_UP = vecs([[0, 0, 0], [0, 0, 1], [1, 0, 1]]);

/** 바닥 칸 × 2층 */
const twoLayers = (floor: [number, number][]): Vec3[] =>
  [0, 1].flatMap((z) => floor.map(([x, y]) => ({ x, y, z })));

const BOX_2X2: Area = { width: 2, depth: 2, target: twoLayers([[0, 0], [1, 0], [0, 1], [1, 1]]), inside: false };
/** 바닥이 L3 모양 (0,0)(0,1)(1,1) — (1,0)은 바운딩박스 안이지만 바닥 밖 */
const L_FLOOR: [number, number][] = [[0, 0], [0, 1], [1, 1]];
const L_FREE: Area = { width: 2, depth: 2, target: twoLayers(L_FLOOR), inside: false };
const L_INSIDE: Area = { ...L_FREE, inside: true };
/** 쉬움 같은 건물: 1층 일자 3칸, 2층은 왼쪽 2칸만 */
const BUILDING: Area = { width: 3, depth: 1, target: vecs([[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 0, 1], [1, 0, 1]]), inside: true };

describe('dropZ', () => {
  it('빈 판이면 바닥(0)이다', () => {
    expect(dropZ(O4, 0, 0, [])).toBe(0);
    expect(dropZ(L3_UP, 3, 2, [])).toBe(0);
  });

  it('O4 위에 I3를 떨어뜨리면 1이다', () => {
    expect(dropZ(I3, 0, 0, [place('O4', O4, 0, 0, 0)])).toBe(1);
  });

  it('겹치는 기둥이 없으면 바닥이다', () => {
    expect(dropZ(I3, 0, 2, [place('O4', O4, 0, 0, 0)])).toBe(0);
  });

  it('떠 있는 정육면체 밑으로는 못 들어간다', () => {
    // L3_UP을 (-1,0,0)에 두면 (0,0,1)이 떠 있다
    const others = [place('L3', L3_UP, -1, 0, 0)];
    expect(dropZ(I3, 0, 0, others)).toBe(2);
  });

  it('윗칸만 다른 조각 위에 걸치면 아랫칸은 바닥에 닿는다', () => {
    expect(dropZ(L3_UP, 0, 0, [place('O4', O4, 1, 0, 0)])).toBe(0);
  });
});

describe('landing', () => {
  it('빈 판이면 바닥 자리다', () => {
    expect(landing(BOX_2X2, [], O4, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('쌓으면 떨어진 높이를 돌려준다', () => {
    expect(landing(BOX_2X2, [place('O4', O4, 0, 0, 0)], L3, 0, 0)).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('높이 2짜리 조각이 z = 1에 떨어지면 null이다', () => {
    expect(landing(BOX_2X2, [place('O4', O4, 0, 0, 0)], L3_UP, 0, 0)).toBeNull();
  });

  it('free: 바운딩박스 밖으로 나가면 null이다', () => {
    expect(landing(BOX_2X2, [], I3, 0, 0)).toBeNull();
    expect(landing(BOX_2X2, [], O4, -1, 0)).toBeNull();
    expect(landing(BOX_2X2, [], O4, 0, 1)).toBeNull();
  });

  it('free: 바닥 모양 밖이라도 바운딩박스 안이면 놓인다', () => {
    expect(landing(L_FREE, [], O4, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('inside: target 밖 칸이 있으면 null이다', () => {
    expect(landing(L_INSIDE, [], O4, 0, 0)).toBeNull();
    expect(landing(L_INSIDE, [], L3, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('inside: 떨어진 높이까지 target 안이어야 한다', () => {
    expect(landing(BUILDING, [], I3, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
    expect(landing(BUILDING, [place('I3', I3, 0, 0, 0)], I3, 0, 0)).toBeNull();
  });
});

describe('canLift', () => {
  it('아래 조각은 못 들고 위 조각은 든다', () => {
    const placed = [place('O4', O4, 0, 0, 0), place('L3', L3, 0, 0, 1)];
    expect(canLift(placed, 'O4')).toBe(false);
    expect(canLift(placed, 'L3')).toBe(true);
  });

  it('나란히 놓인 조각은 둘 다 든다', () => {
    const placed = [place('O4', O4, 0, 0, 0), place('I3', I3, 0, 2, 0)];
    expect(canLift(placed, 'O4')).toBe(true);
    expect(canLift(placed, 'I3')).toBe(true);
  });

  it('윗칸 하나만 걸쳐 얹혀도 아래 조각은 못 든다', () => {
    const placed = [place('O4', O4, 1, 0, 0), place('L3', L3_UP, 0, 0, 0)];
    expect(canLift(placed, 'O4')).toBe(false);
    expect(canLift(placed, 'L3')).toBe(true);
  });
});

describe('isSolved', () => {
  /** 1층 일자 4칸, 2층 왼쪽 3칸 */
  const area: Area = { width: 4, depth: 1, target: [...vecs([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]]), ...vecs([[0, 0, 1], [1, 0, 1], [2, 0, 1]])], inside: true };

  it('목표 칸을 정확히 채우면 true다', () => {
    expect(isSolved(area, [place('I4', I4, 0, 0, 0), place('I3', I3, 0, 0, 1)])).toBe(true);
  });

  it('덜 채우면 false다', () => {
    expect(isSolved(area, [place('I4', I4, 0, 0, 0)])).toBe(false);
    expect(isSolved(area, [])).toBe(false);
  });

  it('목표를 다 채워도 target 밖 정육면체가 하나라도 있으면 false다', () => {
    expect(isSolved(area, [place('I4', I4, 0, 0, 0), place('T4', T4, 0, 0, 1)])).toBe(false);
  });
});

describe('footprintOf', () => {
  it('target의 바닥 칸을 한 번씩 돌려준다', () => {
    const target = vecs([[0, 0, 0], [1, 0, 0], [0, 0, 1], [2, 1, 0], [2, 1, 1]]);
    expect(footprintOf(target)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 1 }]);
  });
});
