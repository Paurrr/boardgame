import { useMemo, useState } from 'react';
import type { GameModule } from './games/types';
import type { Difficulty } from './lib/difficulty';
import { randomSeed } from './lib/random';
import { unlockAudio } from './lib/sound';
import { browserStore } from './lib/storage';
import type { MatchConfig } from './shell/logic/match';
import { loadSetup, saveSetup } from './shell/logic/persistence';
import { defaultSetup, toMatchConfig } from './shell/logic/setup';
import type { SavedSetup } from './shell/logic/setup';
import { GameMenu } from './shell/ui/GameMenu';
import { Match } from './shell/ui/Match';
import { PlayerSetup } from './shell/ui/PlayerSetup';

type Screen =
  | { kind: 'menu' }
  | { kind: 'setup'; game: GameModule }
  | { kind: 'match'; game: GameModule; config: MatchConfig; level: Difficulty; seed: number };

export default function App() {
  const store = useMemo(() => browserStore(), []);
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });

  const startMatch = (game: GameModule, setup: SavedSetup) => {
    saveSetup(store, setup);
    setScreen({ kind: 'match', game, config: toMatchConfig(game.id, setup), level: setup.level, seed: randomSeed() });
  };

  return (
    // 첫 터치 때 소리를 깨우고, 길게 누르기 메뉴는 막는다
    <div className="app" onPointerDownCapture={unlockAudio} onContextMenu={(e) => e.preventDefault()}>
      {screen.kind === 'menu' && <GameMenu onSelect={(game) => setScreen({ kind: 'setup', game })} />}
      {screen.kind === 'setup' && (
        <PlayerSetup
          game={screen.game}
          initial={loadSetup(store) ?? (screen.game.kind === 'own' ? defaultSetup() : defaultSetup(screen.game))}
          onBack={() => setScreen({ kind: 'menu' })}
          onStart={(setup) => startMatch(screen.game, setup)}
        />
      )}
      {/* 경기 화면을 맡는 게임은 이름만 받아 스스로 진행하고, 퍼즐 게임은 셸의 라운드·시계·점수로 진행한다 */}
      {screen.kind === 'match' &&
        (screen.game.kind === 'own' ? (
          <screen.game.Match
            key={screen.seed}
            playerNames={screen.config.players.map((p) => p.name)}
            seed={screen.seed}
            level={screen.level}
            store={store}
            onExit={() => setScreen({ kind: 'menu' })}
            onReplay={() => setScreen({ ...screen, seed: randomSeed() })}
          />
        ) : (
          <Match
            key={screen.seed}
            game={screen.game}
            config={screen.config}
            seed={screen.seed}
            store={store}
            onExit={() => setScreen({ kind: 'menu' })}
            onReplay={() => setScreen({ ...screen, seed: randomSeed() })}
          />
        ))}
    </div>
  );
}
