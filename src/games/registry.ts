import { isDevMode } from '../lib/devMode';
import { blocksGame } from './blocks';
import type { GameModule } from './types';

/** 새 게임은 src/games/<id>/index.ts 에 GameModule을 만들고 여기에 추가한다 */
export const GAMES: readonly GameModule[] = [blocksGame];

export function findGame(id: string): GameModule | undefined {
  return GAMES.find((g) => g.id === id);
}

/** 메뉴에 보일 게임. 숨긴 게임은 주소에 ?dev가 있을 때만 */
export function menuGames(games: readonly GameModule[], search: string): GameModule[] {
  const dev = isDevMode(search);
  return games.filter((g) => dev || !g.hidden);
}
