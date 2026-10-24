import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Difficulty } from '../../../lib/difficulty';
import { createRng } from '../../../lib/random';
import { landing } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { STACK_PIECES } from '../logic/pieces';
import { centerOf, heightOf, key3, rotateAbout, rotZ, sizeOf } from '../logic/rotate';
import { permutations } from '../logic/solver';
import type { Placed, Puzzle, StackPieceId, Vec3 } from '../logic/types';
import { AZ0, EL0, landingNear, makeCamera, project, tipAxis, xrayCubes } from './camera';
import type { Pt } from './camera';
import { CubeScene } from './CubeScene';
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

/** 납작한 조각 A를 (0,0)에 두고, 납작한 B를 (0,0)에 떨어뜨리면 A 위(z = 1)에 얹힌다 */
function findStackedPair() {
  for (let seed = 1; seed < 300; seed++) {
    const p = generatePuzzle(createRng(seed), 'normal');
    for (const a of p.pieces) {
      for (const b of p.pieces) {
        if (a === b || heightOf(a.cells) !== 1 || heightOf(b.cells) !== 1) continue;
        const la = landing(p.area, [], a.cells, 0, 0);
        if (!la) continue;
        const lb = landing(p.area, [{ id: a.id, cells: a.cells, at: la }], b.cells, 0, 0);
        if (lb?.z === 1) return { seed, a, b };
      }
    }
  }
  throw new Error('얹을 짝 없음');
}

/** requestAnimationFrame·performance.now가 가짜라 프레임은 이것으로만 넘어간다 */
function frames(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const viewOf = () => screen.getByTestId('stack-svg').getAttribute('data-view');

/** 판 빈 곳(바닥 칸)을 눌러 (dx, dy) CSS px만큼 끌고 놓는다 */
function swipe(dx: number, dy: number, target: Element = screen.getAllByTestId('floor-target')[0]) {
  const pointerId = nextPointer++;
  const svg = screen.getByTestId('stack-svg');
  fireEvent.pointerDown(target, { pointerId, clientX: 100, clientY: 100 });
  fireEvent.pointerMove(svg, { pointerId, clientX: 100 + dx, clientY: 100 + dy });
  fireEvent.pointerUp(svg, { pointerId, clientX: 100 + dx, clientY: 100 + dy });
}

/** 화면에 보이는 다각형들 (꼭짓점을 map으로 옮긴다) */
function drawn(polys: Iterable<Element>, map: (p: Pt) => Pt = (p) => p): Pt[][] {
  return [...polys].map((poly) =>
    (poly.getAttribute('points') ?? '').split(' ').map((s) => {
      const [x, y] = s.split(',').map(Number);
      return map({ x, y });
    }),
  );
}

/** 다각형 묶음 둘이 순서와 무관하게 같은 그림인가 (꼭짓점마다 오차 0.01 이내) */
function sameDrawing(a: Pt[][], b: Pt[][]): boolean {
  if (a.length !== b.length) return false;
  const near = (p: Pt, q: Pt) => Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01;
  const covers = (p: Pt[], q: Pt[]) => p.length === q.length && p.every((v) => q.some((w) => near(v, w)));
  const left = [...b];
  return a.every((p) => {
    const i = left.findIndex((q) => covers(p, q));
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
}

/** 트레이·판 밖 조각 그룹이 화면에 그린 모습 (그룹 transform 반영) */
function drawnPiece(el: Element): Pt[][] {
  const { pos, s } = placement(el);
  return drawn(el.querySelectorAll('polygon'), (p) => ({ x: pos.x + p.x * s, y: pos.y + p.y * s }));
}

/** 판 장면에 그린 그 조각의 정육면체들 */
function drawnOnBoard(id: StackPieceId): Pt[][] {
  return drawn(screen.getByTestId('board-scene').querySelectorAll(`[data-piece="${id}"] polygon`));
}

/** 회전 없이 그린 조각 (조각 그룹 안 좌표) */
function stillPoints(id: StackPieceId, cells: Vec3[]): (string | null)[] {
  const { container, unmount } = render(
    <svg>
      <CubeScene
        cam={cam}
        toScreen={(p) => project(cam, p)}
        cubes={cells.map((c) => ({ pos: c, kind: 'piece', group: id, color: STACK_PIECES[id].color }))}
      />
    </svg>,
  );
  const out = [...container.querySelectorAll('polygon')].map((p) => p.getAttribute('points'));
  unmount();
  return out;
}

const pointsOf = (el: Element) => [...el.querySelectorAll('polygon')].map((p) => p.getAttribute('points'));
const turns = (cells: Vec3[]) => shapeKey(rotZ(cells)) !== shapeKey(cells);

describe('PlayerArea (쌓기 퍼즐)', () => {
  beforeEach(() => {
    mockBoxSize();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
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
    const { seed, a, b } = findStackedPair();
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

  describe('판 돌리기', () => {
    it('판 빈 곳을 오른쪽으로 끌면 az가 늘고, 아래로 많이 끌면 el이 85에서 멈춘다. 다시 그리기는 다음 프레임에', () => {
      render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
      expect(viewOf()).toBe(`${AZ0},${EL0}`);
      const svg = screen.getByTestId('stack-svg');
      fireEvent.pointerDown(screen.getAllByTestId('floor-target')[0], { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(svg, { pointerId: 1, clientX: 150, clientY: 100 });
      expect(viewOf()).toBe(`${AZ0},${EL0}`);
      frames(20);
      // 1px당 0.6°
      expect(viewOf()).toBe(`${AZ0 + 30},${EL0}`);
      fireEvent.pointerMove(svg, { pointerId: 1, clientX: 150, clientY: 1100 });
      frames(20);
      expect(viewOf()).toBe(`${AZ0 + 30},85`);
      fireEvent.pointerUp(svg, { pointerId: 1, clientX: 150, clientY: 1100 });
      frames(20);
      expect(viewOf()).toBe(`${AZ0 + 30},85`);
    });

    it('놓은 각도에서 이어 돌고, az는 0~360으로 감싸며 el은 15에서 멈춘다', () => {
      render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
      swipe(50, 20);
      frames(20);
      // 위아래는 1px당 0.35°
      expect(viewOf()).toBe(`${AZ0 + 30},${EL0 + 7}`);
      swipe(-200, -1000);
      frames(20);
      expect(viewOf()).toBe(`${AZ0 + 30 - 120 + 360},15`);
    });

    it('active가 false면 판이 돌지 않는다', () => {
      render(<PlayerArea difficulty="normal" seed={7} active={false} onSolved={noop} />);
      swipe(50, 50);
      frames(20);
      expect(viewOf()).toBe(`${AZ0},${EL0}`);
    });

    it('두 손가락: 조각 끌기와 판 돌리기가 섞이지 않는다', () => {
      const puzzle = generatePuzzle(createRng(1), 'easy');
      const { boardScreen, toClient } = geometry(puzzle, 'easy');
      const first = buildOrder(puzzle)[0];
      render(<PlayerArea difficulty="easy" seed={1} active onSolved={noop} />);
      turnTo(first.id, first.cells);
      frames(300);
      const svg = screen.getByTestId('stack-svg');
      const from = toClient(placement(pieceEl(first.id)).pos);
      const to = toClient(boardScreen(first.at));
      fireEvent.pointerDown(pieceEl(first.id), { pointerId: 1, clientX: from.x, clientY: from.y });
      fireEvent.pointerDown(screen.getAllByTestId('floor-target')[0], { pointerId: 2, clientX: 200, clientY: 300 });
      fireEvent.pointerMove(svg, { pointerId: 1, clientX: to.x, clientY: to.y });
      fireEvent.pointerMove(svg, { pointerId: 2, clientX: 250, clientY: 300 });
      fireEvent.pointerUp(svg, { pointerId: 1, clientX: to.x, clientY: to.y });
      fireEvent.pointerUp(svg, { pointerId: 2, clientX: 250, clientY: 300 });
      frames(20);
      expect(pieceEl(first.id)).toHaveAttribute('data-state', 'board');
      expect(viewOf()).toBe(`${AZ0 + 30},${EL0}`);
    });

    it('들 수 없는(위에 얹힌) 판 위 조각을 끌면 그 조각은 그대로이고 시점이 돈다', () => {
      const { seed, a, b } = findStackedPair();
      const puzzle = generatePuzzle(createRng(seed), 'normal');
      const { boardScreen, toClient } = geometry(puzzle, 'normal');
      render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
      dragTo(a.id, boardScreen({ x: 0, y: 0, z: 0 }), toClient);
      dragTo(b.id, boardScreen({ x: 0, y: 0, z: 1 }), toClient);
      const svg = screen.getByTestId('stack-svg');
      fireEvent.pointerDown(grabTarget(a.id), { pointerId: 1, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(svg, { pointerId: 1, clientX: 150, clientY: 100 });
      frames(20);
      expect(viewOf()).toBe(`${AZ0 + 30},${EL0}`);
      expect(pieceEl(a.id)).not.toHaveClass(styles.floatBlocked);
      expect(pieceEl(a.id)).not.toHaveClass(styles.floatHidden);
      fireEvent.pointerUp(svg, { pointerId: 1, clientX: 150, clientY: 100 });
      frames(20);
      for (const p of [a, b]) {
        expect(pieceEl(p.id)).toHaveAttribute('data-state', 'board');
        expect(pieceEl(p.id)).toHaveAttribute('data-cells', shapeKey(p.cells));
      }
      expect(screen.getByTestId('board-scene').querySelector(`[data-piece="${a.id}"]`)).not.toBeNull();
    });
  });

  describe('회전 애니메이션', () => {
    it('톡하면 새 방향은 바로 적용하고, 화면에서는 220ms 동안 돌기 전 모습에서 굴러온다', () => {
      const puzzle = generatePuzzle(createRng(7), 'normal');
      const piece = puzzle.pieces.find((p) => turns(p.cells));
      if (!piece) throw new Error('돌리면 달라지는 조각 없음');
      const { id, cells } = piece;
      render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
      const before = drawnPiece(pieceEl(id));
      tap(id);
      expect(pieceEl(id)).toHaveAttribute('data-cells', shapeKey(rotZ(cells)));
      expect(sameDrawing(drawnPiece(pieceEl(id)), before)).toBe(true);
      frames(110);
      expect(sameDrawing(drawnPiece(pieceEl(id)), before)).toBe(false);
      frames(200);
      expect(pointsOf(pieceEl(id))).toEqual(stillPoints(id, rotZ(cells)));
    });

    it('눕히기는 보는 사람 쪽 축 둘레로 돌기 전 모습에서 굴러온다', () => {
      const puzzle = generatePuzzle(createRng(7), 'normal');
      const { id, cells } = puzzle.pieces[0];
      const tipped = rotateAbout(cells, tipAxis(cam));
      render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
      fireEvent.pointerDown(pieceEl(id), { pointerId: nextPointer++ });
      const before = drawnPiece(pieceEl(id));
      fireEvent.pointerDown(screen.getByRole('button', { name: '눕히기' }));
      expect(pieceEl(id)).toHaveAttribute('data-cells', shapeKey(tipped));
      expect(sameDrawing(drawnPiece(pieceEl(id)), before)).toBe(true);
      frames(300);
      expect(pointsOf(pieceEl(id))).toEqual(stillPoints(id, tipped));
    });

    it('판 위 조각은 판 위에서 조각 중심을 지나는 축으로 돈다', () => {
      // 돌려도 바닥 중심이 그대로인 조각과 자리 (가로·세로 길이 차가 짝수)
      let found: { seed: number; id: StackPieceId; at: Vec3 } | null = null;
      for (let seed = 1; seed < 300 && !found; seed++) {
        const { area, pieces } = generatePuzzle(createRng(seed), 'normal');
        for (const p of pieces) {
          const from = sizeOf(p.cells);
          const to = sizeOf(rotZ(p.cells));
          if (found || !turns(p.cells) || (from.w - to.w) % 2 !== 0) continue;
          for (let y = 0; y < area.depth && !found; y++) {
            for (let x = 0; x < area.width && !found; x++) {
              const at = landing(area, [], p.cells, x, y);
              const next = landing(area, [], rotZ(p.cells), x + (from.w - to.w) / 2, y + (from.d - to.d) / 2);
              if (at && next) found = { seed, id: p.id, at };
            }
          }
        }
      }
      if (!found) throw new Error('맞는 조각 없음');
      const { seed, id, at } = found;
      const puzzle = generatePuzzle(createRng(seed), 'normal');
      const { boardScreen, toClient } = geometry(puzzle, 'normal');
      render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
      dragTo(id, boardScreen(at), toClient);
      expect(pieceEl(id)).toHaveAttribute('data-state', 'board');
      const before = drawnOnBoard(id);
      tap(id);
      expect(pieceEl(id)).toHaveAttribute('data-state', 'board');
      expect(sameDrawing(drawnOnBoard(id), before)).toBe(true);
      frames(300);
      expect(sameDrawing(drawnOnBoard(id), before)).toBe(false);
    });
  });

  it('끄는 중 떨어질 자리를 가리는 판 위 정육면체는 흐리게 그린다', () => {
    // 판에 a를 두고 b를 끌어 오면 a의 정육면체가 b의 떨어질 자리를 가리는 경우
    type Case = { seed: number; a: Puzzle['pieces'][number]; at: Vec3; b: StackPieceId; land: Vec3; hidden: number };
    const add3 = (p: Vec3, c: Vec3): Vec3 => ({ x: p.x + c.x, y: p.y + c.y, z: p.z + c.z });
    let found: Case | null = null;
    for (let seed = 1; seed < 300 && !found; seed++) {
      const { area, pieces } = generatePuzzle(createRng(seed), 'normal');
      const pivot = { x: area.width / 2, y: area.depth / 2, z: 0 };
      const rel = (p: Vec3) => project(cam, { x: p.x - pivot.x, y: p.y - pivot.y, z: p.z });
      const spots: { x: number; y: number }[] = [];
      for (let y = 0; y < area.depth; y++) for (let x = 0; x < area.width; x++) spots.push({ x, y });
      for (const a of pieces) {
        for (const s of spots) {
          const at = landing(area, [], a.cells, s.x, s.y);
          if (!at) continue;
          const others = [{ id: a.id, cells: a.cells, at }];
          for (const b of pieces) {
            for (const t of spots) {
              if (found || a === b) continue;
              const land = landing(area, others, b.cells, t.x, t.y);
              if (!land) continue;
              // 그 자리 위로 끌면 미리보기가 거기에 붙는 경우만
              const near = landingNear(cam, area, others, b.cells, rel(land), pivot);
              if (!near || key3(near) !== key3(land)) continue;
              const targets = b.cells.map((c) => add3(land, c));
              const hidden = xrayCubes(cam, rel, targets, a.cells.map((c) => add3(at, c)));
              if (hidden.size > 0) found = { seed, a, at, b: b.id, land, hidden: hidden.size };
            }
          }
        }
      }
    }
    if (!found) throw new Error('가리는 경우 없음');
    const { seed, a, at, b, land, hidden } = found;
    const puzzle = generatePuzzle(createRng(seed), 'normal');
    const { boardScreen, toClient } = geometry(puzzle, 'normal');
    render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
    const xrays = () => [...screen.getByTestId('board-scene').querySelectorAll(`g.${sceneStyles.xray}`)];
    dragTo(a.id, boardScreen(at), toClient);
    expect(xrays()).toHaveLength(0);
    const pointerId = dragStart(b, boardScreen(land), toClient);
    expect(xrays()).toHaveLength(hidden);
    for (const el of xrays()) expect(el).toHaveAttribute('data-piece', a.id);
    release(pointerId, boardScreen(land), toClient);
    expect(pieceEl(b)).toHaveAttribute('data-state', 'board');
    expect(xrays()).toHaveLength(0);
  });

  describe('fps', () => {
    it('?dev가 아니면 fps 글자가 없다', () => {
      render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
      frames(1100);
      expect(screen.queryByText(/fps/)).toBeNull();
    });

    it('?dev면 초당 프레임 수를 보인다', () => {
      const url = window.location.href;
      window.history.replaceState(null, '', '/?dev');
      try {
        render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
        frames(1100);
        expect(screen.getByText(/^\d+ fps$/)).toBeInTheDocument();
      } finally {
        window.history.replaceState(null, '', url);
      }
    });
  });
});
