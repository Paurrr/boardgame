import { describe, expect, it } from 'vitest';
import { normalize } from './shape';
import {
  flipH,
  flipOrientation,
  orient,
  rotateCW,
  rotateOrientation,
  shapeKey,
  uniqueOrientations,
} from './transform';
import type { Cell, Orientation, Rotation } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

const LINE3 = cells([[0, 0], [1, 0], [2, 0]]);
const SQUARE = cells([[0, 0], [1, 0], [0, 1], [1, 1]]);
const LINE4 = cells([[0, 0], [1, 0], [2, 0], [3, 0]]);
const TEE = cells([[0, 0], [1, 0], [2, 0], [1, 1]]);
const ELL = cells([[0, 0], [0, 1], [0, 2], [1, 2]]);
const ESS = cells([[1, 0], [2, 0], [0, 1], [1, 1]]);

const ALL_ORIENTATIONS: Orientation[] = [false, true].flatMap((flipped) =>
  ([0, 1, 2, 3] as Rotation[]).map((rotation) => ({ rotation, flipped })),
);

describe('rotateCW', () => {
  it('가로 막대를 세로로 세운다', () => {
    expect(rotateCW(LINE3)).toEqual(cells([[0, 0], [0, 1], [0, 2]]));
  });

  it('L을 시계방향으로 돌린다', () => {
    // ■        ■■■
    // ■   →    ■
    // ■■
    expect(rotateCW(ELL)).toEqual(cells([[0, 0], [1, 0], [2, 0], [0, 1]]));
  });

  it('네 번 돌리면 원래대로', () => {
    expect(rotateCW(rotateCW(rotateCW(rotateCW(ELL))))).toEqual(normalize(ELL));
  });
});

describe('flipH', () => {
  it('좌우로 뒤집는다', () => {
    expect(flipH(ELL)).toEqual(cells([[1, 0], [1, 1], [0, 2], [1, 2]]));
  });

  it('두 번 뒤집으면 원래대로', () => {
    expect(flipH(flipH(ESS))).toEqual(normalize(ESS));
  });
});

describe('orient', () => {
  it('기본 방향은 정규화한 원래 모양', () => {
    expect(orient(ELL, { rotation: 0, flipped: false })).toEqual(normalize(ELL));
  });

  it('뒤집은 뒤 돌린다', () => {
    expect(orient(ELL, { rotation: 1, flipped: true })).toEqual(rotateCW(flipH(ELL)));
  });
});

describe('uniqueOrientations', () => {
  it.each([
    ['정사각형', SQUARE, 1, 1],
    ['막대', LINE4, 2, 2],
    ['T', TEE, 4, 4],
    ['L', ELL, 8, 4],
    ['S', ESS, 4, 2],
  ])('%s: 뒤집기 포함 %i가지, 회전만 %i가지', (_name, shape, withFlip, rotateOnly) => {
    expect(uniqueOrientations(shape, true)).toHaveLength(withFlip);
    expect(uniqueOrientations(shape, false)).toHaveLength(rotateOnly);
  });

  it('회전만 허용하면 뒤집힌 방향이 없다', () => {
    expect(uniqueOrientations(ELL, false).every((o) => !o.flipped)).toBe(true);
  });

  it('서로 다른 모양만 남긴다', () => {
    const keys = uniqueOrientations(ELL, true).map((o) => shapeKey(orient(ELL, o)));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('rotateOrientation / flipOrientation', () => {
  it.each(ALL_ORIENTATIONS)('돌리기는 지금 보이는 모양을 시계방향으로 돌린다 (%o)', (o) => {
    expect(orient(ELL, rotateOrientation(o))).toEqual(rotateCW(orient(ELL, o)));
  });

  it.each(ALL_ORIENTATIONS)('뒤집기는 지금 보이는 모양을 좌우로 뒤집는다 (%o)', (o) => {
    expect(orient(ELL, flipOrientation(o))).toEqual(flipH(orient(ELL, o)));
  });
});
