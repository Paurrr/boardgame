import type { PlayerConfig } from '../logic/match';
import { winners } from '../logic/match';
import { PLAYER_COLORS } from './colors';
import styles from './FinalResult.module.css';

type Props = {
  players: PlayerConfig[];
  totals: number[];
  onReplay: () => void;
  onExit: () => void;
};

export function FinalResult({ players, totals, onReplay, onExit }: Props) {
  const best = winners(totals);
  const ranking = players
    .map((p, index) => ({ name: p.name, index, total: totals[index] }))
    .sort((a, b) => b.total - a.total || a.index - b.index);

  let title = '공동 우승!';
  if (players.length === 1) title = '다 했어요!';
  else if (best.length === 1) title = `${players[best[0]].name} 우승!`;

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{title}</h1>
      <ol className={styles.list}>
        {ranking.map((r) => (
          <li key={r.index} className={styles.item} style={{ borderLeftColor: PLAYER_COLORS[r.index] }}>
            <span className={styles.name}>{r.name}</span>
            <span className={styles.total}>{`${r.total}점`}</span>
            {players.length > 1 && best.includes(r.index) && <span className={styles.crown}>우승</span>}
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
