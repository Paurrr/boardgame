import { MAX_PIECE_EXTENT } from '../logic/pieces';
import type { BoardArea } from '../logic/types';

// 단위: 퍼즐 칸 1개 = 1 (SVG viewBox 좌표)
/** 트레이 슬롯 한 변 — 어떤 조각이든 어느 방향이든 들어간다 */
export const SLOT = MAX_PIECE_EXTENT;
export const SLOT_GAP = 1;
/** 판과 트레이 사이 버튼 줄 높이 */
export const ACTION_H = 2;
export const PAD = 0.5;

export type Point = { x: number; y: number };

export type Layout = {
  width: number;
  height: number;
  boardX: number;
  boardY: number;
  actionY: number;
  /** pieces 배열 순서대로 조각마다 고정된 트레이 슬롯 왼쪽 위 */
  slots: Point[];
  columns: number;
};

export function computeLayout(area: BoardArea, pieceCount: number, columns: number): Layout {
  const cols = Math.max(1, Math.min(columns, pieceCount));
  const rows = Math.ceil(pieceCount / cols);
  const trayW = cols * SLOT + (cols - 1) * SLOT_GAP;
  const trayH = rows * SLOT + (rows - 1) * SLOT_GAP;
  const contentW = Math.max(area.width, trayW);
  const boardX = PAD + (contentW - area.width) / 2;
  const boardY = PAD;
  const actionY = boardY + area.height;
  const trayX = PAD + (contentW - trayW) / 2;
  const trayY = actionY + ACTION_H;
  const slots = Array.from({ length: pieceCount }, (_, i) => ({
    x: trayX + (i % cols) * (SLOT + SLOT_GAP),
    y: trayY + Math.floor(i / cols) * (SLOT + SLOT_GAP),
  }));
  return { width: contentW + 2 * PAD, height: trayY + trayH + PAD, boardX, boardY, actionY, slots, columns: cols };
}

/** 칸(px) 안에 layout을 꽉 맞췄을 때 퍼즐 칸 하나의 크기(px) */
export function cellSizeFor(layout: Layout, containerW: number, containerH: number): number {
  return Math.min(containerW / layout.width, containerH / layout.height);
}

/** 트레이 2열/4열 중 퍼즐 칸이 더 크게 보이는 쪽 */
export function bestLayout(area: BoardArea, pieceCount: number, containerW: number, containerH: number): Layout {
  const narrow = computeLayout(area, pieceCount, 2);
  if (containerW <= 0 || containerH <= 0) return narrow;
  const wide = computeLayout(area, pieceCount, 4);
  return cellSizeFor(wide, containerW, containerH) > cellSizeFor(narrow, containerW, containerH) ? wide : narrow;
}

/** w×h 모양을 슬롯 가운데에 둘 때 왼쪽 위 */
export function trayPosition(slot: Point, w: number, h: number): Point {
  return { x: slot.x + (SLOT - w) / 2, y: slot.y + (SLOT - h) / 2 };
}
