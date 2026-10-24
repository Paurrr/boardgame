import { useMemo, useState } from 'react';
import type { GameModule } from './games/types';
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
  | { kind: 'match'; game: GameModule; config: MatchConfig; seed: number };

export default function App() {
  const store = useMemo(() => browserStore(), []);
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });

  const startMatch = (game: GameModule, setup: SavedSetup) => {
    saveSetup(store, setup);
    setScreen({ kind: 'match', game, config: toMatchConfig(game.id, setup), seed: randomSeed() });
  };

  return (
    // 첫 터치 때 소리를 깨우고, 길게 누르기 메뉴는 막는다
    <div className="app" onPointerDownCapture={unlockAudio} onContextMenu={(e) => e.preventDefault()}>
      {screen.kind === 'menu' && <GameMenu onSelect={(game) => setScreen({ kind: 'setup', game })} />}
      {screen.kind === 'setup' && (
        <PlayerSetup
          game={screen.game}
          initial={loadSetup(store) ?? defaultSetup(screen.game)}
          onBack={() => setScreen({ kind: 'menu' })}
          onStart={(setup) => startMatch(screen.game, setup)}
        />
      )}
      {screen.kind === 'match' && (
        <Match
          key={screen.seed}
          game={screen.game}
          config={screen.config}
          seed={screen.seed}
          store={store}
          onExit={() => setScreen({ kind: 'menu' })}
          onReplay={() => setScreen({ ...screen, seed: randomSeed() })}
        />
      )}
    </div>
  );
}
