import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { isTap, movedBeyondTap } from './gesture';

export type DragCallbacks<T> = {
  onDragStart(id: T): void;
  /** dx, dy: 누른 지점부터 움직인 거리(CSS px) */
  onDragMove(id: T, dx: number, dy: number): void;
  onDragEnd(id: T, dx: number, dy: number): void;
  onTap(id: T): void;
};

type Session<T> = { id: T; startX: number; startY: number; startTime: number; moved: boolean };

/**
 * 포인터(손가락)마다 끌기/탭을 따로 추적한다.
 * begin은 대상 요소의 pointerdown에서, move/end/cancel은 captureTarget(SVG 루트)의 이벤트에서 부른다.
 */
export function usePointerDrag<T>(callbacks: DragCallbacks<T>) {
  const sessions = useRef(new Map<number, Session<T>>());

  function sessionOf(id: T): Session<T> | undefined {
    for (const s of sessions.current.values()) if (s.id === id) return s;
    return undefined;
  }

  /** 어떤 손가락이 id를 끌기 시작해 아직 놓지 않았으면 true (누르기만 한 상태는 false) */
  function isDragging(id: T): boolean {
    return sessionOf(id)?.moved === true;
  }

  function begin(e: ReactPointerEvent<Element>, id: T, captureTarget: Element): void {
    // 한 대상은 한 손가락만 끈다 — 두 번째 손가락·손바닥이 같은 조각을 두 번 놓지 않게
    if (sessionOf(id)) return;
    if (typeof captureTarget.setPointerCapture === 'function') {
      try {
        captureTarget.setPointerCapture(e.pointerId);
      } catch {
        // 캡처를 못 해도 끌기는 동작한다
      }
    }
    sessions.current.set(e.pointerId, {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      moved: false,
    });
  }

  function move(e: ReactPointerEvent<Element>): void {
    const s = sessions.current.get(e.pointerId);
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved) {
      if (!movedBeyondTap(Math.hypot(dx, dy))) return;
      s.moved = true;
      callbacks.onDragStart(s.id);
    }
    callbacks.onDragMove(s.id, dx, dy);
  }

  function end(e: ReactPointerEvent<Element>): void {
    const s = sessions.current.get(e.pointerId);
    if (!s) return;
    sessions.current.delete(e.pointerId);
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (s.moved) callbacks.onDragEnd(s.id, dx, dy);
    else if (isTap(Math.hypot(dx, dy), Date.now() - s.startTime)) callbacks.onTap(s.id);
  }

  function cancel(e: ReactPointerEvent<Element>): void {
    const s = sessions.current.get(e.pointerId);
    if (!s) return;
    sessions.current.delete(e.pointerId);
    if (s.moved) callbacks.onDragEnd(s.id, 0, 0);
  }

  return { begin, move, end, cancel, isDragging };
}
