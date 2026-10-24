import type { Difficulty } from '../../../lib/difficulty';
import type { Rng } from '../../../lib/random';
import { cellKey, isConnected, neighbors, shapeSize } from '../../blocks/logic/shape';
import { dropZ, footprintOf } from './board';
import { PLANAR_IDS, STACK_IDS, STACK_PIECES } from './pieces';
import { heightOf, key3, normalize, orientations, rotZ } from './rotate';
import { buildable, solveStack } from './solver';
import { MAX_H } from './types';
import type { Cell2, Placed, Puzzle, StackPieceId, Vec3 } from './types';

/** 쉬움 바닥의 최대 변 (설계 문서 §3.3). 수치는 조정 가능 */
export const EASY_MAX_SIDE = 3;
/** 보통·어려움 바닥의 최대 변 */
export const FULL_MAX_SIDE = 4;
/** 쉬움 목표에 있어야 할 2층 정육면체 수 */
export const EASY_MIN_UPPER = 2;
/** 쉬움: 적어도 이만큼 시도해 그중 바닥이 가장 뭉툭한 것을 고른다 */
export const EASY_TRIES = 300;
/** 보통·어려움 시도 상한 */
export const FULL_TRIES = 20000;
/** 쉬움 시도 상한 — 넘으면 칠판이 멈추지 않게 오류를 던진다 */
const EASY_GIVE_UP = 4000;

/** 보통·어려움 조각 수 */
const FULL_COUNT: Record<'normal' | 'hard', number> = { normal: 3, hard: 4 };

type Built = { target: Vec3[]; solution: Placed[] };

/**
 * 시드 기반 퍼즐 생성 (설계 문서 §3.4). 실제로 쌓아 본 배치에서 만들므로 항상 풀린다.
 * 바닥의 최소 좌표가 (0,0)이 되게 옮기고, 트레이 순서는 섞는다.
 */
export function generatePuzzle(rng: Rng, difficulty: Difficulty): Puzzle {
  const built = toOrigin(difficulty === 'easy' ? generateEasy(rng) : generateFull(rng, FULL_COUNT[difficulty]));
  const foot = footprintOf(built.target);
  const pieces = rng.shuffle(built.solution).map((p) => {
    if (difficulty !== 'easy') return { id: p.id, cells: normalize(STACK_PIECES[p.id].cells) };
    // 쉬움: 정답의 위아래 방향 그대로, 옆으로만 무작위로 돌려서 준다
    let cells = p.cells;
    for (let k = rng.int(4); k > 0; k--) cells = rotZ(cells);
    return { id: p.id, cells };
  });
  return {
    area: {
      width: Math.max(...foot.map((c) => c.x)) + 1,
      depth: Math.max(...foot.map((c) => c.y)) + 1,
      target: built.target,
      inside: difficulty === 'easy',
    },
    pieces,
    solution: built.solution,
  };
}

const lowCache = new Map<StackPieceId, Vec3[][]>();

/** 높이 제한 안의 방향 (쉬움은 시도마다 쓰므로 캐시) */
function lowOrientations(id: StackPieceId): Vec3[][] {
  let list = lowCache.get(id);
  if (!list) {
    list = orientations(STACK_PIECES[id].cells).filter((o) => heightOf(o) <= MAX_H);
    lowCache.set(id, list);
  }
  return list;
}

const cubesOf = (p: Placed): Vec3[] => p.cells.map((c) => ({ x: p.at.x + c.x, y: p.at.y + c.y, z: p.at.z + c.z }));

function toOrigin({ target, solution }: Built): Built {
  const dx = -Math.min(...target.map((c) => c.x));
  const dy = -Math.min(...target.map((c) => c.y));
  const move = (c: Vec3): Vec3 => ({ x: c.x + dx, y: c.y + dy, z: c.z });
  return { target: target.map(move), solution: solution.map((p) => ({ ...p, at: move(p.at) })) };
}

/** 보통·어려움: 서로 다른 count개로 바닥 × 2층을 정확히 덮고, 떨어뜨리기만으로 지어지는 배치 */
function generateFull(rng: Rng, count: number): Built {
  for (let attempt = 0; attempt < FULL_TRIES; attempt++) {
    const ids = rng.shuffle(STACK_IDS).slice(0, count);
    const total = ids.reduce((sum, id) => sum + STACK_PIECES[id].cells.length, 0);
    if (total % MAX_H !== 0) continue;
    const foot = randomFootprint(rng, total / MAX_H, FULL_MAX_SIDE);
    if (!foot) continue;
    const solution = solveStack(foot, ids, rng);
    if (!solution || !buildable(solution)) continue;
    const target: Vec3[] = [];
    for (let z = 0; z < MAX_H; z++) for (const f of foot) target.push({ x: f.x, y: f.y, z });
    return { target, solution };
  }
  throw new Error('퍼즐 생성 실패: 바닥 × 2층');
}

/** 칸을 하나씩 붙여 키우는 무작위 바닥. 이웃이 많은 칸일수록(가중치 = 이웃 수²) 잘 골라 뭉툭하게 만든다 */
function randomFootprint(rng: Rng, size: number, maxSide: number): Cell2[] | null {
  const cells = new Map<string, Cell2>([[cellKey({ x: 0, y: 0 }), { x: 0, y: 0 }]]);
  while (cells.size < size) {
    const frontier = new Map<string, { c: Cell2; w: number }>();
    for (const c of cells.values()) {
      for (const n of neighbors(c)) {
        const k = cellKey(n);
        if (cells.has(k) || frontier.has(k)) continue;
        const { w, h } = shapeSize([...cells.values(), n]);
        if (w > maxSide || h > maxSide) continue;
        const around = neighbors(n).filter((m) => cells.has(cellKey(m))).length;
        frontier.set(k, { c: n, w: around * around });
      }
    }
    const options = [...frontier.values()];
    if (options.length === 0) return null;
    let r = rng.next() * options.reduce((sum, o) => sum + o.w, 0);
    let pick = options[options.length - 1].c;
    for (const o of options) {
      r -= o.w;
      if (r < 0) {
        pick = o.c;
        break;
      }
    }
    cells.set(cellKey(pick), pick);
  }
  return [...cells.values()];
}

/**
 * 쉬움: 서로 다른 평면 조각 2개를 실제로 떨어뜨려 쌓은 모양이 목표다(일부 칸만 2층).
 * 떠 있는 칸이 없고 2층이 EASY_MIN_UPPER개 이상이며 바닥이 이어진 EASY_MAX_SIDE² 안인 것 중
 * 바닥 채움률이 가장 높은 것을 고른다.
 */
function generateEasy(rng: Rng): Built {
  let best: Built | null = null;
  let bestScore = -1;
  for (let attempt = 0; attempt < EASY_GIVE_UP && (best === null || attempt < EASY_TRIES); attempt++) {
    const placed: Placed[] = [];
    for (const id of rng.shuffle(PLANAR_IDS).slice(0, 2)) {
      const cells = rng.pick(lowOrientations(id));
      const ax = placed.length === 0 ? 0 : rng.int(7) - 3;
      const ay = placed.length === 0 ? 0 : rng.int(7) - 3;
      placed.push({ id, cells, at: { x: ax, y: ay, z: dropZ(cells, ax, ay, placed) } });
    }
    const cubes = placed.flatMap(cubesOf);
    if (cubes.some((c) => c.z >= MAX_H)) continue;
    const occupied = new Set(cubes.map(key3));
    if (cubes.some((c) => c.z > 0 && !occupied.has(key3({ x: c.x, y: c.y, z: c.z - 1 })))) continue;
    if (cubes.filter((c) => c.z === 1).length < EASY_MIN_UPPER) continue;
    const foot = footprintOf(cubes);
    const { w, h } = shapeSize(foot);
    if (w > EASY_MAX_SIDE || h > EASY_MAX_SIDE || !isConnected(foot)) continue;
    const score = foot.length / (w * h);
    if (score > bestScore) {
      best = { target: cubes, solution: placed };
      bestScore = score;
    }
  }
  if (!best) throw new Error('퍼즐 생성 실패: 쉬움');
  return best;
}
