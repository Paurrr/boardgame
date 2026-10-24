import { useState } from 'react';
import type { GameModule } from '../../games/types';
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../../lib/difficulty';
import { ROUND_OPTIONS } from '../logic/match';
import type { PlayerConfig, TimeMode } from '../logic/match';
import { formatClock } from '../logic/format';
import {
  finalizeSetup,
  fitTimeLimit,
  GAME_TIME_MAX_SEC,
  GAME_TIME_MIN_SEC,
  MAX_NAME_LENGTH,
  resizePlayers,
  stepGameTime,
  timeOptionsOf,
} from '../logic/setup';
import type { SavedSetup } from '../logic/setup';
import { PLAYER_COLORS } from './colors';
import styles from './PlayerSetup.module.css';

type Props = {
  game: GameModule;
  initial: SavedSetup;
  onStart: (setup: SavedSetup) => void;
  onBack: () => void;
};

export function PlayerSetup({ game, initial, onStart, onBack }: Props) {
  const [players, setPlayers] = useState<PlayerConfig[]>(() => {
    const count = Math.min(game.maxPlayers, Math.max(game.minPlayers, initial.players.length));
    return resizePlayers(initial.players, count);
  });
  const [rounds, setRounds] = useState(initial.rounds);
  const [timeMode, setTimeMode] = useState<TimeMode>(initial.timeMode);
  const [timeLimitSec, setTimeLimitSec] = useState(() => fitTimeLimit(game, initial.timeLimitSec));
  const [gameTimeSec, setGameTimeSec] = useState(initial.gameTimeSec);

  const counts: number[] = [];
  for (let n = game.minPlayers; n <= game.maxPlayers; n++) counts.push(n);

  const update = (index: number, patch: Partial<PlayerConfig>) =>
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{`${game.name} · 누가 할까요?`}</h1>

      {/* 칠판(1280×720)에서 4명이어도 넘치지 않게 두 열: 왼쪽은 누가, 오른쪽은 어떻게 + 시작 */}
      <div className={styles.columns}>
        <div className={styles.who}>
          <div className={styles.row} role="group" aria-label="인원">
            <span className={styles.label}>인원</span>
            {counts.map((n) => (
              <button
                key={n}
                type="button"
                className="btn"
                aria-pressed={players.length === n}
                onClick={() => setPlayers((prev) => resizePlayers(prev, n))}
              >
                {`${n}명`}
              </button>
            ))}
          </div>

          {players.map((p, i) => (
            <div key={i} className={styles.row} role="group" aria-label={`${i + 1}번 플레이어`}>
              <span className={styles.swatch} style={{ background: PLAYER_COLORS[i] }} />
              <input
                className={styles.name}
                aria-label={`${i + 1}번 이름`}
                value={p.name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="btn"
                  aria-pressed={p.difficulty === d}
                  onClick={() => update(i, { difficulty: d })}
                >
                  {DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.how}>
          <div className={styles.row} role="group" aria-label="라운드">
            <span className={styles.label}>라운드</span>
            {ROUND_OPTIONS.map((r) => (
              <button key={r} type="button" className="btn" aria-pressed={rounds === r} onClick={() => setRounds(r)}>
                {`${r}판`}
              </button>
            ))}
          </div>

          <div className={styles.row} role="group" aria-label="시간 방식">
            <span className={styles.label}>시간</span>
            <button
              type="button"
              className="btn"
              aria-pressed={timeMode === 'round'}
              onClick={() => setTimeMode('round')}
            >
              라운드마다
            </button>
            <button
              type="button"
              className="btn"
              aria-pressed={timeMode === 'game'}
              onClick={() => setTimeMode('game')}
            >
              판 전체
            </button>
          </div>

          {timeMode === 'round' ? (
            <div className={styles.row} role="group" aria-label="제한시간">
              <span className={styles.label}>제한</span>
              {timeOptionsOf(game).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="btn"
                  aria-pressed={timeLimitSec === t}
                  onClick={() => setTimeLimitSec(t)}
                >
                  {`${t}초`}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.row} role="group" aria-label="판 전체 시간">
              <span className={styles.label}>전체</span>
              <button
                type="button"
                className="btn"
                aria-label="10초 줄이기"
                disabled={gameTimeSec <= GAME_TIME_MIN_SEC}
                onClick={() => setGameTimeSec((sec) => stepGameTime(sec, -1))}
              >
                −10초
              </button>
              <span className={styles.gameTime} data-testid="game-time">
                {formatClock(gameTimeSec * 1000)}
              </span>
              <button
                type="button"
                className="btn"
                aria-label="10초 늘리기"
                disabled={gameTimeSec >= GAME_TIME_MAX_SEC}
                onClick={() => setGameTimeSec((sec) => stepGameTime(sec, 1))}
              >
                +10초
              </button>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className="btn" onClick={onBack}>
              ← 메뉴
            </button>
            <button
              type="button"
              className={'btn btn-primary ' + styles.start}
              onClick={() => onStart(finalizeSetup({ players, rounds, timeMode, timeLimitSec, gameTimeSec }))}
            >
              시작!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
