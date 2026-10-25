import { useEffect, useMemo, useReducer, useState } from 'react';
import type { PuzzleGame } from '../../games/types';
import { DIFFICULTY_LABEL } from '../../lib/difficulty';
import { isMuted, setMuted, sounds } from '../../lib/sound';
import type { KeyValueStore } from '../../lib/storage';
import { formatClock, formatSeconds } from '../logic/format';
import {
  COUNTDOWN_SECONDS,
  createMatch,
  isLastRound,
  matchReducer,
  playerSeed,
  remainingMs,
  roundBudgetMs,
  standings,
} from '../logic/match';
import type { MatchConfig, MatchState } from '../logic/match';
import { recordBestTime } from '../logic/persistence';
import { PLAYER_COLORS } from './colors';
import { FinalResult } from './FinalResult';
import styles from './Match.module.css';
import { PlayLayout } from './PlayLayout';
import { TopBar } from './TopBar';

type Props = {
  game: PuzzleGame;
  config: MatchConfig;
  seed: number;
  store: KeyValueStore;
  onExit: () => void;
  onReplay: () => void;
};

const URGENT_MS = 10000;
const TICK_MS = 250;

type HeaderProps = { state: MatchState; index: number; color: string; solo: boolean; newRecord: boolean };

function PlayerHeader({ state, index, color, solo, newRecord }: HeaderProps) {
  const player = state.config.players[index];
  const rank = state.solveOrder.indexOf(index);
  const time = state.solveTimesMs[index];
  let status = '시간 끝';
  let done = false;
  if (state.phase === 'countdown') status = '준비!';
  else if (rank >= 0 && time !== null) {
    status = solo ? `완성! ${formatSeconds(time)}` : `완성! ${rank + 1}등 · ${formatSeconds(time)}`;
    done = true;
  } else if (state.phase === 'playing') status = '푸는 중';

  return (
    <div>
      <div className={styles.nameLine}>
        <span className={styles.chip} style={{ backgroundColor: color }} data-testid="player-chip" />
        <span className={styles.name}>{player.name}</span>
        <span className={styles.difficulty}>{DIFFICULTY_LABEL[player.difficulty]}</span>
      </div>
      <div className={styles.score}>
        {`${state.totals[index]}점`}
        {state.phase === 'roundResult' && <span className={styles.gain}>{` +${state.roundPoints[index]}`}</span>}
      </div>
      <div className={done ? styles.statusDone : styles.status}>{status}</div>
      {state.phase === 'roundResult' && state.roundBonus[index] > 0 && (
        <div className={styles.bonus}>{`빠르기 +${state.roundBonus[index]}`}</div>
      )}
      {solo && newRecord && state.phase === 'roundResult' && <div className={styles.record}>새 기록!</div>}
    </div>
  );
}

export function Match({ game, config, seed, store, onExit, onReplay }: Props) {
  const [state, dispatch] = useReducer(matchReducer, undefined, () => createMatch(config, seed));
  const [now, setNow] = useState(() => Date.now());
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [newRecord, setNewRecord] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const solo = config.players.length === 1;

  // 카운트다운 3, 2, 1 → 시작
  useEffect(() => {
    if (state.phase !== 'countdown') return;
    setCountdown(COUNTDOWN_SECONDS);
    setNewRecord(false);
    sounds.tick();
    let left = COUNTDOWN_SECONDS;
    const id = window.setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCountdown(left);
        sounds.tick();
      } else {
        window.clearInterval(id);
        sounds.go();
        dispatch({ type: 'START_ROUND', now: Date.now() });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.phase, state.round]);

  // 플레이 중에는 남은 시간을 자주 갱신
  useEffect(() => {
    if (state.phase !== 'playing') return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [state.phase]);

  const remaining = remainingMs(state, now);

  useEffect(() => {
    if (state.phase === 'playing' && remaining <= 0) {
      sounds.timeUp();
      dispatch({ type: 'TIME_UP' });
    }
  }, [state.phase, remaining]);

  // PlayerArea는 memo라서 onSolved가 매번 바뀌지 않게 고정한다
  const onSolvedHandlers = useMemo(
    () =>
      config.players.map((_, i) => () => {
        sounds.solved();
        dispatch({ type: 'SOLVED', player: i, now: Date.now() });
      }),
    [config.players],
  );

  // 혼자 하기: 한 문제 최단 시간 기록
  const soloTime = solo ? state.solveTimesMs[0] : null;
  useEffect(() => {
    if (soloTime === null) return;
    setNewRecord(recordBestTime(store, game.id, config.players[0].difficulty, soloTime));
  }, [soloTime, store, game.id, config.players]);

  if (state.phase === 'final') {
    return (
      <FinalResult
        players={config.players}
        standings={standings(state)}
        roundsPlayed={state.round}
        rounds={config.rounds}
        onReplay={onReplay}
        onExit={onExit}
      />
    );
  }

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <div className={styles.match}>
      <TopBar
        round={state.round}
        rounds={config.rounds}
        clock={formatClock(remaining)}
        clockLabel={config.timeMode === 'game' ? '판 전체' : undefined}
        urgent={state.phase === 'playing' && remaining <= URGENT_MS}
        muted={muted}
        onToggleMute={toggleMute}
        onExit={onExit}
      />
      <div className={styles.play}>
        <PlayLayout
          columns={config.players.map((p, i) => ({
            key: String(i),
            color: PLAYER_COLORS[i],
            header: (
              <PlayerHeader state={state} index={i} color={PLAYER_COLORS[i]} solo={solo} newRecord={newRecord} />
            ),
            body:
              state.phase === 'countdown' ? (
                <div className={styles.countdown} data-testid="countdown">
                  {countdown}
                </div>
              ) : (
                <game.PlayerArea
                  key={state.round}
                  difficulty={p.difficulty}
                  seed={playerSeed(state, i)}
                  active={state.phase === 'playing' && !state.solveOrder.includes(i)}
                  onSolved={onSolvedHandlers[i]}
                />
              ),
          }))}
        />
      </div>
      {state.phase === 'roundResult' && (
        <div className={styles.resultBar}>
          <span className={styles.resultText}>
            {config.timeMode === 'game' && roundBudgetMs(state) <= 0 ? '시간이 다 됐어요!' : `라운드 ${state.round} 끝!`}
          </span>
          <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
            {isLastRound(state) ? '결과 보기' : '다음 라운드'}
          </button>
        </div>
      )}
    </div>
  );
}
