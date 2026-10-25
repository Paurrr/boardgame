import { useEffect, useReducer, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { TAP_MAX_DURATION_MS } from '../../../lib/gesture';
import { isMuted, setMuted, sounds } from '../../../lib/sound';
import { PLAYER_COLORS } from '../../../shell/ui/colors';
import { PlayLayout } from '../../../shell/ui/PlayLayout';
import { TopBar } from '../../../shell/ui/TopBar';
import type { OwnMatchProps } from '../../types';
import { bellReducer, createBellGame, isOut, ranking, topCards } from '../logic/game';
import { turnLimitMs } from '../logic/level';
import { decide, isWaiting, pressDown, pressUp } from '../logic/press';
import type { Press } from '../logic/press';
import styles from './BellMatch.module.css';
import { BellResult } from './BellResult';
import { LaneBody, LaneHead } from './Lane';
import type { LaneProps } from './Lane';
import { levelBadge } from './levelText';
import { noticeFor } from './notice';

/** 종 결과를 칸에 보여 주는 시간. 그동안 뒤집기·종을 막는다 */
export const RING_SHOW_MS = 1500;
/** 마지막 한 명이 남은 뒤 결과 화면으로 넘어가기까지 */
export const END_SHOW_MS = 1500;
/** 차례 시간이 다 됐는데 종 판정을 기다리는 손가락이 있으면 이만큼 뒤에 다시 본다 */
const AUTO_FLIP_RETRY_MS = 50;

type Point = { x: number; y: number };

export function BellMatch({ playerNames, seed, level, onExit, onReplay }: OwnMatchProps) {
  const [state, dispatch] = useReducer(bellReducer, undefined, () =>
    createBellGame(playerNames.length, seed, level),
  );
  const [muted, setMutedState] = useState(isMuted);
  const [ended, setEnded] = useState(false);
  // 종 누름은 그릴 것이 아니라 판정 재료라 React 상태로 올리지 않는다
  const book = useRef<Press[]>([]);
  const startPoints = useRef(new Map<number, Point>());
  const pressTimers = useRef(new Set<number>());

  // 나간 뒤에 남은 판정 타이머가 돌지 않게
  useEffect(() => {
    const timers = pressTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };
  }, []);

  // 종 결과: 소리를 내고 잠시 보여 준 뒤 이어서 한다
  useEffect(() => {
    const ring = state.lastRing;
    if (ring === null) return;
    if (ring.kind === 'correct') sounds.ding();
    else sounds.buzz();
    const id = window.setTimeout(() => dispatch({ type: 'CONTINUE' }), RING_SHOW_MS);
    return () => window.clearTimeout(id);
  }, [state.lastRing]);

  useEffect(() => {
    if (state.winner === null) return;
    const id = window.setTimeout(() => setEnded(true), END_SHOW_MS);
    return () => window.clearTimeout(id);
  }, [state.winner]);

  // 차례 제한시간: 다 되면 차례인 사람 카드를 저절로 뒤집는다. 뒤집힐 때마다·결과 표시 뒤에 새로 잰다
  const limit = turnLimitMs(level, state.flips);
  const { turn, flips, lastRing, winner } = state;
  useEffect(() => {
    if (limit === null || lastRing !== null || winner !== null) return;
    let id = 0;
    const tick = () => {
      // 종 판정을 기다리는 손가락이 있으면 카드를 바꾸지 않는다 (닿은 순간의 카드로 판정해야 공정하다)
      if (book.current.some((p) => p.upAt === null)) {
        id = window.setTimeout(tick, AUTO_FLIP_RETRY_MS);
        return;
      }
      dispatch({ type: 'FLIP', player: turn });
    };
    id = window.setTimeout(tick, limit);
    return () => window.clearTimeout(id);
  }, [limit, turn, flips, lastRing, winner]);

  if (ended) {
    return <BellResult playerNames={playerNames} ranking={ranking(state)} onReplay={onReplay} onExit={onExit} />;
  }

  // 판정이 나면(울리든 아무도 아니든) 누름 목록을 비운다 → 늦게 뗀 손가락은 목록에 없어 무시된다
  const settle = (now: number) => {
    const decision = decide(book.current, now);
    if (decision.kind === 'wait') return;
    book.current = [];
    startPoints.current.clear();
    if (decision.kind === 'ring') dispatch({ type: 'RING', player: decision.player });
  };

  const bellDown = (player: number, e: ReactPointerEvent) => {
    if (state.lastRing !== null || state.winner !== null || isOut(state, player)) return;
    const target = e.currentTarget;
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // 캡처를 못 해도 같은 종 위에서 떼면 판정된다
      }
    }
    startPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    book.current = pressDown(book.current, e.pointerId, player, e.timeStamp);
    // 계속 누르고 있으면 톡이 아니다 → 300ms 뒤 그 시각으로 다시 판정 (판정 시각은 이벤트 시각 기준)
    const deadline = e.timeStamp + TAP_MAX_DURATION_MS;
    const id = window.setTimeout(() => {
      pressTimers.current.delete(id);
      settle(deadline);
    }, TAP_MAX_DURATION_MS);
    pressTimers.current.add(id);
  };

  const bellRelease = (e: ReactPointerEvent, distance: number) => {
    book.current = pressUp(book.current, e.pointerId, e.timeStamp, distance);
    startPoints.current.delete(e.pointerId);
    settle(e.timeStamp);
  };

  const bellUp = (e: ReactPointerEvent) => {
    const start = startPoints.current.get(e.pointerId);
    bellRelease(e, start ? Math.hypot(e.clientX - start.x, e.clientY - start.y) : Infinity);
  };

  // 종에 닿은 손가락이 톡인지 기다리는 동안에는 카드를 바꾸지 않는다
  const flip = (player: number, e: ReactPointerEvent) => {
    if (isWaiting(book.current, e.timeStamp)) return;
    dispatch({ type: 'FLIP', player });
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const tops = topCards(state);
  const ring = state.lastRing;

  return (
    <div className={styles.match}>
      <TopBar label={levelBadge(level, state.flips)} muted={muted} onToggleMute={toggleMute} onExit={onExit} />
      <div className={styles.play}>
        <PlayLayout
          columns={playerNames.map((name, i) => {
            const lane: LaneProps = {
              name,
              color: PLAYER_COLORS[i],
              top: tops[i],
              downCount: state.piles[i].down.length,
              isTurn: state.turn === i && state.winner === null,
              canFlip: state.turn === i && ring === null && state.winner === null,
              timerMs: state.turn === i && ring === null && state.winner === null ? limit : null,
              out: isOut(state, i),
              notice: ring ? noticeFor(ring, i, playerNames) : null,
              gained: ring?.kind === 'correct' && ring.player === i,
              onFlip: (e) => flip(i, e),
              onBellDown: (e) => bellDown(i, e),
              onBellUp: bellUp,
              onBellCancel: (e) => bellRelease(e, Infinity),
            };
            return {
              key: String(i),
              color: PLAYER_COLORS[i],
              header: <LaneHead {...lane} />,
              body: <LaneBody {...lane} />,
            };
          })}
        />
      </div>
    </div>
  );
}
