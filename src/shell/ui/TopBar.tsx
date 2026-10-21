import { useEffect, useState } from 'react';
import { canFullscreen, toggleFullscreen } from '../../lib/fullscreen';
import styles from './Match.module.css';

type Props = {
  round: number;
  rounds: number;
  clock: string;
  /** 시계 앞에 붙이는 작은 글자 (예: 판 전체) */
  clockLabel?: string;
  urgent: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
};

const CONFIRM_MS = 3000;

/** 어른이 쓰는 위쪽 막대. 그만하기는 아이가 실수로 누르지 않게 두 번 눌러야 한다 */
export function TopBar({ round, rounds, clock, clockLabel, urgent, muted, onToggleMute, onExit }: Props) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [confirming]);

  return (
    <header className={styles.topBar}>
      <span className={styles.round}>{`라운드 ${round}/${rounds}`}</span>
      {clockLabel && <span className={styles.clockLabel}>{clockLabel}</span>}
      <span className={urgent ? styles.clockUrgent : styles.clock} data-testid="clock">
        {clock}
      </span>
      <span className={styles.spacer} />
      <button type="button" className="btn" onClick={onToggleMute}>
        {muted ? '소리 켜기' : '소리 끄기'}
      </button>
      {canFullscreen() && (
        <button type="button" className="btn" onClick={toggleFullscreen}>
          전체화면
        </button>
      )}
      <button type="button" className="btn" onClick={() => (confirming ? onExit() : setConfirming(true))}>
        {confirming ? '정말 그만?' : '그만하기'}
      </button>
    </header>
  );
}
