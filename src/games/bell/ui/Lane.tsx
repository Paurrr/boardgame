import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Card } from '../logic/types';
import { FruitCard } from './FruitCard';
import styles from './Lane.module.css';
import type { Notice } from './notice';

export type LaneProps = {
  name: string;
  color: string;
  top: Card | null;
  downCount: number;
  isTurn: boolean;
  canFlip: boolean;
  out: boolean;
  notice: Notice | null;
  gained: boolean;
  /** 차례 제한시간(ms). 있으면 뒤집기 버튼 안 막대가 그 시간 동안 줄어든다 */
  timerMs: number | null;
  onFlip: (e: ReactPointerEvent) => void;
  onBellDown: (e: ReactPointerEvent) => void;
  onBellUp: (e: ReactPointerEvent) => void;
  onBellCancel: (e: ReactPointerEvent) => void;
};

// 같은 과일·개수 카드가 이어 나와도 새 카드로 다시 그리게, 카드 객체마다 번호를 붙인다
// (규칙 로직은 카드 객체를 그대로 옮기므로 같은 카드는 늘 같은 번호다)
const cardIds = new WeakMap<Card, number>();
let nextCardId = 0;

function cardKey(card: Card): number {
  let id = cardIds.get(card);
  if (id === undefined) {
    id = nextCardId++;
    cardIds.set(card, id);
  }
  return id;
}

const NOTICE_CLASS: Record<Notice['tone'], string> = {
  ok: `${styles.notice} ${styles.noticeOk}`,
  warn: `${styles.notice} ${styles.noticeWarn}`,
  plain: styles.notice,
};

/** 칸 위쪽(보기 전용): 이름·상태와 펼친 카드 */
export function LaneHead({ name, color, top, isTurn, out }: LaneProps) {
  return (
    <div className={styles.head}>
      <div className={styles.nameLine}>
        <span className={styles.chip} style={{ backgroundColor: color }} />
        <span className={styles.name}>{name}</span>
        {out ? <span className={styles.out}>탈락</span> : isTurn && <span className={styles.turn}>차례!</span>}
      </div>
      <div key={top === null ? -1 : cardKey(top)} className={top === null ? styles.card : styles.cardIn}>
        <FruitCard card={top} />
      </div>
    </div>
  );
}

/** 칸 아래쪽(조작): 알림 줄, 뒤집기, 종 */
export function LaneBody({
  downCount,
  canFlip,
  out,
  notice,
  gained,
  timerMs,
  onFlip,
  onBellDown,
  onBellUp,
  onBellCancel,
}: LaneProps) {
  return (
    <div className={styles.body}>
      <div className={notice === null ? styles.notice : NOTICE_CLASS[notice.tone]} data-testid="lane-notice">
        {notice?.text}
      </div>
      <button
        type="button"
        className={canFlip ? styles.flip : styles.flipOff}
        aria-disabled={!canFlip}
        onPointerDown={(e) => {
          if (canFlip) onFlip(e);
        }}
      >
        <span className={styles.flipLabel}>뒤집기</span>
        <span className={gained ? styles.countGained : styles.count}>{`${downCount}장`}</span>
        {/* 차례가 올 때마다 새로 그려 처음부터 줄어든다 */}
        {timerMs !== null && (
          <span
            key={timerMs}
            className={styles.timer}
            style={{ animationDuration: `${timerMs}ms` }}
            data-testid="turn-timer"
          />
        )}
      </button>
      <button
        type="button"
        className={styles.bell}
        aria-label="종"
        disabled={out}
        onPointerDown={out ? undefined : onBellDown}
        onPointerUp={out ? undefined : onBellUp}
        onPointerCancel={out ? undefined : onBellCancel}
      >
        <svg className={styles.bellIcon} viewBox="0 0 100 84" aria-hidden="true">
          <rect x={46} y={17} width={8} height={14} className={styles.bellFace} />
          <circle cx={50} cy={12} r={7} className={styles.bellFace} />
          <path d="M 14 66 A 36 36 0 0 1 86 66 Z" className={styles.bellFace} />
          <rect x={6} y={66} width={88} height={12} rx={5} className={styles.bellFace} />
        </svg>
        <span className={styles.bellText}>종</span>
      </button>
    </div>
  );
}
