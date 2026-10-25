import { PLAYER_COLORS } from '../../../shell/ui/colors';
import styles from '../../../shell/ui/FinalResult.module.css';

type Props = {
  playerNames: readonly string[];
  /** 이미 순위대로 (이긴 사람 → 늦게 탈락한 사람) — 여기서 다시 정렬하지 않는다 */
  ranking: readonly number[];
  onReplay: () => void;
  onExit: () => void;
};

/** 최종 결과. 셸의 FinalResult와 같은 모양이되 점수·시간 대신 순위만 보여 준다 */
export function BellResult({ playerNames, ranking, onReplay, onExit }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className={styles.title}>{`${playerNames[ranking[0]]} 우승!`}</h1>
      </div>
      <ol className={styles.list}>
        {ranking.map((player, i) => (
          <li key={player} className={styles.item} style={{ borderLeftColor: PLAYER_COLORS[player] }}>
            <span className={styles.name}>{`${i + 1}등 ${playerNames[player]}`}</span>
            {i === 0 && <span className={styles.crown}>우승</span>}
          </li>
        ))}
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
