import { PIECES } from '../../blocks/logic/pieces';
import type { Fruit } from '../logic/types';
import styles from './FruitCard.module.css';

/** 과일 색은 블록 퍼즐 조각 색을 빌린다 (docs/UI_GUIDE.md 과일 종치기) */
export const FRUIT_COLOR: Record<Fruit, string> = {
  strawberry: PIECES.I3.color,
  banana: PIECES.L3.color,
  lime: PIECES.L5.color,
  blueberry: PIECES.U5.color,
};

export const LEAF_COLOR = PIECES.T4.color;

const STRAWBERRY_SEEDS: [number, number][] = [
  [-0.2, -0.1],
  [0, -0.12],
  [0.2, -0.1],
  [-0.1, 0.07],
  [0.1, 0.07],
  [0, 0.24],
];

// 단면의 여섯 조각을 나누는 선 (반지름 0.28, 30°·90°·150°)
const LIME_SEGMENTS: [number, number, number, number][] = [
  [0, -0.28, 0, 0.28],
  [-0.2425, -0.14, 0.2425, 0.14],
  [-0.2425, 0.14, 0.2425, -0.14],
];

/** 크기 1(−0.5~0.5) 안에 그린 과일 모양 */
function Shape({ fruit }: { fruit: Fruit }) {
  const color = FRUIT_COLOR[fruit];
  switch (fruit) {
    case 'strawberry':
      return (
        <>
          <path
            d="M -0.4 -0.22 C -0.46 0.08 -0.16 0.38 0 0.48 C 0.16 0.38 0.46 0.08 0.4 -0.22 C 0.26 -0.34 -0.26 -0.34 -0.4 -0.22 Z"
            fill={color}
            className={styles.outline}
          />
          {STRAWBERRY_SEEDS.map(([x, y]) => (
            <ellipse key={x + ',' + y} cx={x} cy={y} rx={0.035} ry={0.05} className={styles.seed} />
          ))}
          <polygon
            points="-0.3,-0.24 -0.14,-0.32 -0.1,-0.42 0,-0.34 0.1,-0.42 0.14,-0.32 0.3,-0.24 0.08,-0.2 0,-0.14 -0.08,-0.2"
            fill={LEAF_COLOR}
            className={styles.outline}
          />
        </>
      );
    case 'banana':
      return (
        <>
          <path d="M -0.46 -0.32 Q 0 0.8 0.46 -0.32 Q 0 0.1 -0.46 -0.32 Z" fill={color} className={styles.outline} />
          <path d="M 0.44 -0.31 L 0.48 -0.44" className={styles.stem} />
        </>
      );
    case 'lime':
      return (
        <>
          <circle r={0.46} fill={color} className={styles.outline} />
          <circle r={0.33} className={styles.slice} />
          {LIME_SEGMENTS.map(([x1, y1, x2, y2]) => (
            <line key={x1 + ',' + y1} x1={x1} y1={y1} x2={x2} y2={y2} className={styles.slice} />
          ))}
        </>
      );
    case 'blueberry':
      return (
        <>
          <circle cy={0.05} r={0.43} fill={color} className={styles.outline} />
          <polygon
            points="-0.13,-0.3 -0.17,-0.46 -0.05,-0.38 0,-0.5 0.05,-0.38 0.17,-0.46 0.13,-0.3"
            fill={color}
            className={styles.outline}
          />
        </>
      );
  }
}

/** 가운데가 (x, y)이고 너비가 size인 과일 하나 */
export function FruitIcon({ fruit, x, y, size }: { fruit: Fruit; x: number; y: number; size: number }) {
  return (
    <g data-testid="fruit" data-fruit={fruit} transform={`translate(${x} ${y}) scale(${size})`}>
      <Shape fruit={fruit} />
    </g>
  );
}
