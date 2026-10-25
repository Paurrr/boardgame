import { STACK_PIECES } from '../logic/pieces';
import type { StackPieceId, Vec3 } from '../logic/types';
import { makeCamera, project } from './camera';
import { CubeScene } from './CubeScene';
import type { SceneCube } from './CubeScene';
import styles from './MenuIcon.module.css';

/** 메뉴 카드 그림: 실제 입체 조각 셋을 맞대어 놓고 비스듬히 본 모습 */
const ART: { id: StackPieceId; at: Vec3 }[] = [
  { id: 'O4', at: { x: 0, y: 0, z: 0 } },
  { id: 'Y4', at: { x: 2, y: 0, z: 0 } },
  { id: 'R4', at: { x: 0, y: 2, z: 0 } },
];

const cam = makeCamera(30, 50);
const toScreen = (p: Vec3) => project(cam, p);

const cubes: SceneCube[] = ART.flatMap(({ id, at }) =>
  STACK_PIECES[id].cells.map((c) => ({
    pos: { x: c.x + at.x, y: c.y + at.y, z: c.z + at.z },
    kind: 'piece' as const,
    group: id,
    color: STACK_PIECES[id].color,
    pieceId: id,
  })),
);

// 놓인 상자(4×4×2)의 꼭짓점을 투영해 viewBox를 정한다
const corners = [0, 4].flatMap((x) => [0, 4].flatMap((y) => [0, 2].map((z) => toScreen({ x, y, z }))));
const MARGIN = 0.2;
const minX = Math.min(...corners.map((p) => p.x)) - MARGIN;
const minY = Math.min(...corners.map((p) => p.y)) - MARGIN;
const w = Math.max(...corners.map((p) => p.x)) - minX + MARGIN;
const h = Math.max(...corners.map((p) => p.y)) - minY + MARGIN;

export function MenuIcon() {
  return (
    <svg className={styles.icon} viewBox={`${minX} ${minY} ${w} ${h}`} aria-hidden="true">
      <CubeScene cam={cam} toScreen={toScreen} cubes={cubes} />
    </svg>
  );
}
