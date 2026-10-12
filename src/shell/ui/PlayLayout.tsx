import type { ReactNode } from 'react';
import styles from './PlayLayout.module.css';

export type Column = { key: string; color: string; header: ReactNode; body: ReactNode };

/** 플레이어 칸을 가로로 나란히. 각 칸 위 1/3은 정보, 아래 2/3은 조작 영역 */
export function PlayLayout({ columns }: { columns: Column[] }) {
  return (
    <div className={styles.columns}>
      {columns.map((c) => (
        <section key={c.key} className={styles.column} data-testid="player-column">
          <div className={styles.head} style={{ borderTopColor: c.color }}>
            {c.header}
          </div>
          <div className={styles.body}>{c.body}</div>
        </section>
      ))}
    </div>
  );
}
