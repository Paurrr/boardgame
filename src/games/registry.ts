import { blocksGame } from './blocks';
import type { GameModule } from './types';

/** 새 게임은 src/games/<id>/index.ts 에 GameModule을 만들고 여기에 추가한다 */
export const GAMES: readonly GameModule[] = [blocksGame];

export function findGame(id: string): GameModule | undefined {
  return GAMES.find((g) => g.id === id);
}
