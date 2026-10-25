import { PLAYER_COLORS } from '../../../shell/ui/colors';
import styles from '../../../shell/ui/FinalResult.module.css';
import type { Standing } from '../logic/types';

/** 1인 결과: 이번 횟수, 저장된 최고기록(이번 것을 넣은 뒤), 이번에 깼는지 */
export type SoloRecord = { tries: number; best: number; isNew: boolean };

type Props = {
  playerNames: readonly string[];
  /** 이미 순위대로 — 여기서 다시 정렬하지 않는다 */
  standings: readonly Standing[];
  /** 혼자 했으면 기록, 여럿이면 null */
  solo: SoloRecord | null;
  onReplay: () => void;
  onExit: () => void;
};

/** 최종 결과. 셸의 FinalResult와 같은 모양이되 여럿이면 등수·짝 수, 혼자면 횟수·최고기록을 보여 준다 */
export function PairsResult({ playerNames, standings, solo, onReplay, onExit }: Props) {
  const winners = standings.filter((s) => s.place === 1).map((s) => playerNames[s.player]);

  let title = `${winners.join('·')} 공동 우승!`;
  if (solo) title = '다 찾았어요!';
  else if (winners.length === 1) title = `${winners[0]} 우승!`;

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
      </div>
      <ol className={styles.list}>
        {solo ? (
          <li className={styles.item} style={{ borderLeftColor: PLAYER_COLORS[0] }}>
            <span className={styles.name}>{`${solo.tries}번 만에 다 찾았어요`}</span>
            <span className={styles.meta}>{`최고기록 ${solo.best}번`}</span>
            {solo.isNew && (
              <span className={styles.total} style={{ color: 'var(--warn)' }}>
                새 기록!
              </span>
            )}
          </li>
        ) : (
          standings.map((s) => (
            <li key={s.player} className={styles.item} style={{ borderLeftColor: PLAYER_COLORS[s.player] }}>
              <span className={styles.name}>{`${s.place}등 ${playerNames[s.player]}`}</span>
              <span className={styles.total}>{`${s.pairs}쌍`}</span>
              {s.place === 1 && <span className={styles.crown}>우승</span>}
            </li>
          ))
        )}
      </ol>
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={onExit}>
          메뉴로
        </button>
        <button type="button" className="btn btn-primary" onClick={onReplay}>
          다시 하기
        </button>
      </div>
    </div>
  );
}
