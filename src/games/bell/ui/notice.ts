import type { RingResult } from '../logic/types';

export type Notice = { text: string; tone: 'ok' | 'warn' | 'plain' };

/** 종 결과를 칸 하나(player)에 보여 줄 알림. 그 칸과 상관없으면 null */
export function noticeFor(ring: RingResult, player: number, names: readonly string[]): Notice | null {
  const name = names[ring.player];
  if (ring.kind === 'correct') {
    return ring.player === player
      ? { text: `${name} 먼저! +${ring.gained}장`, tone: 'ok' }
      : { text: `${name} 먼저!`, tone: 'plain' };
  }
  if (ring.player === player) return { text: `${name} 틀렸어요 −${ring.paidTo.length}장`, tone: 'warn' };
  if (ring.paidTo.includes(player)) return { text: '+1장', tone: 'plain' };
  return null;
}
