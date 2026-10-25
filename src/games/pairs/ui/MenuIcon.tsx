import { Card } from './Card';
import styles from './Card.module.css';
import { PICTURE_IDS } from './pictures';

const WHALE = PICTURE_IDS.indexOf('whale');

// 뒷면 한 장이 두 앞면 뒤에서 위쪽만 보이고, 두 앞면은 고래 꼬리 끝만 겹친다
const CARD = 100;
const DROP = 18;
const SHIFT = 78;

/** 메뉴 카드 그림: 고래 두 장(짝)과 엎은 카드 한 장을 살짝 겹쳐 놓은 모습 */
export function MenuIcon() {
  return (
    <svg className={styles.card} viewBox={`0 0 ${CARD + SHIFT} ${CARD + DROP}`} aria-hidden="true">
      <svg x={SHIFT / 2} y={0} width={CARD} height={CARD}>
        <Card picture={WHALE} faceUp={false} taken={false} />
      </svg>
      <svg x={0} y={DROP} width={CARD} height={CARD}>
        <Card picture={WHALE} faceUp taken={false} />
      </svg>
      <svg x={SHIFT} y={DROP} width={CARD} height={CARD}>
        <Card picture={WHALE} faceUp taken={false} />
      </svg>
    </svg>
  );
}
