import type { Difficulty } from '../../../lib/difficulty';
import type { Rng } from '../../../lib/random';
import { PENTOMINO_IDS, PIECE_IDS, PIECES, SMALL_PIECE_IDS } from './pieces';
import { cellKey, hasHoles, neighbors, normalize, shapeSize } from './shape';
import { orient, uniqueOrientations } from './transform';
import type { Cell, Orientation, PieceId, Placement, Puzzle } from './types';

export type GenRules = {
  minPieces: number;
  maxPieces: number;
  pool: readonly PieceId[];
  maxPentominoes: number;
  allowFlip: boolean;
  maxW: number;
  maxH: number;
};

/** 난이도별 생성 규칙 (설계 문서 §3.2). 크기 수치는 조정 가능 */
export const RULES: Record<Difficulty, GenRules> = {
  easy: { minPieces: 2, maxPieces: 3, pool: SMALL_PIECE_IDS, maxPentominoes: 0, allowFlip: false, maxW: 5, maxH: 4 },
  normal: { minPieces: 3, maxPieces: 3, pool: PIECE_IDS, maxPentominoes: 1, allowFlip: true, maxW: 5, maxH: 5 },
  hard: { minPieces: 4, maxPieces: 4, pool: PIECE_IDS, maxPentominoes: 4, allowFlip: true, maxW: 6, maxH: 5 },
};

/** 조각 조합 하나당 모을 유효 후보 수 — 그중 가장 반듯한 것을 고른다 */
const CANDIDATES = 20;
const MAX_ATTEMPTS = 300;
const MAX_PIECE_SETS = 50;
/** 조각 하나를 기존 덩어리에 붙일 때 무작위로 시도하는 횟수 */
const PLACE_TRIES = 40;

type OrientedShape = { o: Orientation; cells: Cell[] };
type Assembly = { placements: Placement[]; cells: Cell[] };

const shapeCache = new Map<string, OrientedShape[]>();

/**
 * 조각을 실제로 이어 붙여 만든 모양을 목표로 낸다 → 항상 풀 수 있다.
 * 쉬움은 회전만 써서 만들므로 뒤집기 없이 풀린다.
 */
export function generatePuzzle(rng: Rng, difficulty: Difficulty): Puzzle {
  const rules = RULES[difficulty];
  for (let set = 0; set < MAX_PIECE_SETS; set++) {
    const pieceIds = choosePieces(rng, rules);
    let best: Puzzle | null = null;
    let bestScore = -1;
    let found = 0;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && found < CANDIDATES; attempt++) {
      const assembly = assemble(rng, pieceIds, rules.allowFlip);
      if (!assembly) continue;
      const { w, h } = shapeSize(assembly.cells);
      if (w > rules.maxW || h > rules.maxH || hasHoles(assembly.cells)) continue;
      found++;
      const score = assembly.cells.length / (w * h);
      if (score > bestScore) {
        best = toPuzzle(pieceIds, assembly);
        bestScore = score;
      }
    }
    if (best) return best;
  }
  throw new Error('퍼즐 생성 실패: ' + difficulty);
}

function choosePieces(rng: Rng, rules: GenRules): PieceId[] {
  const count = rules.minPieces + rng.int(rules.maxPieces - rules.minPieces + 1);
  const chosen: PieceId[] = [];
  let pentominoes = 0;
  for (const id of rng.shuffle(rules.pool)) {
    if (chosen.length === count) break;
    const isPentomino = PENTOMINO_IDS.includes(id);
    if (isPentomino && pentominoes >= rules.maxPentominoes) continue;
    if (isPentomino) pentominoes++;
    chosen.push(id);
  }
  return chosen;
}

/** 조각의 서로 다른 방향별 모양 (자주 쓰므로 캐시) */
function orientedShapes(pieceId: PieceId, allowFlip: boolean): OrientedShape[] {
  const key = pieceId + (allowFlip ? '+flip' : '');
  let shapes = shapeCache.get(key);
  if (!shapes) {
    shapes = uniqueOrientations(PIECES[pieceId].cells, allowFlip).map((o) => ({
      o,
      cells: orient(PIECES[pieceId].cells, o),
    }));
    shapeCache.set(key, shapes);
  }
  return shapes;
}

/** 조각을 하나씩 기존 덩어리에 변으로 맞닿게 붙인다. 실패하면 null */
function assemble(rng: Rng, pieceIds: readonly PieceId[], allowFlip: boolean): Assembly | null {
  const placements: Placement[] = [];
  const occupied = new Set<string>();
  const cells: Cell[] = [];

  for (const pieceId of rng.shuffle(pieceIds)) {
    const shapes = orientedShapes(pieceId, allowFlip);
    let chosen: OrientedShape | null = null;
    let at: Cell = { x: 0, y: 0 };

    if (placements.length === 0) {
      chosen = rng.pick(shapes);
    } else {
      const frontier = frontierOf(cells, occupied);
      for (let t = 0; t < PLACE_TRIES && !chosen; t++) {
        const shape = rng.pick(shapes);
        const f = rng.pick(frontier);
        const s = rng.pick(shape.cells);
        const candidate = { x: f.x - s.x, y: f.y - s.y };
        const free = shape.cells.every((c) => !occupied.has(cellKey({ x: c.x + candidate.x, y: c.y + candidate.y })));
        if (free) {
          chosen = shape;
          at = candidate;
        }
      }
      if (!chosen) return null;
    }

    placements.push({ pieceId, orientation: chosen.o, at });
    for (const c of chosen.cells) {
      const abs = { x: c.x + at.x, y: c.y + at.y };
      occupied.add(cellKey(abs));
      cells.push(abs);
    }
  }
  return { placements, cells };
}

/** 덩어리에 변으로 맞닿은 빈칸들 */
function frontierOf(cells: readonly Cell[], occupied: ReadonlySet<string>): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const c of cells) {
    for (const n of neighbors(c)) {
      const k = cellKey(n);
      if (occupied.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
  }
  return out;
}

function toPuzzle(pieceIds: readonly PieceId[], assembly: Assembly): Puzzle {
  let minX = Infinity;
  let minY = Infinity;
  for (const c of assembly.cells) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
  }
  return {
    target: normalize(assembly.cells),
    pieceIds: pieceIds.slice(),
    solution: assembly.placements.map((p) => ({ ...p, at: { x: p.at.x - minX, y: p.at.y - minY } })),
  };
}
