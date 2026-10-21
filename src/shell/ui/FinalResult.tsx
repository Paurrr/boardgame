import { formatDuration } from '../logic/format';
import type { PlayerConfig, Standing } from '../logic/match';
import { PLAYER_COLORS } from './colors';
import styles from './FinalResult.module.css';

type Props = {
  players: PlayerConfig[];
  /** 이미 순위대로 정렬돼 있다 — 여기서 다시 정렬하지 않는다 */
  standings: Standing[];
  /** 실제로 한 라운드 수 */
  roundsPlayed: number;
  /** 설정한 라운드 수 */
  rounds: number;
  onReplay: () => void;
  onExit: () => void;
};

export function FinalResult({ players, standings, roundsPlayed, rounds, onReplay, onExit }: Props) {
  const solo = players.length === 1;
  const best = standings.filter((s) => s.winner);

  let title = '공동 우승!';
  if (solo) title = '다 했어요!';
  else if (best.length === 1) title = `${players[best[0].player].name} 우승!`;

  return (
    <div className={styles.screen}>
      <div className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
        {roundsPlayed < rounds && (
          <p className={styles.subtitle}>{`시간이 다 됐어요 · ${roundsPlayed}/${rounds} 라운드`}</p>
        )}
      </div>
      <ol className={styles.list}>
        {standings.map((s) => (
          <li key={s.player} className={styles.item} style={{ borderLeftColor: PLAYER_COLORS[s.player] }}>
            <span className={styles.name}>{players[s.player].name}</span>
            <span className={styles.total}>{`${s.total}점`}</span>
            <span className={styles.meta}>{`총 ${formatDuration(s.timeMs)}`}</span>
            <span className={styles.meta}>{`${s.solved}/${roundsPlayed} 완성`}</span>
            {!solo && s.winner && <span className={styles.crown}>우승</span>}
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
