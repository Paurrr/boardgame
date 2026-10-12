import { useState } from 'react';
import { blocksGame } from './games/blocks';
import { DIFFICULTIES, DIFFICULTY_LABEL } from './lib/difficulty';
import type { Difficulty } from './lib/difficulty';
import { deriveSeed } from './lib/random';
import { PLAYER_COLORS } from './shell/ui/colors';
import { PlayLayout } from './shell/ui/PlayLayout';

const noop = () => {};
const { PlayerArea } = blocksGame;

/** 임시 터치 시험 화면 — 셸(메뉴·설정·대결)이 생기면 교체한다 */
export default function App() {
  const [players, setPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [round, setRound] = useState(1);

  return (
    <div className="app touch-test">
      <div className="touch-test-bar">
        <h1>우리집 보드게임 · 터치 시험</h1>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" className="btn" aria-pressed={players === n} onClick={() => setPlayers(n)}>
            {n}명
          </button>
        ))}
        {DIFFICULTIES.map((d) => (
          <button key={d} type="button" className="btn" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
        <button type="button" className="btn" onClick={() => setRound((r) => r + 1)}>
          새 문제
        </button>
      </div>
      <div className="touch-test-play">
        <PlayLayout
          columns={Array.from({ length: players }, (_, i) => ({
            key: String(i),
            color: PLAYER_COLORS[i],
            header: <strong>{i + 1}번</strong>,
            body: (
              <PlayerArea
                key={round + '-' + difficulty}
                difficulty={difficulty}
                seed={deriveSeed(round, i)}
                active
                onSolved={noop}
              />
            ),
          }))}
        />
      </div>
    </div>
  );
}
