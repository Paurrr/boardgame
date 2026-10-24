import { describe, expect, it } from 'vitest';
import { blocksGame } from './blocks';
import { findGame, GAMES, menuGames } from './registry';
import type { GameModule } from './types';

describe('registry', () => {
  it('블록 퍼즐이 1~4인 게임으로 등록돼 있다', () => {
    const game = findGame('blocks');
    expect(game?.name).toBe('블록 퍼즐');
    expect(game?.minPlayers).toBe(1);
    expect(game?.maxPlayers).toBe(4);
  });

  it('게임 id는 겹치지 않는다', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('없는 id는 undefined', () => {
    expect(findGame('nope')).toBeUndefined();
  });
});

describe('menuGames', () => {
  const visible: GameModule = { ...blocksGame, id: 'visible' };
  const hiddenGame: GameModule = { ...blocksGame, id: 'secret', hidden: true };

  it('숨긴 게임은 메뉴에서 뺀다', () => {
    expect(menuGames([visible, hiddenGame], '')).toEqual([visible]);
  });

  it('주소에 ?dev가 있으면 숨긴 게임도 보여준다', () => {
    expect(menuGames([visible, hiddenGame], '?dev')).toEqual([visible, hiddenGame]);
  });
});
