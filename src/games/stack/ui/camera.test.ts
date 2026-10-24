import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../../../lib/difficulty';
import { createRng } from '../../../lib/random';
import type { Rng } from '../../../lib/random';
import { dropZ } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { key3 } from '../logic/rotate';
import { permutations } from '../logic/solver';
import type { Placed, Puzzle, Vec3 } from '../logic/types';
import {
  AZ0,
  EL0,
  SNAP_RADIUS,
  XRAY_RADIUS,
  applyMat,
  boardOutline,
  landingNear,
  makeCamera,
  pointInPolygon,
  project,
  rotMat,
  tipAxis,
  unproject,
  xrayCubes,
} from './camera';
import type { Camera, Pt } from './camera';

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

describe('makeCamera', () => {
  it('처음 시점에서 보는 사람 쪽 벡터는 세 성분이 모두 양수다', () => {
    const { d } = makeCamera(30, 50);
    expect(d.x).toBeGreaterThan(0);
    expect(d.y).toBeGreaterThan(0);
    expect(d.z).toBeGreaterThan(0);
  });

  it('기본 상수가 설계값이다', () => {
    expect([AZ0, EL0, SNAP_RADIUS, XRAY_RADIUS]).toEqual([30, 50, 0.9, 1.3]);
  });
});

describe('unproject', () => {
  it('투영한 점을 그 높이 평면으로 되돌리면 원래 좌표다', () => {
    for (const az of [0, 30, 100, 200, 300]) {
      const cam = makeCamera(az, 50);
      for (const z of [0, 1]) {
        for (let x = -3; x <= 3; x++) {
          for (let y = -3; y <= 3; y++) {
            const q = unproject(cam, project(cam, { x, y, z }), z);
            expect(Math.abs(q.x - x)).toBeLessThan(1e-9);
            expect(Math.abs(q.y - y)).toBeLessThan(1e-9);
          }
        }
      }
    }
  });
});

describe('tipAxis', () => {
  it('어느 방향에서 보든 눕히면 윗부분이 보는 사람 쪽으로 간다', () => {
    for (let az = 0; az < 360; az += 30) {
      const cam = makeCamera(az, 50);
      const top = applyMat(rotMat(tipAxis(cam), Math.PI / 2), { x: 0, y: 0, z: 1 });
      expect(dot(top, cam.d)).toBeGreaterThan(0);
    }
  });
});

describe('boardOutline · pointInPolygon', () => {
  it('판 중심은 판 윤곽 안이고 먼 점은 밖이다', () => {
    for (const [az, el] of [[AZ0, EL0], [0, 15], [135, 85], [250, 40]]) {
      const poly = boardOutline(makeCamera(az, el), 3, 3);
      expect(pointInPolygon({ x: 0, y: 0 }, poly)).toBe(true);
      expect(pointInPolygon({ x: 20, y: 20 }, poly)).toBe(false);
    }
  });
});

describe('xrayCubes', () => {
  const cam = makeCamera(30, 50);
  const toScreen = (p: Vec3): Pt => project(cam, p);
  const target = { x: 0, y: 0, z: 0 };

  it('떨어질 자리를 앞에서 가리는 칸은 흐리게 한다', () => {
    const front = { x: 1, y: 1, z: 1 };
    expect(xrayCubes(cam, toScreen, [target], [front]).has(key3(front))).toBe(true);
  });

  it('뒤쪽 칸은 흐리게 하지 않는다', () => {
    const back = { x: -1, y: -1, z: 0 };
    expect(xrayCubes(cam, toScreen, [target], [back]).has(key3(back))).toBe(false);
  });
});

describe('landingNear (놓기 시험)', () => {
  type Case = { puzzle: Puzzle; order: Placed[] };
  const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

  /** 떨어뜨리기만으로 정답 배치를 지을 수 있는 순서 */
  const buildOrder = (solution: Placed[]): Placed[] => {
    const order = permutations(solution).find((list) =>
      list.every((p, i) => dropZ(p.cells, p.at.x, p.at.y, list.slice(0, i)) === p.at.z),
    );
    if (!order) throw new Error('지을 수 없는 정답');
    return order;
  };

  let cases: Case[] | null = null;
  const allCases = (): Case[] => {
    if (!cases) {
      cases = [];
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 1; seed <= 60; seed++) {
          const puzzle = generatePuzzle(createRng(seed), difficulty);
          cases.push({ puzzle, order: buildOrder(puzzle.solution) });
        }
      }
    }
    return cases;
  };

  /** 정답 자리 화면점에 offset(rng)만큼 어긋나게 놓았을 때 맞는 자리·놓을 수 없음의 비율 */
  function dropStats(offset: (rng: Rng) => Pt): { correct: number; none: number } {
    const rng = createRng(7);
    let total = 0;
    let correct = 0;
    let none = 0;
    for (const { puzzle, order } of allCases()) {
      const { area } = puzzle;
      const pivot = { x: area.width / 2, y: area.depth / 2, z: 0 };
      for (let view = 0; view < 6; view++) {
        const cam: Camera = makeCamera(rng.next() * 360, 25 + rng.next() * 60);
        const placed: Placed[] = [];
        for (const p of order) {
          const s = project(cam, { x: p.at.x - pivot.x, y: p.at.y - pivot.y, z: p.at.z });
          const o = offset(rng);
          const l = landingNear(cam, area, placed, p.cells, { x: s.x + o.x, y: s.y + o.y }, pivot);
          total++;
          if (!l) none++;
          else if (l.x === p.at.x && l.y === p.at.y && l.z === p.at.z) correct++;
          placed.push(p);
        }
      }
    }
    return { correct: correct / total, none: none / total };
  }

  const inDisk = (r: number) => (rng: Rng): Pt => {
    const len = r * Math.sqrt(rng.next());
    const ang = rng.next() * 2 * Math.PI;
    return { x: len * Math.cos(ang), y: len * Math.sin(ang) };
  };

  it('거의 정확히 놓으면(0.2) 99% 이상 맞는 자리다', () => {
    expect(dropStats(inDisk(0.2)).correct).toBeGreaterThanOrEqual(0.99);
  });

  it('반 칸(0.5) 어긋나도 놓을 수 없음이 2% 이하이고 맞는 자리가 84% 이상이다', () => {
    const { correct, none } = dropStats(inDisk(0.5));
    expect(none).toBeLessThanOrEqual(0.02);
    expect(correct).toBeGreaterThanOrEqual(0.84);
  });

  it('3~4 떨어지면 95% 이상 놓을 수 없다', () => {
    const far = (rng: Rng): Pt => {
      const len = 3 + rng.next();
      const ang = rng.next() * 2 * Math.PI;
      return { x: len * Math.cos(ang), y: len * Math.sin(ang) };
    };
    expect(dropStats(far).none).toBeGreaterThanOrEqual(0.95);
  });
});
