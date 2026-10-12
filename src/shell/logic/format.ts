/** 남은 시간 표시: m:ss (초는 올림) */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

/** 걸린 시간 표시: 12.3초 */
export function formatSeconds(ms: number): string {
  return (Math.round(ms / 100) / 10).toFixed(1) + '초';
}
