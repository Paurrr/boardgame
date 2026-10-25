import type { ReactElement } from 'react';
import { PIECES } from '../../blocks/logic/pieces';
import { FruitIcon } from '../../bell/ui/FruitIcon';
import styles from './Card.module.css';

/** 그림 번호 = slots[i].picture. 순서를 바꾸면 같은 seed의 판이 달라진다 */
export const PICTURE_IDS: readonly string[] = [
  'fish',
  'turtle',
  'snail',
  'chick',
  'whale',
  'ladybug',
  'pig',
  'owl',
  'strawberry',
  'banana',
  'carrot',
  'watermelon',
  'mushroom',
  'broccoli',
  'car',
  'boat',
  'rocket',
  'airplane',
  'umbrella',
  'key',
  'star',
  'moon',
  'heart',
  'house',
];

// 그림 색은 블록 퍼즐 조각 색을 빌린다 (docs/UI_GUIDE.md)
const RED = PIECES.I3.color;
const YELLOW = PIECES.L3.color;
const BLUE = PIECES.I4.color;
const ORANGE = PIECES.O4.color;
const GREEN = PIECES.T4.color;
const PINK = PIECES.L4.color;
const TEAL = PIECES.S4.color;
const BROWN = PIECES.P5.color;
const LIME = PIECES.L5.color;
const NAVY = PIECES.U5.color;

/** 가운데 (cx, cy), 바깥 반지름 outer, 안쪽 반지름 inner인 별 꼭짓점 */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? outer : inner;
    const a = ((-90 + k * 36) * Math.PI) / 180;
    points.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return points.join(' ');
}

const BROCCOLI_HEADS: [number, number, number][] = [
  [28, 46, 15],
  [44, 30, 16],
  [62, 28, 15],
  [74, 46, 15],
  [50, 50, 16],
];

/** 0~100 상자 안에 그린 그림. 이름 글자는 쓰지 않는다 */
const DRAW: Record<string, () => ReactElement> = {
  fish: () => (
    <>
      <path d="M 30 30 Q 42 10 60 30 Z" fill={TEAL} className={styles.line} />
      <polygon points="66,50 92,28 92,72" fill={TEAL} className={styles.line} />
      <ellipse cx={42} cy={50} rx={34} ry={24} fill={TEAL} className={styles.line} />
      <path d="M 38 36 Q 46 50 38 64" className={styles.detail} />
      <circle cx={24} cy={45} r={6} className={styles.light} />
      <circle cx={23} cy={45} r={3} className={styles.ink} />
    </>
  ),
  turtle: () => (
    <>
      <circle cx={50} cy={16} r={10} fill={LIME} className={styles.line} />
      {[
        [22, 34],
        [78, 34],
        [22, 74],
        [78, 74],
      ].map(([x, y]) => (
        <circle key={x + ',' + y} cx={x} cy={y} r={9} fill={LIME} className={styles.line} />
      ))}
      <polygon points="45,82 55,82 50,93" fill={LIME} className={styles.line} />
      <ellipse cx={50} cy={54} rx={31} ry={33} fill={GREEN} className={styles.line} />
      <polygon points="50,38 64,46 64,62 50,70 36,62 36,46" className={styles.detail} />
      <path
        d="M 50 38 L 50 23 M 64 46 L 76 39 M 64 62 L 76 69 M 50 70 L 50 85 M 36 62 L 24 69 M 36 46 L 24 39"
        className={styles.detail}
      />
      <circle cx={46} cy={12} r={2} className={styles.ink} />
      <circle cx={54} cy={12} r={2} className={styles.ink} />
    </>
  ),
  snail: () => (
    <>
      <path d="M 78 42 L 74 24 M 88 42 L 92 24" className={styles.detail} />
      <circle cx={74} cy={22} r={4} className={styles.ink} />
      <circle cx={92} cy={22} r={4} className={styles.ink} />
      <path
        d="M 8 84 Q 8 70 22 70 L 74 70 L 74 50 Q 74 41 83 41 Q 92 41 92 50 L 92 76 Q 92 84 84 84 Z"
        fill={YELLOW}
        className={styles.line}
      />
      <circle cx={44} cy={46} r={28} fill={ORANGE} className={styles.line} />
      <path d="M 44 46 A 4 4 0 0 1 52 46 A 8 8 0 0 1 36 46 A 12 12 0 0 1 60 46 A 16 16 0 0 1 28 46" className={styles.detail} />
    </>
  ),
  chick: () => (
    <>
      <ellipse cx={38} cy={88} rx={8} ry={4} fill={ORANGE} className={styles.line} />
      <ellipse cx={62} cy={88} rx={8} ry={4} fill={ORANGE} className={styles.line} />
      <path d="M 44 28 Q 44 12 50 20 Q 56 10 58 28 Z" fill={YELLOW} className={styles.line} />
      <ellipse cx={50} cy={56} rx={34} ry={32} fill={YELLOW} className={styles.line} />
      <path d="M 24 58 Q 28 72 40 72 M 76 58 Q 72 72 60 72" className={styles.detail} />
      <circle cx={38} cy={44} r={4.5} className={styles.ink} />
      <circle cx={62} cy={44} r={4.5} className={styles.ink} />
      <polygon points="41,52 59,52 50,63" fill={ORANGE} className={styles.line} />
    </>
  ),
  whale: () => (
    <>
      <path d="M 36 28 L 36 16 M 36 16 Q 28 8 20 14 M 36 16 Q 44 8 52 14" stroke={BLUE} className={styles.colorLine} />
      <path
        d="M 8 58 C 8 38 26 30 44 30 C 62 30 72 40 78 50 C 80 46 82 42 82 38 C 78 34 76 30 74 26 C 80 26 84 30 86 34 C 88 30 92 26 94 26 C 94 32 92 38 88 42 C 88 56 82 64 76 68 C 68 78 58 82 44 82 C 22 82 8 74 8 58 Z"
        fill={BLUE}
        className={styles.line}
      />
      <path d="M 14 66 Q 40 78 68 68" className={styles.detail} />
      <circle cx={24} cy={52} r={4} className={styles.ink} />
    </>
  ),
  ladybug: () => (
    <>
      <path
        d="M 24 48 L 10 42 M 22 60 L 8 62 M 26 72 L 14 82 M 76 48 L 90 42 M 78 60 L 92 62 M 74 72 L 86 82 M 44 16 L 38 8 M 56 16 L 62 8"
        className={styles.detail}
      />
      <circle cx={50} cy={26} r={14} className={styles.ink} />
      <circle cx={50} cy={58} r={32} fill={RED} className={styles.line} />
      <line x1={50} y1={28} x2={50} y2={89} className={styles.detail} />
      <circle cx={36} cy={46} r={6} className={styles.ink} />
      <circle cx={64} cy={46} r={6} className={styles.ink} />
      <circle cx={34} cy={70} r={5} className={styles.ink} />
      <circle cx={66} cy={70} r={5} className={styles.ink} />
      <circle cx={44} cy={22} r={3} className={styles.lightDot} />
      <circle cx={56} cy={22} r={3} className={styles.lightDot} />
    </>
  ),
  pig: () => (
    <>
      <polygon points="22,34 26,10 44,24" fill={PINK} className={styles.line} />
      <polygon points="78,34 74,10 56,24" fill={PINK} className={styles.line} />
      <circle cx={50} cy={54} r={36} fill={PINK} className={styles.line} />
      <ellipse cx={50} cy={64} rx={16} ry={11} fill={PINK} className={styles.line} />
      <ellipse cx={44} cy={64} rx={3} ry={4.5} className={styles.ink} />
      <ellipse cx={56} cy={64} rx={3} ry={4.5} className={styles.ink} />
      <circle cx={36} cy={44} r={4.5} className={styles.ink} />
      <circle cx={64} cy={44} r={4.5} className={styles.ink} />
    </>
  ),
  owl: () => (
    <>
      <path
        d="M 20 30 L 24 8 L 40 22 Q 50 20 60 22 L 76 8 L 80 30 Q 88 50 84 70 Q 78 92 50 92 Q 22 92 16 70 Q 12 50 20 30 Z"
        fill={BROWN}
        className={styles.line}
      />
      <ellipse cx={50} cy={72} rx={18} ry={14} className={styles.pale} />
      <circle cx={36} cy={40} r={12} className={styles.light} />
      <circle cx={64} cy={40} r={12} className={styles.light} />
      <circle cx={37} cy={41} r={5.5} className={styles.ink} />
      <circle cx={63} cy={41} r={5.5} className={styles.ink} />
      <polygon points="45,50 55,50 50,60" fill={ORANGE} className={styles.line} />
    </>
  ),
  strawberry: () => <FruitIcon fruit="strawberry" x={50} y={47} size={86} />,
  banana: () => <FruitIcon fruit="banana" x={50} y={58} size={88} />,
  carrot: () => (
    <>
      <ellipse cx={40} cy={18} rx={6} ry={13} transform="rotate(-30 40 18)" fill={GREEN} className={styles.line} />
      <ellipse cx={60} cy={18} rx={6} ry={13} transform="rotate(30 60 18)" fill={GREEN} className={styles.line} />
      <ellipse cx={50} cy={15} rx={6} ry={13} fill={GREEN} className={styles.line} />
      <path d="M 30 32 Q 50 22 70 32 Q 66 56 52 88 Q 50 92 48 88 Q 34 56 30 32 Z" fill={ORANGE} className={styles.line} />
      <path d="M 36 44 L 46 46 M 62 56 L 53 58 M 42 68 L 49 70" className={styles.detail} />
    </>
  ),
  watermelon: () => (
    <>
      <path d="M 6 30 A 44 44 0 0 0 94 30 Z" fill={GREEN} className={styles.line} />
      <path d="M 16 30 A 34 34 0 0 0 84 30 Z" fill={RED} className={styles.line} />
      {[
        [36, 40],
        [50, 50],
        [64, 40],
        [40, 56],
        [60, 56],
      ].map(([x, y]) => (
        <ellipse key={x + ',' + y} cx={x} cy={y} rx={2.5} ry={4} className={styles.ink} />
      ))}
    </>
  ),
  mushroom: () => (
    <>
      <path d="M 38 50 L 36 84 Q 36 90 44 90 L 56 90 Q 64 90 64 84 L 62 50 Z" className={styles.light} />
      <path d="M 8 56 Q 8 14 50 12 Q 92 14 92 56 Q 50 48 8 56 Z" fill={BROWN} className={styles.line} />
      <circle cx={30} cy={34} r={6} className={styles.lightDot} />
      <circle cx={54} cy={24} r={5} className={styles.lightDot} />
      <circle cx={72} cy={38} r={6} className={styles.lightDot} />
      <circle cx={48} cy={42} r={4} className={styles.lightDot} />
    </>
  ),
  broccoli: () => (
    <>
      <path d="M 40 56 L 36 88 Q 36 92 42 92 L 58 92 Q 64 92 64 88 L 60 56 Z" fill={GREEN} className={styles.line} />
      {BROCCOLI_HEADS.map(([x, y, r]) => (
        <circle key={'u' + x} cx={x} cy={y} r={r} fill={LIME} className={styles.under} />
      ))}
      {BROCCOLI_HEADS.map(([x, y, r]) => (
        <circle key={'f' + x} cx={x} cy={y} r={r} fill={LIME} />
      ))}
    </>
  ),
  car: () => (
    <>
      <path
        d="M 8 62 L 8 50 Q 8 44 16 44 L 26 44 L 36 26 Q 38 22 44 22 L 64 22 Q 70 22 72 26 L 80 44 L 84 44 Q 92 44 92 52 L 92 62 Q 92 68 86 68 L 14 68 Q 8 68 8 62 Z"
        fill={BLUE}
        className={styles.line}
      />
      <polygon points="38,42 45,29 54,29 54,42" className={styles.light} />
      <polygon points="60,42 60,29 66,29 72,42" className={styles.light} />
      <circle cx={28} cy={68} r={11} className={styles.ink} />
      <circle cx={72} cy={68} r={11} className={styles.ink} />
      <circle cx={28} cy={68} r={4} className={styles.lightDot} />
      <circle cx={72} cy={68} r={4} className={styles.lightDot} />
    </>
  ),
  boat: () => (
    <>
      <line x1={48} y1={10} x2={48} y2={66} className={styles.stick} />
      <polygon points="48,10 62,15 48,20" fill={RED} className={styles.line} />
      <polygon points="54,24 54,60 86,60" className={styles.light} />
      <polygon points="42,30 42,60 20,60" className={styles.light} />
      <path d="M 8 66 L 92 66 L 80 86 Q 78 88 74 88 L 26 88 Q 22 88 20 86 Z" fill={NAVY} className={styles.line} />
    </>
  ),
  rocket: () => (
    <>
      <path d="M 40 76 Q 42 88 50 94 Q 58 88 60 76 Z" fill={ORANGE} className={styles.line} />
      <path d="M 45 76 Q 46 84 50 87 Q 54 84 55 76 Z" fill={YELLOW} />
      <polygon points="34,54 20,74 20,82 36,74" fill={BLUE} className={styles.line} />
      <polygon points="66,54 80,74 80,82 64,74" fill={BLUE} className={styles.line} />
      <path d="M 50 6 Q 70 22 68 52 L 66 78 L 34 78 L 32 52 Q 30 22 50 6 Z" fill={RED} className={styles.line} />
      <circle cx={50} cy={40} r={9} className={styles.light} />
    </>
  ),
  airplane: () => (
    <>
      <polygon points="50,34 92,58 92,66 50,56 8,66 8,58" fill={TEAL} className={styles.line} />
      <polygon points="50,76 68,86 68,91 50,86 32,91 32,86" fill={TEAL} className={styles.line} />
      <path d="M 50 8 Q 58 8 58 22 L 58 80 Q 58 92 50 92 Q 42 92 42 80 L 42 22 Q 42 8 50 8 Z" fill={TEAL} className={styles.line} />
      <ellipse cx={50} cy={22} rx={4} ry={6} className={styles.light} />
    </>
  ),
  umbrella: () => (
    <>
      <path d="M 50 6 L 50 12 M 50 50 L 50 82 Q 50 90 42 90 Q 34 90 34 82" className={styles.stick} />
      <path
        d="M 8 52 Q 8 12 50 12 Q 92 12 92 52 Q 81.5 42 71 52 Q 60.5 42 50 52 Q 39.5 42 29 52 Q 18.5 42 8 52 Z"
        fill={PINK}
        className={styles.line}
      />
      <path d="M 50 12 Q 36 24 29 52 M 50 12 Q 64 24 71 52 M 50 12 L 50 52" className={styles.detail} />
    </>
  ),
  key: () => (
    <>
      <path
        d="M 40 44 L 92 44 L 92 56 L 86 56 L 86 70 L 76 70 L 76 56 L 70 56 L 70 66 L 62 66 L 62 56 L 40 56 Z"
        fill={YELLOW}
        className={styles.line}
      />
      <circle cx={28} cy={50} r={20} fill={YELLOW} className={styles.line} />
      <circle cx={24} cy={50} r={7} className={styles.light} />
    </>
  ),
  star: () => <polygon points={starPoints(50, 53, 44, 21)} fill={ORANGE} className={styles.line} />,
  moon: () => <path d="M 76 10 A 42 42 0 1 0 76 90 A 46 46 0 0 1 76 10 Z" fill={NAVY} className={styles.line} />,
  heart: () => (
    <path
      d="M 50 88 C 22 68 8 52 8 34 C 8 20 18 12 30 12 C 40 12 46 18 50 26 C 54 18 60 12 70 12 C 82 12 92 20 92 34 C 92 52 78 68 50 88 Z"
      fill={RED}
      className={styles.line}
    />
  ),
  house: () => (
    <>
      <rect x={66} y={14} width={10} height={20} fill={BROWN} className={styles.line} />
      <rect x={18} y={44} width={64} height={46} fill={BROWN} className={styles.line} />
      <polygon points="50,8 92,46 8,46" fill={RED} className={styles.line} />
      <rect x={42} y={62} width={16} height={28} className={styles.light} />
      <rect x={24} y={54} width={12} height={12} className={styles.light} />
      <rect x={64} y={54} width={12} height={12} className={styles.light} />
    </>
  ),
};

/** 그림 모양만 (뒤집히는 동안 덮개로 쓰는 것처럼 표시용 data-testid가 없어야 할 때) */
export function PictureShape({ picture }: { picture: number }) {
  return DRAW[PICTURE_IDS[picture]]();
}

/** 0~100 상자 안에 그린 그림 하나 */
export function Picture({ picture }: { picture: number }) {
  return (
    <g data-testid="picture" data-picture={PICTURE_IDS[picture]}>
      <PictureShape picture={picture} />
    </g>
  );
}
