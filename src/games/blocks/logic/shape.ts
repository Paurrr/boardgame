import type { Cell } from './types';

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export function cellKey(c: Cell): string {
  return c.x + ',' + c.y;
}

export function neighbors(c: Cell): Cell[] {
  return [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 },
  ];
}

function bounds(cells: readonly Cell[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cells) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }
  return { minX, minY, maxX, maxY };
}

/** 최소 좌표를 (0,0)으로 옮기고 y, x 순으로 정렬한 새 배열 */
export function normalize(cells: readonly Cell[]): Cell[] {
  if (cells.length === 0) return [];
  const { minX, minY } = bounds(cells);
  return cells
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

export function shapeSize(cells: readonly Cell[]): { w: number; h: number } {
  if (cells.length === 0) return { w: 0, h: 0 };
  const { minX, minY, maxX, maxY } = bounds(cells);
  return { w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function isConnected(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const all = new Set(cells.map(cellKey));
  const seen = new Set<string>([cellKey(cells[0])]);
  const stack: Cell[] = [cells[0]];
  while (stack.length > 0) {
    const c = stack.pop() as Cell;
    for (const n of neighbors(c)) {
      const k = cellKey(n);
      if (all.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  return seen.size === all.size;
}

/** 사방이 막힌 빈칸이 있으면 true */
export function hasHoles(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const filled = new Set(cells.map(cellKey));
  const { minX, minY, maxX, maxY } = bounds(cells);
  // 바운딩박스를 한 칸 넓힌 영역에서 바깥 빈칸을 모두 칠한다
  const start = { x: minX - 1, y: minY - 1 };
  const outside = new Set<string>([cellKey(start)]);
  const stack: Cell[] = [start];
  while (stack.length > 0) {
    const c = stack.pop() as Cell;
    for (const n of neighbors(c)) {
      if (n.x < minX - 1 || n.x > maxX + 1 || n.y < minY - 1 || n.y > maxY + 1) continue;
      const k = cellKey(n);
      if (filled.has(k) || outside.has(k)) continue;
      outside.add(k);
      stack.push(n);
    }
  }
  const total = (maxX - minX + 3) * (maxY - minY + 3);
  return filled.size + outside.size < total;
}

/** 다른 칸과 맞닿지 않은 변들 = 바깥 테두리 */
export function outlineSegments(cells: readonly Cell[]): Segment[] {
  const set = new Set(cells.map(cellKey));
  const has = (x: number, y: number) => set.has(cellKey({ x, y }));
  const segs: Segment[] = [];
  for (const { x, y } of cells) {
    if (!has(x, y - 1)) segs.push({ x1: x, y1: y, x2: x + 1, y2: y });
    if (!has(x + 1, y)) segs.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 });
    if (!has(x, y + 1)) segs.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1 });
    if (!has(x - 1, y)) segs.push({ x1: x, y1: y, x2: x, y2: y + 1 });
  }
  return segs;
}

export function outlinePath(cells: readonly Cell[]): string {
  return outlineSegments(cells)
    .map((s) => 'M' + s.x1 + ' ' + s.y1 + 'L' + s.x2 + ' ' + s.y2)
    .join('');
}
