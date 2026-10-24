export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** w×h 조각을 왼쪽 위 p 근처의 빈 영역 안으로 당긴다. 들어가는 영역 중 가장 덜 움직이는 쪽 */
export function freeSpot(free: readonly Rect[], p: Point, w: number, h: number): Point {
  let best = p;
  let bestDist = Infinity;
  // 들어가는 영역이 하나도 없으면 p 그대로다. 부르는 쪽이 어떤 조각이든 들어가는 영역을 하나는 넣어 준다
  for (const r of free) {
    if (r.w < w || r.h < h) continue;
    const c = { x: clamp(p.x, r.x, r.x + r.w - w), y: clamp(p.y, r.y, r.y + r.h - h) };
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}
