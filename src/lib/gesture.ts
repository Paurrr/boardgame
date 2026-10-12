/** 이보다 덜 움직이고(CSS px) 짧게 누르면 탭 */
export const TAP_MAX_DISTANCE = 10;
export const TAP_MAX_DURATION_MS = 300;

export function isTap(distance: number, durationMs: number): boolean {
  return distance < TAP_MAX_DISTANCE && durationMs < TAP_MAX_DURATION_MS;
}

export function movedBeyondTap(distance: number): boolean {
  return distance >= TAP_MAX_DISTANCE;
}
