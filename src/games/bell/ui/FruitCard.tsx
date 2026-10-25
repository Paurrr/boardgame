import type { Card, FruitCount } from '../logic/types';
import styles from './FruitCard.module.css';
import { FruitIcon } from './FruitIcon';

export const CARD_W = 100;
export const CARD_H = 140;
export const ICON_SIZE = 32;

/** 과일 개수별 자리 (주사위 눈처럼, 카드 좌표) */
export const PIP_LAYOUT: Record<FruitCount, { x: number; y: number }[]> = {
  1: [{ x: 50, y: 70 }],
  2: [
    { x: 30, y: 40 },
    { x: 70, y: 100 },
  ],
  3: [
    { x: 28, y: 36 },
    { x: 50, y: 70 },
    { x: 72, y: 104 },
  ],
  4: [
    { x: 30, y: 40 },
    { x: 70, y: 40 },
    { x: 30, y: 100 },
    { x: 70, y: 100 },
  ],
  5: [
    { x: 30, y: 36 },
    { x: 70, y: 36 },
    { x: 50, y: 70 },
    { x: 30, y: 104 },
    { x: 70, y: 104 },
  ],
};

const EDGE = 2; // 테두리가 viewBox 밖으로 잘리지 않게 안쪽으로 들인 만큼

/** 펼친 카드 한 장. 카드가 없으면 점선 빈 자리. 부모 크기를 비율을 지켜 채운다 */
export function FruitCard({ card }: { card: Card | null }) {
  return (
    <svg
      className={styles.card}
      viewBox={`0 0 ${CARD_W} ${CARD_H}`}
      data-testid={card === null ? 'empty-card' : 'fruit-card'}
    >
      {card === null ? (
        <rect x={EDGE} y={EDGE} width={CARD_W - 2 * EDGE} height={CARD_H - 2 * EDGE} rx={8} className={styles.empty} />
      ) : (
        <>
          <rect x={EDGE} y={EDGE} width={CARD_W - 2 * EDGE} height={CARD_H - 2 * EDGE} rx={8} className={styles.face} />
          {PIP_LAYOUT[card.count].map((p) => (
            <FruitIcon key={p.x + ',' + p.y} fruit={card.fruit} x={p.x} y={p.y} size={ICON_SIZE} />
          ))}
        </>
      )}
    </svg>
  );
}
