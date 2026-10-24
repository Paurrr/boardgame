import { landing } from '../logic/board';
import { key3 } from '../logic/rotate';
import { MAX_H } from '../logic/types';
import type { Area, Placed, Vec3 } from '../logic/types';

export type Pt = { x: number; y: number };

/** r: 화면 오른쪽, u: 화면 위, d: 보는 사람 쪽 (월드 단위 벡터). az·el은 도 */
export type Camera = { az: number; el: number; r: Vec3; u: Vec3; d: Vec3 };

/** 처음 시점: 방향각·내려다보는 각 (도) */
export const AZ0 = 30;
export const EL0 = 50;
/** 기울기 범위 (도) */
export const EL_MIN = 15;
export const EL_MAX = 85;
/** 빗나갔을 때 붙여 줄 수 있는 최대 화면 거리 (판 단위, 정육면체 한 칸 남짓) */
export const SNAP_RADIUS = 0.9;
/** 떨어질 자리를 가린다고 볼 화면 거리 (판 단위) */
export const XRAY_RADIUS = 1.3;

const RAD = Math.PI / 180;

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** az: 판을 바라보는 방향, el: 내려다보는 각도 (도). 정사영 */
export function makeCamera(az: number, el: number): Camera {
  const a = az * RAD;
  const t = el * RAD;
  return {
    az,
    el,
    r: { x: Math.sin(a), y: -Math.cos(a), z: 0 },
    u: { x: -Math.sin(t) * Math.cos(a), y: -Math.sin(t) * Math.sin(a), z: Math.cos(t) },
    d: { x: Math.cos(t) * Math.cos(a), y: Math.cos(t) * Math.sin(a), z: Math.sin(t) },
  };
}

/** 화면 좌표 (y는 아래로) */
export function project(cam: Camera, p: Vec3): Pt {
  return { x: dot(p, cam.r), y: -dot(p, cam.u) };
}

/** 클수록 보는 사람에게 가깝다 */
export function depth(cam: Camera, p: Vec3): number {
  return dot(p, cam.d);
}

/** 화면 점을 높이 z 평면의 점으로 되돌린다 (연속값) */
export function unproject(cam: Camera, s: Pt, z: number): { x: number; y: number } {
  const a = cam.az * RAD;
  const t = cam.el * RAD;
  const A = s.x;
  const B = (s.y + z * Math.cos(t)) / Math.sin(t);
  return { x: A * Math.sin(a) + B * Math.cos(a), y: -A * Math.cos(a) + B * Math.sin(a) };
}

/** 눕히기 축: 판을 어느 쪽으로 돌려 놓았든 윗부분이 보는 사람 쪽으로 넘어진다 (설계서 §4.5) */
export function tipAxis(cam: Camera): Vec3 {
  const a = cam.az * RAD;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // 보는 방향을 바닥에 내린 벡터에 가장 가까운 x/y 축
  const v = Math.abs(c) >= Math.abs(s) ? { x: Math.sign(c), y: 0 } : { x: 0, y: Math.sign(s) };
  // 축 = z × v (+ 0: -0 제거)
  return { x: -v.y + 0, y: v.x + 0, z: 0 };
}

/**
 * 끄는 조각의 원점이 화면의 rel(판 중심 pivot 기준)에 있을 때 떨어질 자리 (설계서 §4.4).
 * 2층 평면부터 내려가며 그 높이에 실제로 떨어지는 칸을 고르고(보이는 윗면 우선), 없으면 1층 평면 칸,
 * 그것도 못 놓으면 주변 3×3 중 화면에서 가장 가까운 자리(SNAP_RADIUS 미만). 없으면 null
 */
export function landingNear(cam: Camera, area: Area, others: Placed[], cells: Vec3[], rel: Pt, pivot: Vec3): Vec3 | null {
  const cellAt = (z: number) => {
    const q = unproject(cam, rel, z);
    return { x: Math.round(q.x + pivot.x) + 0, y: Math.round(q.y + pivot.y) + 0 };
  };
  for (let z = MAX_H - 1; z >= 0; z--) {
    const c = cellAt(z);
    const l = landing(area, others, cells, c.x, c.y);
    if (l && l.z === z) return l;
  }
  const c0 = cellAt(0);
  const direct = landing(area, others, cells, c0.x, c0.y);
  if (direct) return direct;

  let best: Vec3 | null = null;
  let bestDist = SNAP_RADIUS;
  for (let z = MAX_H - 1; z >= 0; z--) {
    const c = cellAt(z);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const l = landing(area, others, cells, c.x + dx, c.y + dy);
        if (!l) continue;
        const s = project(cam, { x: l.x - pivot.x, y: l.y - pivot.y, z: l.z - pivot.z });
        const dist = Math.hypot(s.x - rel.x, s.y - rel.y);
        if (dist < bestDist) {
          best = l;
          bestDist = dist;
        }
      }
    }
  }
  return best;
}

const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const dist2 = (a: Pt, b: Pt): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** 볼록 껍질 (gift wrapping). 같은 직선 위의 점은 가장 먼 것만 남긴다 */
function convexHull(pts: Pt[]): Pt[] {
  let start = pts[0];
  for (const p of pts) if (p.x < start.x || (p.x === start.x && p.y < start.y)) start = p;
  const hull: Pt[] = [];
  let cur = start;
  do {
    hull.push(cur);
    let next: Pt | null = null;
    for (const p of pts) {
      if (dist2(p, cur) === 0) continue;
      if (!next) {
        next = p;
        continue;
      }
      const c = cross(cur, next, p);
      if (c < 0 || (c === 0 && dist2(cur, p) > dist2(cur, next))) next = p;
    }
    if (!next) break;
    cur = next;
  } while (cur !== start && hull.length < pts.length);
  return hull;
}

/** 바닥 width×depth를 0~MAX_H층으로 세운 상자의 화면 윤곽. pivot (W/2, D/2, 0) 기준 */
export function boardOutline(cam: Camera, width: number, depth: number): Pt[] {
  const corners: Pt[] = [];
  for (const x of [0, width]) {
    for (const y of [0, depth]) {
      for (const z of [0, MAX_H]) corners.push(project(cam, { x: x - width / 2, y: y - depth / 2, z }));
    }
  }
  return convexHull(corners);
}

/** 짝홀 규칙 (반직선 교차 수) */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const centerOfCube = (c: Vec3): Vec3 => ({ x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 });

/** cubes 중 어떤 target 칸보다 앞(깊이가 0.01 넘게 큼)이고 정육면체 중심의 화면 거리가 XRAY_RADIUS 미만인 칸의 key3 */
export function xrayCubes(cam: Camera, toScreen: (p: Vec3) => Pt, targets: Vec3[], cubes: Vec3[]): Set<string> {
  const ts = targets.map((t) => {
    const c = centerOfCube(t);
    return { depth: depth(cam, c), screen: toScreen(c) };
  });
  const out = new Set<string>();
  for (const cube of cubes) {
    const c = centerOfCube(cube);
    const dep = depth(cam, c);
    const s = toScreen(c);
    if (ts.some((t) => dep > t.depth + 0.01 && Math.hypot(s.x - t.screen.x, s.y - t.screen.y) < XRAY_RADIUS)) {
      out.add(key3(cube));
    }
  }
  return out;
}

/** 3×3 행렬 (행 우선) */
export type Mat = number[];

/** 단위 축 둘레로 rad만큼 (오른손 법칙, 로드리게스) */
export function rotMat(axis: Vec3, rad: number): Mat {
  const { x, y, z } = axis;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

export function applyMat(m: Mat, v: Vec3): Vec3 {
  return {
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
  };
}
