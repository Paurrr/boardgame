import { isTap, TAP_MAX_DURATION_MS } from '../../../lib/gesture';

/** 종에 닿은 손가락 하나. 시각은 화면이 이벤트의 timeStamp로 넘긴다 */
export type Press = { pointerId: number; player: number; downAt: number; upAt: number | null; distance: number };

export type PressDecision = { kind: 'wait' } | { kind: 'none' } | { kind: 'ring'; player: number };

export function pressDown(book: readonly Press[], pointerId: number, player: number, at: number): Press[] {
  return [...book.filter((p) => p.pointerId !== pointerId), { pointerId, player, downAt: at, upAt: null, distance: 0 }];
}

/** 없는 pointerId면 그대로 돌려준다 */
export function pressUp(book: readonly Press[], pointerId: number, at: number, distance: number): Press[] {
  return book.map((p) => (p.pointerId === pointerId ? { ...p, upAt: at, distance } : p));
}

const isTapPress = (p: Press) => p.upAt !== null && isTap(p.distance, p.upAt - p.downAt);
const isPending = (p: Press, now: number) => p.upAt === null && now - p.downAt < TAP_MAX_DURATION_MS;

/** 먼저 닿은 순서로 훑어 처음 만나는 대기·톡으로 정한다. 오래 누름·움직임은 빠진다 */
export function decide(book: readonly Press[], now: number): PressDecision {
  // sort는 안정 정렬이라 닿은 시각이 같으면 book에 먼저 들어온 것이 앞선다
  const byDown = book.slice().sort((a, b) => a.downAt - b.downAt);
  for (const p of byDown) {
    if (isPending(p, now)) return { kind: 'wait' };
    if (isTapPress(p)) return { kind: 'ring', player: p.player };
  }
  return { kind: 'none' };
}

/** 아직 톡인지 모르는 누름이 있나 (있으면 화면이 뒤집기를 막는다) */
export function isWaiting(book: readonly Press[], now: number): boolean {
  return book.some((p) => isPending(p, now));
}
