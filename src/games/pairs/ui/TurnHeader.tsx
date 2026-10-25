import { PLAYER_COLORS } from '../../../shell/ui/colors';
import styles from './TurnHeader.module.css';

export type TurnHeaderProps = {
  names: readonly string[];
  pairs: readonly number[];
  turn: number;
  /** 1인일 때만 쓴다 */
  tries: number;
  totalPairs: number;
};

/** 판 위쪽(보기 전용): 여럿이면 차례인 사람과 사람별 짝 수, 혼자면 찾은 짝과 횟수 */
export function TurnHeader({ names, pairs, turn, tries, totalPairs }: TurnHeaderProps) {
  if (names.length === 1) {
    return (
      <div className={styles.header}>
        <span className={styles.soloPairs}>{`찾은 짝 ${pairs[0]}/${totalPairs}`}</span>
        <span className={styles.tries}>{`${tries}번`}</span>
      </div>
    );
  }

  const color = PLAYER_COLORS[turn];
  return (
    <div className={styles.header}>
      <div className={styles.turn}>
        <span className={styles.turnChip} style={{ backgroundColor: color }} />
        <span className={styles.turnName} style={{ color }}>{`${names[turn]} 차례`}</span>
      </div>
      <ul className={styles.players}>
        {names.map((name, i) => (
          <li
            key={i}
            className={styles.player}
            aria-current={i === turn ? 'true' : undefined}
            style={i === turn ? { borderBottomColor: PLAYER_COLORS[i] } : undefined}
          >
            <span className={styles.chip} style={{ backgroundColor: PLAYER_COLORS[i] }} />
            <span className={styles.name}>{name}</span>
            <span className={styles.pairs}>{`${pairs[i]}쌍`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
