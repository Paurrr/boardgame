import { Fragment } from 'react';
import { key3 } from '../logic/rotate';
import type { StackPieceId, Vec3 } from '../logic/types';
import { applyMat, depth } from './camera';
import type { Camera, Mat, Pt } from './camera';
import styles from './CubeScene.module.css';

export type CubeKind = 'piece' | 'preview' | 'ghost';

/** 그릴 때만 쓰는 강체 변환: world = pivot + M(p − pivot) */
export type Xf = { M: Mat; pivot: Vec3 };

export type SceneCube = {
  /** 정육면체의 (x, y, z) 최소 꼭짓점 */
  pos: Vec3;
  kind: CubeKind;
  /** 같은 group 안에서만 맞닿은 면을 생략한다 */
  group: string;
  color?: string;
  pieceId?: StackPieceId;
  selected?: boolean;
  xray?: boolean;
  xf?: Xf;
};

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

const HALF = v(0.5, 0.5, 0.5);

/** 정육면체의 면 6개: 바깥 법선과 네 꼭짓점 (pos 기준) */
const FACES: { n: Vec3; corners: Vec3[] }[] = [
  { n: v(0, 0, 1), corners: [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)] },
  { n: v(0, 0, -1), corners: [v(0, 0, 0), v(0, 1, 0), v(1, 1, 0), v(1, 0, 0)] },
  { n: v(1, 0, 0), corners: [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)] },
  { n: v(-1, 0, 0), corners: [v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0)] },
  { n: v(0, 1, 0), corners: [v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)] },
  { n: v(0, -1, 0), corners: [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)] },
];

const xfPoint = (xf: Xf | undefined, p: Vec3): Vec3 => (xf ? add(xf.pivot, applyMat(xf.M, sub(p, xf.pivot))) : p);

const NO_BLOCK = new Set<string>();

/**
 * 정육면체들을 먼 것부터 그린다. 보는 쪽을 향한 면만, 같은 group 안에서 맞닿은 면은 빼고.
 * 옆면은 면 색 위에 --ink를 반투명으로 덮어 어둡게 한다 (화면 오른쪽을 향할수록 어둡게, docs/UI_GUIDE.md)
 */
export function CubeScene({ cam, toScreen, cubes }: { cam: Camera; toScreen: (p: Vec3) => Pt; cubes: SceneCube[] }) {
  const groups = new Map<string, Set<string>>();
  for (const c of cubes) {
    if (c.kind === 'ghost') continue;
    let set = groups.get(c.group);
    if (!set) {
      set = new Set();
      groups.set(c.group, set);
    }
    set.add(key3(c.pos));
  }
  // 빈칸은 제자리에 있는 모든 칸에 가려지는 면을 뺀다 (회전 애니메이션 중인 칸은 자리를 비운 것으로 본다)
  const ghostBlock = new Set(cubes.filter((c) => !c.xf).map((c) => key3(c.pos)));
  const sorted = cubes
    .map((c) => ({ c, dep: depth(cam, xfPoint(c.xf, add(c.pos, HALF))) }))
    .sort((a, b) => a.dep - b.dep);
  const points = (c: SceneCube, corners: Vec3[]) =>
    corners
      .map((o) => {
        const q = toScreen(xfPoint(c.xf, add(c.pos, o)));
        return `${q.x.toFixed(3)},${q.y.toFixed(3)}`;
      })
      .join(' ');

  return (
    <>
      {sorted.map(({ c }) => {
        const ghost = c.kind === 'ghost';
        const block = ghost ? ghostBlock : (groups.get(c.group) ?? NO_BLOCK);
        const faceClass = ghost
          ? styles.ghost
          : c.kind === 'preview'
            ? `${styles.face} ${styles.preview}`
            : c.selected
              ? `${styles.face} ${styles.selected}`
              : styles.face;
        const dim = ghost ? 0.4 : 1;
        return (
          <g key={`${c.kind}${c.group}${key3(c.pos)}`} data-piece={c.pieceId} className={c.xray ? styles.xray : undefined}>
            {FACES.map((f, i) => {
              const n = c.xf ? applyMat(c.xf.M, f.n) : f.n;
              if (dot(n, cam.d) <= 1e-6) return null;
              if (block.has(key3(add(c.pos, f.n)))) return null;
              const p = points(c, f.corners);
              const shade = Math.max(0, (1 - n.z) * (0.24 + 0.14 * dot(n, cam.r)));
              return (
                <Fragment key={i}>
                  <polygon points={p} className={faceClass} fill={ghost ? undefined : c.color} />
                  {shade > 0.01 && <polygon points={p} className={styles.shade} style={{ fillOpacity: shade * dim }} />}
                </Fragment>
              );
            })}
          </g>
        );
      })}
    </>
  );
}
