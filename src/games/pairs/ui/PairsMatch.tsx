import { useEffect, useReducer, useState } from 'react';
import { isMuted, setMuted, sounds } from '../../../lib/sound';
import { loadBestTimes, recordBestTime } from '../../../shell/logic/persistence';
import { PLAYER_COLORS } from '../../../shell/ui/colors';
import { TopBar } from '../../../shell/ui/TopBar';
import type { OwnMatchProps } from '../../types';
import { createPairsGame, isOver, pairsReducer, standings } from '../logic/game';
import { cardCount, PAIRS_LEVELS } from '../logic/level';
import type { PairsState } from '../logic/types';
import { Board } from './Board';
import { FLIP_MS } from './Card';
import { levelBadge } from './levelText';
import { PairsResult } from './PairsResult';
import type { SoloRecord } from './PairsResult';
import styles from './PairsMatch.module.css';
import { TurnHeader } from './TurnHeader';

/** 맞춘 두 장을 앞면으로 보여 주는 시간 (뒤집기가 끝난 뒤부터) */
export const MATCH_SHOW_MS = 600;
/** '한 번 더!'·'○○ 차례'를 판 위에 띄우는 시간. 그동안 누른 카드는 뒤집지 않는다 */
export const BANNER_MS = 1000;
/** 마지막 짝이 빠진 뒤 결과 화면으로 넘어가기까지 */
export const END_SHOW_MS = 1000;

const GAME_ID = 'pairs';

type Banner = { text: string; color: string };

/** 두 장을 정리한 뒤 판 위에 띄울 글. 혼자이거나 끝났으면 없다 */
function bannerAfter(before: PairsState, after: PairsState, names: readonly string[]): Banner | null {
  if (names.length < 2 || isOver(after)) return null;
  const color = PLAYER_COLORS[after.turn];
  return before.pending === 'match' ? { text: '한 번 더!', color } : { text: `${names[after.turn]} 차례`, color };
}

/** 4탄 경기 화면: 위쪽 막대, 위 1/3 차례 표시, 아래 2/3 판 하나 (사람별 칸이 아니다) */
export function PairsMatch({ playerNames, seed, level, store, onExit, onReplay }: OwnMatchProps) {
  const [state, dispatch] = useReducer(pairsReducer, undefined, () =>
    createPairsGame(playerNames.length, seed, level),
  );
  const [muted, setMutedState] = useState(isMuted);
  const [banner, setBanner] = useState<Banner | null>(null);
  /** 결과로 넘어갔으면 혼자일 때의 기록(여럿이면 null)을 담는다 */
  const [result, setResult] = useState<{ solo: SoloRecord | null } | null>(null);
  const { rows, cols, showMs } = PAIRS_LEVELS[level];
  const solo = playerNames.length === 1;
  const over = isOver(state);

  useEffect(() => {
    if (state.pending === 'match') sounds.solved();
  }, [state.pending]);

  // 두 장이 열리면: 뒤집기가 끝난 뒤 잠시 보여 주고 정리한다. 차례가 넘어가면 다음 사람을 알린다
  useEffect(() => {
    if (state.pending === null) return;
    const next = bannerAfter(state, pairsReducer(state, { type: 'CONTINUE' }), playerNames);
    const missed = state.pending === 'miss';
    const id = window.setTimeout(
      () => {
        dispatch({ type: 'CONTINUE' });
        if (next === null) return;
        if (missed) sounds.go();
        setBanner(next);
      },
      FLIP_MS + (missed ? showMs : MATCH_SHOW_MS),
    );
    return () => window.clearTimeout(id);
  }, [state, playerNames, showMs]);

  useEffect(() => {
    if (banner === null) return;
    const id = window.setTimeout(() => setBanner(null), BANNER_MS);
    return () => window.clearTimeout(id);
  }, [banner]);

  // 다 찾으면 잠시 보여 준 뒤 결과로. 혼자면 이때 한 번만 기록한다
  const { tries } = state;
  useEffect(() => {
    if (!over) return;
    const id = window.setTimeout(() => {
      if (!solo) {
        setResult({ solo: null });
        return;
      }
      const isNew = recordBestTime(store, GAME_ID, level, tries);
      const best = loadBestTimes(store, GAME_ID)[level] ?? tries;
      setResult({ solo: { tries, best, isNew } });
    }, END_SHOW_MS);
    return () => window.clearTimeout(id);
  }, [over, solo, store, level, tries]);

  if (result) {
    return (
      <PairsResult
        playerNames={playerNames}
        standings={standings(state)}
        solo={result.solo}
        onReplay={onReplay}
        onExit={onExit}
      />
    );
  }

  // 배너가 떠 있는 동안 뗀 손가락은 버린다 (두 장이 보이는 동안은 reducer가 무시한다)
  const tap = (index: number) => {
    if (banner === null) dispatch({ type: 'FLIP', index });
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <div className={styles.match}>
      <TopBar label={levelBadge(level)} muted={muted} onToggleMute={toggleMute} onExit={onExit} />
      <div className={styles.head}>
        <TurnHeader
          names={playerNames}
          pairs={state.pairs}
          turn={state.turn}
          tries={state.tries}
          totalPairs={cardCount(level) / 2}
        />
      </div>
      <div className={styles.body}>
        <div className={styles.boardBox}>
          <Board
            rows={rows}
            cols={cols}
            slots={state.slots}
            open={state.open}
            color={PLAYER_COLORS[state.turn]}
            onTap={tap}
          />
          {banner && (
            <div className={styles.bannerLayer}>
              <div role="status" className={styles.banner} style={{ color: banner.color, borderColor: banner.color }}>
                {banner.text}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
