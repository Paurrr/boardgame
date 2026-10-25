import { CARD_H, CARD_W, FruitCard } from './FruitCard';
import styles from './FruitCard.module.css';

// 뒤 카드는 과일이 없는 가장자리만 가리도록 겹친다 (앞 카드 과일 오른쪽 끝 86)
const SHIFT_X = 90;
const SHIFT_Y = 14;

/** 메뉴 카드 그림: 바나나 2 카드와 바나나 3 카드를 살짝 겹쳐 놓은 모습 (합이 5) */
export function MenuIcon() {
  return (
    <svg className={styles.card} viewBox={`0 0 ${CARD_W + SHIFT_X} ${CARD_H + SHIFT_Y}`} aria-hidden="true">
      <svg x={0} y={0} width={CARD_W} height={CARD_H}>
        <FruitCard card={{ fruit: 'banana', count: 2 }} />
      </svg>
      <svg x={SHIFT_X} y={SHIFT_Y} width={CARD_W} height={CARD_H}>
        <FruitCard card={{ fruit: 'banana', count: 3 }} />
      </svg>
    </svg>
  );
}
