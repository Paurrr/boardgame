import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { isDevMode } from '../../../lib/devMode';
import { createRng } from '../../../lib/random';
import { useElementSize } from '../../../lib/useElementSize';
import { usePointerDrag } from '../../../lib/usePointerDrag';
import { outlineSegments } from '../../blocks/logic/shape';
import type { PlayerAreaProps } from '../../types';
import { canLift, footprintOf, isSolved, landing } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { STACK_PIECES } from '../logic/pieces';
import { centerOf, heightOf, key3, rotateAbout, rotZ, sizeOf } from '../logic/rotate';
import type { Placed, StackPieceId, Vec3 } from '../logic/types';
import {
  AZ0,
  boardOutline,
  EL0,
  EL_MAX,
  EL_MIN,
  landingNear,
  makeCamera,
  pointInPolygon,
  project,
  rotMat,
  tipAxis,
  xrayCubes,
} from './camera';
import type { Camera, Pt } from './camera';
import { CubeScene } from './CubeScene';
import type { SceneCube, Xf } from './CubeScene';
import { FpsMeter } from './FpsMeter';
import {
  boardOrigin,
  BTN_DEPTH,
  BTN_GAP,
  BTN_W,
  clientToSvg,
  computeLayout,
  looseSpot,
  slotSizeFor,
  TRAY_SCALE,
} from './layout';
import styles from './PlayerArea.module.css';

const BUTTON_RADIUS = 0.32;
/** 버튼 글자 크기 = 면 높이 × 이 값 (기본 높이 1.4에서 1탄과 같은 0.6) */
const BUTTON_FONT = 0.43;
/** 판 돌리기: 끈 거리 1 CSS px당 방향각·기울기 (도) */
const AZ_PER_PX = 0.6;
const EL_PER_PX = 0.35;
/** 회전 애니메이션 길이 (ms) */
const SPIN_MS = 220;
const Z_AXIS: Vec3 = { x: 0, y: 0, z: 1 };
const NO_XRAY = new Set<string>();

type PieceState = { id: StackPieceId; cells: Vec3[]; at: Vec3 | null };
/** 끄는 중 떨어질 자리, 그리고 판에 걸쳤는지 */
type Hover = { land: Vec3 | null; over: boolean };
/** 누른 점(SVG)과 그 점의 조각 안 좌표(배율 1). 끄는 동안 잡은 점을 손가락 아래에 둔다 */
type Grab = { start: Pt; local: Pt };
/** 조각 그룹 자리: 조각 원점이 오는 화면 점과 배율 */
type Base = { pos: Pt; s: number };
type Turn = 'side' | 'tip';
type View = { az: number; el: number };
/** 판을 돌리는 손가락: 누른 점과 그때의 시점 */
type ViewGrab = { pointerId: number; x: number; y: number; from: View };
/** 회전 애니메이션: 축 k(조각 중심을 지난다)와 시작 시각 (performance.now) */
type Spin = { id: StackPieceId; k: Vec3; t0: number };

const addPt = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const subPt = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const mulPt = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const add3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const fmt = (p: Pt) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
const translate = (b: Base) => `translate(${b.pos.x} ${b.pos.y})` + (b.s === 1 ? '' : ` scale(${b.s})`);
const shapeKey = (cells: Vec3[]) => cells.map(key3).join(' ');
const floorKey = (x: number, y: number) => `${x},${y}`;
const wrap360 = (a: number) => ((a % 360) + 360) % 360;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 트레이 배율로 그린 조각을 감싸는 화면 상자. 조각 상자 꼭짓점 8개의 투영이라 가운데가 centerOf의 투영이다 */
function traySize(cam: Camera, cells: Vec3[]): { w: number; h: number } {
  const { w, d } = sizeOf(cells);
  const c = centerOf(cells);
  let hx = 0;
  let hy = 0;
  for (const x of [0, w]) {
    for (const y of [0, d]) {
      for (const z of [0, heightOf(cells)]) {
        const q = project(cam, { x: x - c.x, y: y - c.y, z: z - c.z });
        hx = Math.max(hx, Math.abs(q.x));
        hy = Math.max(hy, Math.abs(q.y));
      }
    }
  }
  return { w: 2 * hx * TRAY_SCALE, h: 2 * hy * TRAY_SCALE };
}

type ActionButtonProps = { x: number; y: number; h: number; label: string; disabled: boolean; onPress: () => void };

/** 1탄과 같은 나무 블록 버튼. 여러 명이 동시에 만져도 동작하도록 click 대신 pointerdown에 반응한다 */
function ActionButton({ x, y, h, label, disabled, onPress }: ActionButtonProps) {
  return (
    <g
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      transform={`translate(${x} ${y})`}
      className={disabled ? styles.actionDisabled : styles.action}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!disabled) onPress();
      }}
    >
      <rect y={BTN_DEPTH} width={BTN_W} height={h} rx={BUTTON_RADIUS} className={styles.actionDepth} />
      <rect width={BTN_W} height={h} rx={BUTTON_RADIUS} className={styles.actionFace} />
      <text x={BTN_W / 2} y={h / 2} fontSize={h * BUTTON_FONT} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}

function PlayerAreaImpl({ difficulty, seed, active, onSolved }: PlayerAreaProps) {
  const puzzle = useMemo(() => generatePuzzle(createRng(seed), difficulty), [seed, difficulty]);
  const { area } = puzzle;
  const easy = difficulty === 'easy';
  /** 시점 (칸마다 따로, 라운드마다 처음 시점). 판 돌리기 제스처가 바꾼다 */
  const [view, setView] = useState<View>({ az: AZ0, el: EL0 });
  const cam = useMemo(() => makeCamera(view.az, view.el), [view]);
  const viewGrab = useRef<ViewGrab | null>(null);
  /** 다음 프레임에 그릴 시점. 판 돌리기는 한 프레임에 한 번만 다시 그린다 */
  const nextView = useRef<View | null>(null);
  const viewFrame = useRef({ id: 0 });
  const [spins, setSpins] = useState<Spin[]>([]);
  /** 회전 애니메이션 시계: 도는 조각이 있는 동안 프레임마다 performance.now */
  const [clock, setClock] = useState(0);
  const [dev] = useState(() => isDevMode(window.location.search));

  const [pieces, setPieces] = useState<PieceState[]>(() => puzzle.pieces.map((p) => ({ ...p, at: null })));
  const [selected, setSelected] = useState<StackPieceId | null>(null);
  /** 판 밖에 둔 조각의 화면 중심 (SVG 좌표). 가운데로 기억해야 돌려도 그 자리에서 돈다 */
  const [loose, setLoose] = useState<Partial<Record<StackPieceId, Pt>>>({});
  /** 그리는 순서. 마지막에 끈 조각이 맨 뒤(맨 위) */
  const [order, setOrder] = useState<StackPieceId[]>(() => puzzle.pieces.map((p) => p.id));
  const [dragging, setDragging] = useState<StackPieceId[]>([]);
  const [hover, setHover] = useState<Partial<Record<StackPieceId, Hover>>>({});
  const hoverKeys = useRef(new Map<StackPieceId, string>());
  const grabs = useRef(new Map<StackPieceId, Grab>());
  /** 끄는 조각 원점의 지금 자리. 끄는 중에 다시 그려도 손가락 자리를 지킨다 */
  const dragAt = useRef(new Map<StackPieceId, Pt>());
  /** 조각을 누르고 있는 손가락 (pointerId → 조각) */
  const held = useRef(new Map<number, StackPieceId>());
  const pieceEls = useRef(new Map<StackPieceId, SVGGElement>());
  const svgRef = useRef<SVGSVGElement | null>(null);
  const reported = useRef(false);
  const { ref: boxRef, size } = useElementSize<HTMLDivElement>();

  const buttonCount = easy ? 1 : 2;
  const slotSize = useMemo(() => slotSizeFor(puzzle.pieces, easy), [puzzle, easy]);
  const layout = useMemo(
    () => computeLayout(area.width, area.depth, slotSize, puzzle.pieces.length, buttonCount, size.width, size.height),
    [area, slotSize, puzzle, buttonCount, size],
  );
  /** 판 중심 바닥. 판은 이 점을 기준으로 돈다 */
  const pivot: Vec3 = { x: area.width / 2, y: area.depth / 2, z: 0 };
  const origin = boardOrigin(layout, view.el);
  const boardScreen = (p: Vec3): Pt => addPt(origin, project(cam, sub3(p, pivot)));
  const outline = useMemo(() => boardOutline(cam, area.width, area.depth), [cam, area]);

  const floor = useMemo(() => {
    const foot = footprintOf(area.target);
    const keys = new Set(foot.map((c) => floorKey(c.x, c.y)));
    const cells: { x: number; y: number; target: boolean }[] = [];
    for (let y = 0; y < area.depth; y++) {
      for (let x = 0; x < area.width; x++) cells.push({ x, y, target: keys.has(floorKey(x, y)) });
    }
    return { cells, edges: outlineSegments(foot) };
  }, [area]);

  const placed: Placed[] = [];
  for (const p of pieces) if (p.at) placed.push({ id: p.id, cells: p.cells, at: p.at });
  const solved = isSolved(area, placed);
  const canAct = active && !solved;

  useEffect(() => {
    if (solved && !reported.current) {
      reported.current = true;
      onSolved();
    }
  }, [solved, onSolved]);

  // 회전 애니메이션: 도는 조각이 있는 동안 매 프레임 시계를 넘겨 다시 그린다 (ADR-008 예외)
  useEffect(() => {
    if (spins.length === 0) return;
    let frame = requestAnimationFrame(function step() {
      const now = performance.now();
      setClock(now);
      if (spins.some((s) => now - s.t0 < SPIN_MS)) frame = requestAnimationFrame(step);
      else setSpins((prev) => prev.filter((s) => now - s.t0 < SPIN_MS));
    });
    return () => cancelAnimationFrame(frame);
  }, [spins]);

  useEffect(() => {
    const f = viewFrame.current;
    return () => cancelAnimationFrame(f.id);
  }, []);

  const indexOf = (id: StackPieceId) => pieces.findIndex((p) => p.id === id);
  const pieceOf = (id: StackPieceId) => pieces[indexOf(id)];
  const othersOf = (id: StackPieceId) => placed.filter((q) => q.id !== id);

  /** 판 위면 판 배율 1, 판 밖에 둔 적 있으면 그 자리, 아니면 자기 트레이 슬롯 (둘 다 트레이 배율, 가운데 기준) */
  const baseOf = (id: StackPieceId): Base => {
    const i = indexOf(id);
    const p = pieces[i];
    if (p.at) return { pos: boardScreen(p.at), s: 1 };
    const center = loose[id] ?? layout.slots[i];
    return { pos: subPt(center, mulPt(project(cam, centerOf(p.cells)), TRAY_SCALE)), s: TRAY_SCALE };
  };

  /** 끄는 조각(배율 1)의 원점이 pos일 때 떨어질 자리 */
  const landingAt = (id: StackPieceId, pos: Pt) =>
    landingNear(cam, area, othersOf(id), pieceOf(id).cells, subPt(pos, origin), pivot);

  /** 끄는 조각(배율 1)의 화면 중심이 판 상자 윤곽 안이면 판에 걸친 것이다 */
  const overBoard = (id: StackPieceId, pos: Pt) =>
    pointInPolygon(subPt(addPt(pos, project(cam, centerOf(pieceOf(id).cells))), origin), outline);

  const dragPos = (id: StackPieceId, dx: number, dy: number): Pt => {
    const g = grabs.current.get(id);
    if (!g) return baseOf(id).pos;
    return subPt(addPt(g.start, { x: dx / layout.scale, y: dy / layout.scale }), g.local);
  };

  const moveEl = (id: StackPieceId, b: Base) => pieceEls.current.get(id)?.setAttribute('transform', translate(b));

  /** 떨어질 자리나 판 걸침이 바뀔 때만 상태를 고친다 (끄는 동안 다시 그리기를 줄인다) */
  const setHoverOf = (id: StackPieceId, h: Hover | null) => {
    const k = h ? (h.land ? key3(h.land) : '-') + (h.over ? '+' : '') : '';
    if ((hoverKeys.current.get(id) ?? '') === k) return;
    if (h) hoverKeys.current.set(id, k);
    else hoverKeys.current.delete(id);
    setHover((prev) => {
      const next = { ...prev };
      if (h) next[id] = h;
      else delete next[id];
      return next;
    });
  };

  const startSpin = (id: StackPieceId, k: Vec3) =>
    setSpins((prev) => [...prev.filter((s) => s.id !== id), { id, k, t0: performance.now() }]);

  /** 도는 중이면 그릴 때만 쓰는 회전: 축 k 둘레 −90° → 0° (이징 1 − (1 − t)²). 축은 조각 중심 pivot을 지난다 */
  const spinXf = (id: StackPieceId, pivot: Vec3): Xf | undefined => {
    const s = spins.find((q) => q.id === id);
    if (!s) return undefined;
    const t = clamp((clock - s.t0) / SPIN_MS, 0, 1);
    if (t >= 1) return undefined;
    return { M: rotMat(s.k, (-Math.PI / 2) * (1 - t) ** 2), pivot };
  };

  const setAt = (id: StackPieceId, at: Vec3 | null) =>
    setPieces((prev) => prev.map((q) => (q.id === id ? { ...q, at } : q)));

  /** 판 밖 조각은 그 자리에서 돈다. 길어져 빈 곳을 벗어나면 가장 가까운 빈 곳으로 */
  const refitLoose = (id: StackPieceId, cells: Vec3[]) => {
    const center = loose[id];
    if (!center) return;
    const { w, h } = traySize(cam, cells);
    setLoose((prev) => ({ ...prev, [id]: looseSpot(layout, size.width, size.height, center, w, h) }));
  };

  const drag = usePointerDrag<StackPieceId>({
    onDragStart: (id) => {
      setDragging((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setOrder((prev) => [...prev.filter((p) => p !== id), id]);
    },
    onDragMove: (id, dx, dy) => {
      const p = dragPos(id, dx, dy);
      dragAt.current.set(id, p);
      // 끄는 동안 위치는 React 렌더 없이 transform만 바꾼다 (약한 칠판 SoC 대비)
      moveEl(id, { pos: p, s: 1 });
      setHoverOf(id, { land: canAct ? landingAt(id, p) : null, over: overBoard(id, p) });
    },
    onDragEnd: (id, dx, dy) => {
      const p = dragPos(id, dx, dy);
      grabs.current.delete(id);
      dragAt.current.delete(id);
      // 놓은 결과가 원래 자리와 같으면 React가 transform을 다시 쓰지 않으므로 직접 되돌린다
      moveEl(id, baseOf(id));
      setDragging((prev) => prev.filter((x) => x !== id));
      setHoverOf(id, null);
      // 라운드가 끝났거나(active false) 손가락을 빼앗겼으면(pointercancel) 놓지 않고 원래 자리로
      if (!canAct || (dx === 0 && dy === 0)) return;
      const land = landingAt(id, p);
      if (land) {
        setAt(id, land);
        return;
      }
      // 판에 걸쳤는데 놓을 자리가 없으면 판 밖 마지막 자리, 없으면 트레이로
      if (overBoard(id, p)) {
        setAt(id, null);
        return;
      }
      // 판 밖이면 그 자리에 둔다 (트레이 배율, 버튼 줄·칸 밖에 걸치면 가까운 빈 곳으로)
      const { cells } = pieceOf(id);
      const { w, h } = traySize(cam, cells);
      const center = addPt(p, project(cam, centerOf(cells)));
      setLoose((prev) => ({ ...prev, [id]: looseSpot(layout, size.width, size.height, center, w, h) }));
      setAt(id, null);
    },
    onTap: (id) => {
      grabs.current.delete(id);
      turn(id, 'side');
    },
  });

  /** 톡·버튼 돌리기: 옆으로(z축) 또는 보는 사람 쪽으로 눕히기 */
  function turn(id: StackPieceId, how: Turn) {
    // 끌고 있는 조각은 놓은 뒤에 바꾼다 (끄는 중에 바뀌면 떨어질 자리가 엇갈린다)
    if (!canAct || drag.isDragging(id)) return;
    const p = pieceOf(id);
    const k = how === 'side' ? Z_AXIS : tipAxis(cam);
    const cells = how === 'side' ? rotZ(p.cells) : rotateAbout(p.cells, k);
    // 새 방향은 바로 적용하고, 화면에서만 돌기 전 모습에서 굴러오게 그린다
    if (!p.at) {
      setPieces((prev) => prev.map((q) => (q.id === id ? { ...q, cells } : q)));
      refitLoose(id, cells);
      startSpin(id, k);
      return;
    }
    // 위에 얹힌 조각이 있으면 돌릴 수 없다
    if (!canLift(placed, id)) return;
    // 바닥 중심을 유지한 채 다시 떨어뜨려 본다 (trunc: 네 번 돌리면 제자리). 안 맞으면 판 밖 마지막 자리, 없으면 트레이로
    const from = sizeOf(p.cells);
    const to = sizeOf(cells);
    const ax = p.at.x + Math.trunc((from.w - to.w) / 2);
    const ay = p.at.y + Math.trunc((from.d - to.d) / 2);
    const at = landing(area, othersOf(id), cells, ax, ay);
    setPieces((prev) => prev.map((q) => (q.id === id ? { ...q, cells, at } : q)));
    startSpin(id, k);
    if (!at) refitLoose(id, cells);
  }

  const begin = (e: ReactPointerEvent<Element>, id: StackPieceId) => {
    if (!svgRef.current) return;
    e.stopPropagation();
    setSelected(id);
    // 한 조각은 한 손가락만 끈다 (usePointerDrag도 두 번째 손가락을 무시한다). 잡은 점은 첫 손가락 것을 지킨다
    for (const other of held.current.values()) if (other === id) return;
    const box = boxRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
    const start = clientToSvg(layout, box, e.clientX, e.clientY);
    const b = baseOf(id);
    grabs.current.set(id, { start, local: mulPt(subPt(start, b.pos), 1 / b.s) });
    held.current.set(e.pointerId, id);
    drag.begin(e, id, svgRef.current);
  };

  const onPieceDown = (id: StackPieceId) => (e: ReactPointerEvent<SVGGElement>) => {
    if (canAct) begin(e, id);
  };

  /** 판 위 조각: 위에 얹힌 조각이 없을 때만 든다 */
  const onBoardDown = (e: ReactPointerEvent<SVGGElement>) => {
    const id = (e.target as Element).closest('[data-piece]')?.getAttribute('data-piece');
    const p = pieces.find((q) => q.id === id);
    if (canAct && p?.at && canLift(placed, p.id)) begin(e, p.id);
  };

  /** 판 돌리기 시작. 조각·버튼은 자기 pointerdown에서 전파를 막으므로, 여기까지 오면 판 바닥·빈 곳·들 수 없는 조각이다 */
  const onViewDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!active || viewGrab.current || !svg) return;
    if (typeof svg.setPointerCapture === 'function') {
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        // 캡처를 못 해도 돌리기는 동작한다
      }
    }
    viewGrab.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, from: nextView.current ?? view };
  };

  /** 판을 돌리는 손가락이면 다음 프레임에 그릴 시점을 정하고 true. 조각을 끄는 손가락과는 pointerId로 나눈다 */
  const moveView = (e: ReactPointerEvent<SVGSVGElement>): boolean => {
    const g = viewGrab.current;
    if (!g || g.pointerId !== e.pointerId) return false;
    if (!active) return true;
    // 각도를 맞추지 않고 그대로 따라간다 (설계서 §4.3)
    nextView.current = {
      az: wrap360(g.from.az + (e.clientX - g.x) * AZ_PER_PX),
      el: clamp(g.from.el + (e.clientY - g.y) * EL_PER_PX, EL_MIN, EL_MAX),
    };
    const f = viewFrame.current;
    if (!f.id) {
      f.id = requestAnimationFrame(() => {
        f.id = 0;
        const v = nextView.current;
        nextView.current = null;
        if (v) setView(v);
      });
    }
    return true;
  };

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!moveView(e)) drag.move(e);
  };

  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (moveView(e)) {
      viewGrab.current = null;
      return;
    }
    drag.end(e);
    held.current.delete(e.pointerId);
  };

  const onCancel = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (viewGrab.current?.pointerId === e.pointerId) {
      viewGrab.current = null;
      return;
    }
    drag.cancel(e);
    held.current.delete(e.pointerId);
  };

  const press = (how: Turn) => {
    if (selected !== null) turn(selected, how);
  };

  // ---- 판 장면: 끄는 조각의 미리보기 + 판 위 조각 + 아직 안 채운 목표 칸(빈칸) ----
  const sceneCubes: SceneCube[] = [];
  const filled = new Set<string>();
  const previews: Vec3[] = [];
  for (const id of dragging) {
    const land = canAct ? hover[id]?.land : null;
    if (!land) continue;
    for (const c of pieceOf(id).cells) {
      const pos = add3(land, c);
      filled.add(key3(pos));
      previews.push(pos);
      sceneCubes.push({ pos, kind: 'preview', group: `preview-${id}`, color: STACK_PIECES[id].color });
    }
  }
  const resting = placed.filter((p) => !dragging.includes(p.id));
  // 떨어질 자리를 화면에서 가리는 판 위 정육면체는 흐리게
  const hidden =
    previews.length > 0
      ? xrayCubes(cam, boardScreen, previews, resting.flatMap((p) => p.cells.map((c) => add3(p.at, c))))
      : NO_XRAY;
  for (const p of resting) {
    const xf = spinXf(p.id, add3(p.at, centerOf(p.cells)));
    for (const c of p.cells) {
      const pos = add3(p.at, c);
      filled.add(key3(pos));
      sceneCubes.push({
        pos,
        kind: 'piece',
        // 도는 조각은 옆 조각과 맞닿은 면도 그린다
        group: xf ? `spin-${p.id}` : 'board',
        color: STACK_PIECES[p.id].color,
        pieceId: p.id,
        selected: selected === p.id,
        xray: hidden.has(key3(pos)),
        xf,
      });
    }
  }
  for (const t of area.target) if (!filled.has(key3(t))) sceneCubes.push({ pos: t, kind: 'ghost', group: 'ghost' });

  const local = (v: Vec3) => project(cam, v);
  const floorPoint = (x: number, y: number) => boardScreen({ x, y, z: 0 });
  const silhouette = floor.edges
    .map((s) => `M${fmt(floorPoint(s.x1, s.y1))}L${fmt(floorPoint(s.x2, s.y2))}`)
    .join('');
  const buttonsDisabled = !canAct || selected === null;
  const center = boardScreen({ x: area.width / 2, y: area.depth / 2, z: 1 });

  return (
    <div ref={boxRef} className={styles.box}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${layout.vbW} ${layout.vbH}`}
        preserveAspectRatio="xMidYMax meet"
        onPointerDown={onViewDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        data-testid="stack-svg"
        data-view={`${Math.round(view.az) % 360},${Math.round(view.el)}`}
      >
        {floor.cells.map((c) => (
          <polygon
            key={floorKey(c.x, c.y)}
            points={[
              floorPoint(c.x, c.y),
              floorPoint(c.x + 1, c.y),
              floorPoint(c.x + 1, c.y + 1),
              floorPoint(c.x, c.y + 1),
            ]
              .map(fmt)
              .join(' ')}
            className={c.target ? styles.floorTarget : styles.floorMargin}
            data-testid={c.target ? 'floor-target' : 'floor-margin'}
          />
        ))}
        <path
          d={silhouette}
          className={solved ? styles.silhouetteSolved : styles.silhouette}
          data-testid="silhouette"
        />

        <g onPointerDown={onBoardDown} data-testid="board-scene">
          <CubeScene cam={cam} toScreen={boardScreen} cubes={sceneCubes} />
        </g>

        {(easy ? ['돌리기'] : ['돌리기', '눕히기']).map((label, i) => (
          <ActionButton
            key={label}
            x={layout.buttons.x + i * (BTN_W + BTN_GAP)}
            y={layout.buttons.y}
            h={layout.buttonH}
            label={label}
            disabled={buttonsDisabled}
            onPress={() => press(i === 0 ? 'side' : 'tip')}
          />
        ))}

        {/* 트레이·판 밖·끄는 조각은 조각마다 그룹으로. 판 위 조각은 판 장면에 그리고 그룹은 비운다 */}
        {order.map((id) => {
          const p = pieceOf(id);
          const isDragging = dragging.includes(id);
          const onBoard = p.at !== null && !isDragging;
          const base = baseOf(id);
          const h = hover[id];
          const xf = spinXf(id, centerOf(p.cells));
          // 끄는 중: 놓을 수 있으면 판에 붙은 모습(미리보기)만 보이고, 판에 걸쳤는데 못 놓으면 흐릿하게 따라온다
          const look = !isDragging
            ? undefined
            : canAct && h?.land
              ? styles.floatHidden
              : h?.over
                ? styles.floatBlocked
                : undefined;
          return (
            <g
              key={id}
              data-testid="stack-piece"
              data-piece={id}
              data-state={p.at ? 'board' : loose[id] ? 'loose' : 'tray'}
              data-cells={shapeKey(p.cells)}
              transform={translate(isDragging ? { pos: dragAt.current.get(id) ?? base.pos, s: 1 } : base)}
              className={look}
              ref={(el) => {
                if (el) pieceEls.current.set(id, el);
                else pieceEls.current.delete(id);
              }}
              onPointerDown={onBoard ? undefined : onPieceDown(id)}
            >
              {!onBoard && (
                <CubeScene
                  cam={cam}
                  toScreen={local}
                  cubes={p.cells.map((c) => ({
                    pos: c,
                    kind: 'piece',
                    group: id,
                    color: STACK_PIECES[id].color,
                    selected: selected === id,
                    xf,
                  }))}
                />
              )}
            </g>
          );
        })}

        {solved && (
          <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central" className={styles.solvedText}>
            완성!
          </text>
        )}
      </svg>
      {dev && <FpsMeter className={styles.fps} />}
    </div>
  );
}

/** 셸의 타이머가 매 초 다시 그려도 퍼즐 칸은 props가 바뀔 때만 다시 그린다 */
export const PlayerArea = memo(PlayerAreaImpl);
