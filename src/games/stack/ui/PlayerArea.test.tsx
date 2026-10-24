import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Difficulty } from '../../../lib/difficulty';
import { createRng } from '../../../lib/random';
import { landing } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { centerOf, heightOf, key3, rotateAbout, rotZ, sizeOf } from '../logic/rotate';
import { permutations } from '../logic/solver';
import type { Placed, Puzzle, StackPieceId, Vec3 } from '../logic/types';
import { AZ0, EL0, makeCamera, project, tipAxis } from './camera';
import type { Pt } from './camera';
import sceneStyles from './CubeScene.module.css';
import { boardOrigin, clientToSvg, computeLayout, looseAreas, slotSizeFor, TRAY_SCALE } from './layout';
import { PlayerArea } from './PlayerArea';
import styles from './PlayerArea.module.css';

const noop = () => {};
const cam = makeCamera(AZ0, EL0);
const shapeKey = (cells: Vec3[]) => cells.map(key3).join(' ');
const addPt = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const subPt = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });

/** 칠판(1280×720) 4인 칸 하나의 조작 영역 (CSS px). jsdom은 크기가 0이라 흉내 낸다 */
const W = 316;
const H = 440;

function mockBoxSize() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: W,
    bottom: H,
    x: 0,
    y: 0,
    width: W,
    height: H,
    toJSON: () => ({}),
  } as DOMRect);
}

/** 칸 안 좌표 계산을 PlayerArea와 같은 식으로 한다 */
function geometry(puzzle: Puzzle, difficulty: Difficulty, pxW = W, pxH = H) {
  const { area } = puzzle;
  const easy = difficulty === 'easy';
  const slot = slotSizeFor(puzzle.pieces, easy);
  const layout = computeLayout(area.width, area.depth, slot, puzzle.pieces.length, easy ? 1 : 2, pxW, pxH);
  const origin = boardOrigin(layout, EL0);
  const boardScreen = (p: Vec3): Pt =>
    addPt(origin, project(cam, { x: p.x - area.width / 2, y: p.y - area.depth / 2, z: p.z }));
  const c0 = clientToSvg(layout, { left: 0, top: 0, width: pxW, height: pxH }, 0, 0);
  /** SVG 좌표 → client px (clientToSvg의 역) */
  const toClient = (p: Pt): Pt => ({ x: (p.x - c0.x) * layout.scale, y: (p.y - c0.y) * layout.scale });
  return { layout, boardScreen, toClient };
}

/** transform="translate(x y) scale(s)"의 위치와 배율 */
function placement(el: Element): { pos: Pt; s: number } {
  const m = /translate\(([^ ]+) ([^)]+)\)(?: scale\(([^)]+)\))?/.exec(el.getAttribute('transform') ?? '');
  if (!m) throw new Error('transform 없음');
  return { pos: { x: Number(m[1]), y: Number(m[2]) }, s: m[3] ? Number(m[3]) : 1 };
}

function pieceEl(id: StackPieceId): Element {
  const el = screen.getAllByTestId('stack-piece').find((e) => e.getAttribute('data-piece') === id);
  if (!el) throw new Error('조각 없음: ' + id);
  return el;
}

/** 판 위 조각은 판 장면의 정육면체를 눌러 잡는다 */
function grabTarget(id: StackPieceId): Element {
  const el = pieceEl(id);
  if (el.getAttribute('data-state') !== 'board') return el;
  const cube = screen.getByTestId('board-scene').querySelector(`[data-piece="${id}"]`);
  if (!cube) throw new Error('판 위 정육면체 없음: ' + id);
  return cube;
}

let nextPointer = 1;

function tap(id: StackPieceId) {
  const pointerId = nextPointer++;
  fireEvent.pointerDown(grabTarget(id), { pointerId, clientX: 0, clientY: 0 });
  fireEvent.pointerUp(screen.getByTestId('stack-svg'), { pointerId, clientX: 0, clientY: 0 });
}

/** 조각 원점(지금 그려진 자리)을 눌러 원점이 to(SVG 좌표, 판 크기 기준)에 오게 끈다. 놓지는 않는다 */
function dragStart(id: StackPieceId, to: Pt, toClient: (p: Pt) => Pt): number {
  const pointerId = nextPointer++;
  const from = toClient(placement(pieceEl(id)).pos);
  const end = toClient(to);
  fireEvent.pointerDown(grabTarget(id), { pointerId, clientX: from.x, clientY: from.y });
  fireEvent.pointerMove(screen.getByTestId('stack-svg'), { pointerId, clientX: end.x, clientY: end.y });
  return pointerId;
}

function release(pointerId: number, to: Pt, toClient: (p: Pt) => Pt) {
  const end = toClient(to);
  fireEvent.pointerUp(screen.getByTestId('stack-svg'), { pointerId, clientX: end.x, clientY: end.y });
}

function dragTo(id: StackPieceId, to: Pt, toClient: (p: Pt) => Pt) {
  release(dragStart(id, to, toClient), to, toClient);
}

/** 원점 자리에 두면 화면 중심(판 크기)이 center에 오는 원점 */
const originFor = (cells: Vec3[], center: Pt): Pt => subPt(center, project(cam, centerOf(cells)));

/** 판 밖 조각의 화면 중심 (트레이 배율) */
function looseCenter(el: Element): Pt {
  const { pos, s } = placement(el);
  const cells = (el.getAttribute('data-cells') ?? '').split(' ').map((k) => {
    const [x, y, z] = k.split(',').map(Number);
    return { x, y, z };
  });
  const c = project(cam, centerOf(cells));
  return { x: pos.x + c.x * s, y: pos.y + c.y * s };
}

/** 판 밖 빈 곳: 버튼 줄 아래(트레이 자리) 가운데 */
function farSpot(layout: ReturnType<typeof geometry>['layout']): Pt {
  const below = looseAreas(layout, W, H)[0];
  return { x: below.x + below.w / 2, y: below.y + below.h / 2 };
}

/** 떨어뜨리기만으로 지어지는 정답 순서 */
function buildOrder(puzzle: Puzzle): Placed[] {
  const order = permutations(puzzle.solution).find((o) => {
    const done: Placed[] = [];
    return o.every((s) => {
      const l = landing(puzzle.area, done, s.cells, s.at.x, s.at.y);
      done.push(s);
      return l !== null && l.z === s.at.z;
    });
  });
  if (!order) throw new Error('지을 순서 없음');
  return order;
}

/** 톡해서 정답 방향으로 맞춘다 (쉬움은 처음 방향이 정답의 옆 돌리기다) */
function turnTo(id: StackPieceId, cells: Vec3[]) {
  for (let i = 0; i < 4 && pieceEl(id).getAttribute('data-cells') !== shapeKey(cells); i++) tap(id);
  expect(pieceEl(id)).toHaveAttribute('data-cells', shapeKey(cells));
}

/** 시드 1부터 찾아 조건에 맞는 퍼즐과 조각 */
function findPuzzle(difficulty: Difficulty, ok: (p: Puzzle, i: number) => boolean) {
  for (let seed = 1; seed < 300; seed++) {
    const puzzle = generatePuzzle(createRng(seed), difficulty);
    const index = puzzle.pieces.findIndex((_, i) => ok(puzzle, i));
    if (index >= 0) return { seed, puzzle, piece: puzzle.pieces[index] };
  }
  throw new Error('맞는 퍼즐 없음');
}

const fitsAtOrigin = (puzzle: Puzzle, cells: Vec3[]) => landing(puzzle.area, [], cells, 0, 0) !== null;
const fitsNowhere = (puzzle: Puzzle, cells: Vec3[]) => {
  const { w, d } = sizeOf(cells);
  return w > puzzle.area.width || d > puzzle.area.depth;
};

describe('PlayerArea (쌓기 퍼즐)', () => {
  beforeEach(() => {
    mockBoxSize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('조각을 모두 트레이에 처음 방향으로 그린다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    const els = screen.getAllByTestId('stack-piece');
    expect(els).toHaveLength(puzzle.pieces.length);
    for (const p of puzzle.pieces) {
      expect(pieceEl(p.id)).toHaveAttribute('data-state', 'tray');
      expect(pieceEl(p.id)).toHaveAttribute('data-cells', shapeKey(p.cells));
      expect(placement(pieceEl(p.id)).s).toBe(TRAY_SCALE);
    }
  });

  it('바닥 칸은 바운딩박스 전체를 그리고, 목표 바닥 칸과 나머지 칸을 나눈다', () => {
    const puzzle = generatePuzzle(createRng(7), 'easy');
    render(<PlayerArea difficulty="easy" seed={7} active onSolved={noop} />);
    const floor = new Set(puzzle.area.target.map((t) => `${t.x},${t.y}`));
    expect(screen.getAllByTestId('floor-target')).toHaveLength(floor.size);
    expect(screen.queryAllByTestId('floor-margin')).toHaveLength(puzzle.area.width * puzzle.area.depth - floor.size);
  });

  it('쉬움에는 눕히기 버튼이 없고, 보통에는 있다', () => {
    const { unmount } = render(<PlayerArea difficulty="easy" seed={7} active onSolved={noop} />);
    expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '눕히기' })).toBeNull();
    unmount();
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '눕히기' })).toBeInTheDocument();
  });

  it('버튼은 면 아래에 두께 블록을 깔고, 고른 조각이 없으면 눌리지 않는 모양이다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    for (const name of ['돌리기', '눕히기']) {
      const button = screen.getByRole('button', { name });
      const [depth, face] = button.querySelectorAll('rect');
      expect(Number(depth.getAttribute('y'))).toBeGreaterThan(0);
      expect(face.getAttribute('y')).toBeNull();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    }
    fireEvent.pointerDown(pieceEl(puzzle.pieces[0].id), { pointerId: nextPointer++ });
    expect(screen.getByRole('button', { name: '돌리기' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('조각을 톡하면 옆으로 돌린다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { id, cells } = puzzle.pieces[0];
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    tap(id);
    expect(pieceEl(id)).toHaveAttribute('data-cells', shapeKey(rotZ(cells)));
  });

  it('조각을 누른 뒤 버튼을 누르면 돌리기는 옆으로, 눕히기는 보는 사람 쪽으로 돌린다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { id, cells } = puzzle.pieces[0];
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    fireEvent.pointerDown(pieceEl(id), { pointerId: nextPointer++ });
    fireEvent.pointerDown(screen.getByRole('button', { name: '눕히기' }));
    const tipped = rotateAbout(cells, tipAxis(makeCamera(30, 50)));
    expect(pieceEl(id)).toHaveAttribute('data-cells', shapeKey(tipped));
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(pieceEl(id)).toHaveAttribute('data-cells', shapeKey(rotZ(tipped)));
  });

  it('active가 false면 톡·버튼이 듣지 않는다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { id, cells } = puzzle.pieces[0];
    render(<PlayerArea difficulty="normal" seed={7} active={false} onSolved={noop} />);
    tap(id);
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(pieceEl(id)).toHaveAttribute('data-cells', shapeKey(cells));
  });

  it('정답 자리로 끌어 놓으면 판에 놓인다', () => {
    const puzzle = generatePuzzle(createRng(1), 'easy');
    const { boardScreen, toClient } = geometry(puzzle, 'easy');
    const first = buildOrder(puzzle)[0];
    render(<PlayerArea difficulty="easy" seed={1} active onSolved={noop} />);
    turnTo(first.id, first.cells);
    dragTo(first.id, boardScreen(first.at), toClient);
    expect(pieceEl(first.id)).toHaveAttribute('data-state', 'board');
  });

  it('끄는 중: 놓을 수 있으면 판에 미리보기를 그리고 손에 든 조각은 숨긴다. 판 밖이면 보통 모습이다', () => {
    const puzzle = generatePuzzle(createRng(1), 'easy');
    const { layout, boardScreen, toClient } = geometry(puzzle, 'easy');
    const first = buildOrder(puzzle)[0];
    render(<PlayerArea difficulty="easy" seed={1} active onSolved={noop} />);
    turnTo(first.id, first.cells);
    const previews = () => screen.getByTestId('board-scene').querySelectorAll(`polygon.${sceneStyles.preview}`);
    expect(previews()).toHaveLength(0);

    const pointerId = dragStart(first.id, boardScreen(first.at), toClient);
    expect(previews().length).toBeGreaterThan(0);
    expect(pieceEl(first.id)).toHaveClass(styles.floatHidden);
    // 끄는 중에는 판 크기(1배)
    expect(placement(pieceEl(first.id)).s).toBe(1);

    const far = originFor(first.cells, farSpot(layout));
    const p = toClient(far);
    fireEvent.pointerMove(screen.getByTestId('stack-svg'), { pointerId, clientX: p.x, clientY: p.y });
    expect(previews()).toHaveLength(0);
    expect(pieceEl(first.id)).not.toHaveClass(styles.floatHidden);
    expect(pieceEl(first.id)).not.toHaveClass(styles.floatBlocked);
    release(pointerId, far, toClient);
  });

  it('판에서 먼 빈 곳에 놓으면 그 자리에 트레이 크기로 둔다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { layout, toClient } = geometry(puzzle, 'normal');
    const { id, cells } = puzzle.pieces[0];
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    const spot = farSpot(layout);
    dragTo(id, originFor(cells, spot), toClient);
    expect(pieceEl(id)).toHaveAttribute('data-state', 'loose');
    expect(placement(pieceEl(id)).s).toBe(TRAY_SCALE);
    const c = looseCenter(pieceEl(id));
    expect(c.x).toBeCloseTo(spot.x);
    expect(c.y).toBeCloseTo(spot.y);
  });

  it('끈 조각은 맨 위에 그린다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { layout, toClient } = geometry(puzzle, 'normal');
    const { id, cells } = puzzle.pieces[0];
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    dragTo(id, originFor(cells, farSpot(layout)), toClient);
    const all = screen.getAllByTestId('stack-piece');
    expect(all[all.length - 1]).toBe(pieceEl(id));
  });

  it('판 위인데 놓을 수 없는 곳이면 흐릿하게 따라오고, 놓으면 트레이로 돌아간다', () => {
    const { seed, puzzle, piece } = findPuzzle('normal', (p, i) => fitsNowhere(p, p.pieces[i].cells));
    const { boardScreen, toClient } = geometry(puzzle, 'normal');
    render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
    const before = pieceEl(piece.id).getAttribute('transform');
    const mid = boardScreen({ x: puzzle.area.width / 2, y: puzzle.area.depth / 2, z: 1 });
    const to = originFor(piece.cells, mid);
    const pointerId = dragStart(piece.id, to, toClient);
    expect(pieceEl(piece.id)).toHaveClass(styles.floatBlocked);
    release(pointerId, to, toClient);
    expect(pieceEl(piece.id)).toHaveAttribute('data-state', 'tray');
    expect(pieceEl(piece.id).getAttribute('transform')).toBe(before);
  });

  it('같은 조각을 두 손가락으로 끌어도 첫 손가락 기준으로 놓인다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { layout, toClient } = geometry(puzzle, 'normal');
    const { id, cells } = puzzle.pieces[0];
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    const svg = screen.getByTestId('stack-svg');
    const spot = farSpot(layout);
    const from = toClient(placement(pieceEl(id)).pos);
    const end = toClient(originFor(cells, spot));
    fireEvent.pointerDown(pieceEl(id), { pointerId: 1, clientX: from.x, clientY: from.y });
    fireEvent.pointerDown(pieceEl(id), { pointerId: 2, clientX: from.x + 20, clientY: from.y });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: end.x, clientY: end.y });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: end.x + 20, clientY: end.y });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: end.x, clientY: end.y });
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: end.x + 20, clientY: end.y });
    const c = looseCenter(pieceEl(id));
    expect(c.x).toBeCloseTo(spot.x);
    expect(c.y).toBeCloseTo(spot.y);
  });

  it('쉬움 퍼즐을 정답대로 다 놓으면 onSolved를 한 번 부르고 완성!을 보인다', () => {
    const puzzle = generatePuzzle(createRng(1), 'easy');
    const { boardScreen, toClient } = geometry(puzzle, 'easy');
    const onSolved = vi.fn();
    const { rerender } = render(<PlayerArea difficulty="easy" seed={1} active onSolved={onSolved} />);
    expect(screen.getByTestId('silhouette')).not.toHaveClass(styles.silhouetteSolved);
    for (const s of buildOrder(puzzle)) {
      turnTo(s.id, s.cells);
      dragTo(s.id, boardScreen(s.at), toClient);
      expect(pieceEl(s.id)).toHaveAttribute('data-state', 'board');
    }
    rerender(<PlayerArea difficulty="easy" seed={1} active onSolved={onSolved} />);
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(screen.getByText('완성!')).toBeInTheDocument();
    expect(screen.getByTestId('silhouette')).toHaveClass(styles.silhouetteSolved);
  });

  it('끄는 중에 active가 false가 되면 놓지 않고 원래 자리로', () => {
    const puzzle = generatePuzzle(createRng(1), 'easy');
    const { boardScreen, toClient } = geometry(puzzle, 'easy');
    const first = buildOrder(puzzle)[0];
    const { rerender } = render(<PlayerArea difficulty="easy" seed={1} active onSolved={noop} />);
    turnTo(first.id, first.cells);
    const before = pieceEl(first.id).getAttribute('transform');
    const to = boardScreen(first.at);
    const pointerId = dragStart(first.id, to, toClient);
    rerender(<PlayerArea difficulty="easy" seed={1} active={false} onSolved={noop} />);
    release(pointerId, to, toClient);
    expect(pieceEl(first.id)).toHaveAttribute('data-state', 'tray');
    expect(pieceEl(first.id).getAttribute('transform')).toBe(before);
  });

  it('위에 얹힌 조각은 돌리기·들기가 안 된다', () => {
    // 납작한 조각 A를 (0,0)에 두고, 납작한 B를 (0,0)에 떨어뜨리면 A 위(z = 1)에 얹힌다
    let pair: { seed: number; a: Puzzle['pieces'][number]; b: Puzzle['pieces'][number] } | null = null;
    for (let seed = 1; seed < 300 && !pair; seed++) {
      const p = generatePuzzle(createRng(seed), 'normal');
      for (const a of p.pieces) {
        for (const b of p.pieces) {
          if (pair || a === b || heightOf(a.cells) !== 1 || heightOf(b.cells) !== 1) continue;
          const la = landing(p.area, [], a.cells, 0, 0);
          if (!la) continue;
          const lb = landing(p.area, [{ id: a.id, cells: a.cells, at: la }], b.cells, 0, 0);
          if (lb?.z === 1) pair = { seed, a, b };
        }
      }
    }
    if (!pair) throw new Error('얹을 짝 없음');
    const { seed, a, b } = pair;
    const puzzle = generatePuzzle(createRng(seed), 'normal');
    const { layout, boardScreen, toClient } = geometry(puzzle, 'normal');
    render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
    dragTo(a.id, boardScreen({ x: 0, y: 0, z: 0 }), toClient);
    dragTo(b.id, boardScreen({ x: 0, y: 0, z: 1 }), toClient);
    expect(pieceEl(a.id)).toHaveAttribute('data-state', 'board');
    expect(pieceEl(b.id)).toHaveAttribute('data-state', 'board');
    const placedA = pieceEl(a.id).getAttribute('transform');

    tap(a.id);
    expect(pieceEl(a.id)).toHaveAttribute('data-cells', shapeKey(a.cells));
    dragTo(a.id, originFor(a.cells, farSpot(layout)), toClient);
    expect(pieceEl(a.id)).toHaveAttribute('data-state', 'board');
    expect(pieceEl(a.id).getAttribute('transform')).toBe(placedA);
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '눕히기' }));
    expect(pieceEl(a.id)).toHaveAttribute('data-cells', shapeKey(a.cells));
  });

  it('판 위에서 돌려 안 맞으면 판 밖 마지막 자리로', () => {
    const { seed, puzzle, piece } = findPuzzle('normal', (p, i) => {
      const { cells } = p.pieces[i];
      return fitsAtOrigin(p, cells) && fitsNowhere(p, rotZ(cells));
    });
    const { layout, boardScreen, toClient } = geometry(puzzle, 'normal');
    render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
    const spot = farSpot(layout);
    dragTo(piece.id, originFor(piece.cells, spot), toClient);
    expect(pieceEl(piece.id)).toHaveAttribute('data-state', 'loose');
    dragTo(piece.id, boardScreen({ x: 0, y: 0, z: 0 }), toClient);
    expect(pieceEl(piece.id)).toHaveAttribute('data-state', 'board');

    tap(piece.id);
    expect(pieceEl(piece.id)).toHaveAttribute('data-cells', shapeKey(rotZ(piece.cells)));
    expect(pieceEl(piece.id)).toHaveAttribute('data-state', 'loose');
    const c = looseCenter(pieceEl(piece.id));
    expect(c.x).toBeCloseTo(spot.x);
    expect(c.y).toBeCloseTo(spot.y);
  });

  it('판 밖에 둔 적이 없으면 판 위에서 돌려 안 맞을 때 트레이로', () => {
    const { seed, puzzle, piece } = findPuzzle('normal', (p, i) => {
      const { cells } = p.pieces[i];
      return fitsAtOrigin(p, cells) && fitsNowhere(p, rotZ(cells));
    });
    const { boardScreen, toClient } = geometry(puzzle, 'normal');
    render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
    dragTo(piece.id, boardScreen({ x: 0, y: 0, z: 0 }), toClient);
    expect(pieceEl(piece.id)).toHaveAttribute('data-state', 'board');
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(pieceEl(piece.id)).toHaveAttribute('data-state', 'tray');
  });
});
