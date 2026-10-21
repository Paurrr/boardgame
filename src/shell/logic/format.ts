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

/** 총 걸린 시간 표시: 60초 미만 "45.2초", 이상 "1분 02.3초". 0.1초 단위로 먼저 반올림한 뒤 분·초로 나눈다 */
export function formatDuration(ms: number): string {
  const tenths = Math.round(ms / 100);
  if (tenths < 600) return (tenths / 10).toFixed(1) + '초';
  const m = Math.floor(tenths / 600);
  const rest = tenths % 600;
  return m + '분 ' + (rest < 100 ? '0' : '') + (rest / 10).toFixed(1) + '초';
}
