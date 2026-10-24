import { freeSpot } from '../../../lib/rects';
import type { Rect } from '../../../lib/rects';
import { heightOf, orientations, sizeOf } from '../logic/rotate';
import { MAX_H } from '../logic/types';
import type { Vec3 } from '../logic/types';
import { EL_MAX, EL_MIN } from './camera';
import type { Pt } from './camera';

// 단위: 판 단위 (정육면체 한 변 = 1, SVG viewBox 좌표)
/** 트레이·판 밖 조각을 그리는 배율 (끄는 중은 1배) */
export const TRAY_SCALE = 0.6;
/** 가장자리 여백 */
export const PAD = 0.4;
/** 판 상자·버튼 줄·트레이 사이 간격 */
export const GAP = 0.45;
/** 트레이 슬롯 한 변에 더하는 여유 */
export const SLOT_PAD = 0.3;
/** 버튼 하나의 너비·기본 높이, 버튼 사이 간격, 면 아래 두께 블록 */
export const BTN_W = 3.6;
export const BTN_H = 1.4;
export const BTN_GAP = 0.6;
export const BTN_DEPTH = 0.24;
/** 누르는 요소의 최소 크기 (CSS px, docs/UI_GUIDE.md) */
export const MIN_BUTTON_PX = 56;

const RAD = Math.PI / 180;

export type StackLayout = {
  vbW: number;
  vbH: number;
  /** px / 판 단위 (xMidYMax meet). 크기를 아직 모르면 1 */
  scale: number;
  /** 어느 시점에서도 판이 들어가는 고정 상자 */
  boardBox: Rect;
  /** 버튼 줄 (높이에 BTN_DEPTH 포함) */
  buttons: Rect;
  /** 버튼 면 높이 (판 단위). buttonH × scale ≥ MIN_BUTTON_PX */
  buttonH: number;
  /** 트레이 슬롯 가운데 (pieces 순서) */
  slots: Pt[];
  slotSize: number;
};

/** 판을 어느 방향으로 돌리고 기울여도 들어가는 상자: 너비는 바닥 대각선, 높이는 기울기 범위(1° 간격)에서 가장 큰 화면 높이 */
export function boardBoxSize(width: number, depth: number): { w: number; h: number } {
  const diag = Math.hypot(width, depth);
  let h = 0;
  for (let el = EL_MIN; el <= EL_MAX; el++) {
    const t = el * RAD;
    // 바닥이 기울어 보이는 높이 + MAX_H층 기둥이 서 보이는 높이
    h = Math.max(h, diag * Math.sin(t) + MAX_H * Math.cos(t));
  }
  return { w: diag, h };
}

/** 트레이 슬롯 한 변: 어느 방향·시점에서도 트레이 배율로 그린 조각이 들어가게 조각을 감싸는 상자의 3D 대각선으로 */
export function slotSizeFor(pieces: { cells: Vec3[] }[], zOnly: boolean): number {
  let diag = 0;
  for (const p of pieces) {
    for (const o of orientations(p.cells, zOnly)) {
      const { w, d } = sizeOf(o);
      diag = Math.max(diag, Math.hypot(w, d, heightOf(o)));
    }
  }
  return diag * TRAY_SCALE + SLOT_PAD;
}

/** xMidYMax meet으로 칸(px)에 맞춘 배율. 크기를 아직 모르면 0 */
function meetScale(vbW: number, vbH: number, pxW: number, pxH: number): number {
  const s = Math.min(pxW / vbW, pxH / vbH);
  return s > 0 ? s : 0;
}

/**
 * 버튼 면이 MIN_BUTTON_PX가 되는 가장 낮은 높이 (판 단위). rest는 버튼 면 높이를 뺀 viewBox 높이.
 * 버튼을 높이면 viewBox도 길어져 배율이 줄므로, 늘리며 다시 계산하는 대신 두 맞춤 방향의 식을 바로 푼다
 */
function buttonHeightFor(vbW: number, rest: number, pxW: number, pxH: number): number {
  if (!(pxW > 0 && pxH > MIN_BUTTON_PX)) return BTN_H;
  // 가로로 맞출 때 h·pxW/vbW ≥ MIN, 세로로 맞출 때 h·pxH/(rest + h) ≥ MIN
  const need = Math.max((MIN_BUTTON_PX * vbW) / pxW, (MIN_BUTTON_PX * rest) / (pxH - MIN_BUTTON_PX));
  // 소수 오차로 MIN에 살짝 못 미치지 않게 아주 조금 더한다
  return Math.max(BTN_H, need * (1 + 1e-9));
}

/** 위에서부터 PAD, 판 상자, GAP, 버튼 줄, GAP, 트레이 rows줄, PAD. 모두 가로 가운데 */
function layoutWithRows(
  box: { w: number; h: number },
  slotSize: number,
  n: number,
  buttonsW: number,
  rows: number,
  pxW: number,
  pxH: number,
): StackLayout {
  const cols = Math.ceil(n / rows);
  const vbW = Math.max(box.w, buttonsW, cols * slotSize) + 2 * PAD;
  const buttonsY = PAD + box.h + GAP;
  const rest = buttonsY + BTN_DEPTH + GAP + rows * slotSize + PAD;
  const buttonH = buttonHeightFor(vbW, rest, pxW, pxH);
  const vbH = rest + buttonH;
  const trayY = buttonsY + buttonH + BTN_DEPTH + GAP;
  const slots: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    // 마지막 줄이 덜 차면 그 줄만 가운데로 모은다
    const inRow = Math.min(cols, n - row * cols);
    slots.push({ x: (vbW - inRow * slotSize) / 2 + ((i % cols) + 0.5) * slotSize, y: trayY + (row + 0.5) * slotSize });
  }
  return {
    vbW,
    vbH,
    scale: meetScale(vbW, vbH, pxW, pxH) || 1,
    boardBox: { x: (vbW - box.w) / 2, y: PAD, w: box.w, h: box.h },
    buttons: { x: (vbW - buttonsW) / 2, y: buttonsY, w: buttonsW, h: buttonH + BTN_DEPTH },
    buttonH,
    slots,
    slotSize,
  };
}

/** 칸(pxW×pxH) 안 배치. 트레이는 1줄과 2줄 중 판 단위가 더 크게 보이는 쪽. 시점(el)과 무관해 판을 돌려도 출렁이지 않는다 */
export function computeLayout(
  width: number,
  depth: number,
  slotSize: number,
  n: number,
  buttons: number,
  pxW: number,
  pxH: number,
): StackLayout {
  const box = boardBoxSize(width, depth);
  const buttonsW = Math.max(0, buttons * BTN_W + (buttons - 1) * BTN_GAP);
  const one = layoutWithRows(box, slotSize, n, buttonsW, 1, pxW, pxH);
  if (n < 2) return one;
  const two = layoutWithRows(box, slotSize, n, buttonsW, 2, pxW, pxH);
  return two.scale > one.scale ? two : one;
}

/** 판 중심 바닥 (W/2, D/2, 0)이 오는 화면점. 0~MAX_H층 상자의 화면 높이 가운데가 판 상자 가운데에 오게 내린다 */
export function boardOrigin(layout: StackLayout, el: number): Pt {
  const b = layout.boardBox;
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 + (MAX_H / 2) * Math.cos(el * RAD) };
}

/** xMidYMax meet으로 칸(px)에 맞췄을 때 화면에 보이는 SVG 좌표 범위. 크기를 아직 모르면 viewBox 그대로 */
function visibleArea(layout: StackLayout, pxW: number, pxH: number): Rect {
  const s = meetScale(layout.vbW, layout.vbH, pxW, pxH);
  if (!s) return { x: 0, y: 0, w: layout.vbW, h: layout.vbH };
  const w = pxW / s;
  const h = pxH / s;
  return { x: (layout.vbW - w) / 2, y: layout.vbH - h, w, h };
}

/** 화면 점(client px)을 SVG 좌표로. 남는 여백은 가로는 양옆에 반씩, 세로는 위에 모두 (xMidYMax meet). 크기를 아직 모르면 1px = 1 */
export function clientToSvg(
  layout: StackLayout,
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): Pt {
  const s = meetScale(layout.vbW, layout.vbH, box.width, box.height);
  if (!s) return { x: clientX - box.left, y: clientY - box.top };
  const v = visibleArea(layout, box.width, box.height);
  return { x: v.x + (clientX - box.left) / s, y: v.y + (clientY - box.top) / s };
}

const span = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });

/**
 * 판 밖 조각을 둘 수 있는 영역: 칸에 보이는 범위에서 판 상자와 버튼 줄을 뺀 곳 (가장자리는 PAD만큼 띄운다).
 * 판 상자 아래에 버튼 줄이 있는 모양에서 나오는 가장 큰 빈 직사각형들이다.
 * 첫째인 버튼 줄 아래는 트레이 자리라 어떤 조각이든 들어간다(looseSpot이 늘 갈 곳이 있다)
 */
export function looseAreas(layout: StackLayout, pxW: number, pxH: number): Rect[] {
  const v = visibleArea(layout, pxW, pxH);
  const left = v.x + PAD;
  const right = v.x + v.w - PAD;
  const top = v.y + PAD;
  const bottom = v.y + v.h - PAD;
  const { boardBox: b, buttons: t } = layout;
  const boardRight = b.x + b.w;
  const boardBottom = b.y + b.h;
  const buttonsRight = t.x + t.w;
  const buttonsBottom = t.y + t.h;
  return [
    span(left, buttonsBottom, right, bottom), // 버튼 줄 아래 (트레이 자리)
    span(left, top, right, b.y), // 판 상자 위 (칸이 세로로 길 때)
    span(left, boardBottom, right, t.y), // 판 상자와 버튼 줄 사이
    span(left, top, Math.min(b.x, t.x), bottom), // 왼쪽 끝
    span(Math.max(boardRight, buttonsRight), top, right, bottom), // 오른쪽 끝
    span(left, top, b.x, t.y), // 판 상자 왼쪽
    span(boardRight, top, right, t.y), // 판 상자 오른쪽
    span(left, boardBottom, t.x, bottom), // 버튼 줄 왼쪽
    span(buttonsRight, boardBottom, right, bottom), // 버튼 줄 오른쪽
  ].filter((r) => r.w > 0 && r.h > 0);
}

/** 가운데가 center인 w×h 조각을 판 밖 빈 곳 중 가장 가까운 자리로 당긴다. 가운데 좌표로 돌려주고, 안 움직인 축은 center 그대로다 */
export function looseSpot(layout: StackLayout, pxW: number, pxH: number, center: Pt, w: number, h: number): Pt {
  const p = { x: center.x - w / 2, y: center.y - h / 2 };
  const spot = freeSpot(looseAreas(layout, pxW, pxH), p, w, h);
  return {
    x: spot.x === p.x ? center.x : spot.x + w / 2,
    y: spot.y === p.y ? center.y : spot.y + h / 2,
  };
}
