import { cellKey, normalize } from './shape';
import type { Cell, Orientation, Rotation } from './types';

const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3];

/** 화면 좌표(y가 아래로 증가) 기준 시계방향 90° */
export function rotateCW(cells: readonly Cell[]): Cell[] {
  return normalize(cells.map((c) => ({ x: -c.y, y: c.x })));
}

/** 좌우 뒤집기 */
export function flipH(cells: readonly Cell[]): Cell[] {
  return normalize(cells.map((c) => ({ x: -c.x, y: c.y })));
}

/** 뒤집기 → 회전 순서로 적용한 정규화된 모양 */
export function orient(cells: readonly Cell[], o: Orientation): Cell[] {
  let out = o.flipped ? flipH(cells) : normalize(cells);
  for (let i = 0; i < o.rotation; i++) out = rotateCW(out);
  return out;
}

export function shapeKey(cells: readonly Cell[]): string {
  return normalize(cells).map(cellKey).join(';');
}

/** 모양이 서로 다른 방향만 돌려준다 (회전 대칭 조각은 줄어든다) */
export function uniqueOrientations(cells: readonly Cell[], allowFlip: boolean): Orientation[] {
  const seen = new Set<string>();
  const out: Orientation[] = [];
  const flips = allowFlip ? [false, true] : [false];
  for (const flipped of flips) {
    for (const rotation of ROTATIONS) {
      const o = { rotation, flipped };
      const key = shapeKey(orient(cells, o));
      if (!seen.has(key)) {
        seen.add(key);
        out.push(o);
      }
    }
  }
  return out;
}

/** 지금 보이는 모양을 시계방향으로 한 번 더 돌린 방향 */
export function rotateOrientation(o: Orientation): Orientation {
  return { rotation: ((o.rotation + 1) % 4) as Rotation, flipped: o.flipped };
}

/** 지금 보이는 모양을 좌우로 뒤집은 방향 (flipH ∘ rotate^r = rotate^-r ∘ flipH) */
export function flipOrientation(o: Orientation): Orientation {
  return { rotation: ((4 - o.rotation) % 4) as Rotation, flipped: !o.flipped };
}
