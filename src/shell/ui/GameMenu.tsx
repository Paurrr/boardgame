import { GAMES } from '../../games/registry';
import type { GameModule } from '../../games/types';
import { PLAYER_COLORS } from './colors';
import styles from './GameMenu.module.css';

type Props = { onSelect: (game: GameModule) => void };

export function GameMenu({ onSelect }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.deco} aria-hidden="true">
        {PLAYER_COLORS.map((color) => (
          <span key={color} className={styles.decoBlock} style={{ backgroundColor: color }} data-testid="deco-block" />
        ))}
      </div>
      <h1 className={styles.title}>우리집 보드게임</h1>
      <div className={styles.list}>
        {GAMES.map((g) => {
          const { Icon } = g;
          return (
            <button key={g.id} type="button" className={styles.card} onClick={() => onSelect(g)}>
              <span className={styles.cardText}>
                <span className={styles.cardName}>{g.name}</span>
                <span className={styles.cardDesc}>{g.description}</span>
                <span className={styles.cardMeta}>{`${g.minPlayers}~${g.maxPlayers}명`}</span>
              </span>
              {Icon && (
                <span className={styles.cardArt} data-testid="game-art">
                  <Icon />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <a className={styles.check} href={import.meta.env.BASE_URL + 'check.html'}>
        기기 확인
      </a>
    </div>
  );
}
