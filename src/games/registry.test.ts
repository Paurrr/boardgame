import { describe, expect, it } from 'vitest';
import { LEVEL_TEXT } from './bell/ui/levelText';
import { blocksGame } from './blocks';
import { LEVEL_TEXT as PAIRS_LEVEL_TEXT } from './pairs/ui/levelText';
import { findGame, GAMES, menuGames } from './registry';
import type { GameModule, PuzzleGame } from './types';

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

  it('쌓기 퍼즐은 1~4인, 제한시간 90/120/150초(기본 120초)로 등록돼 있다', () => {
    const game = findGame('stack') as PuzzleGame | undefined;
    expect(game?.name).toBe('쌓기 퍼즐');
    expect(game?.minPlayers).toBe(1);
    expect(game?.maxPlayers).toBe(4);
    expect(game?.timeOptions).toEqual([90, 120, 150]);
    expect(game?.defaultTimeSec).toBe(120);
  });

  it('쌓기 퍼즐은 ?dev 없이도 메뉴에 보이고 메뉴 그림이 있다', () => {
    expect(menuGames(GAMES, '').map((g) => g.id)).toContain('stack');
    expect(findGame('stack')?.hidden).toBeFalsy();
    expect(findGame('stack')?.Icon).toBeDefined();
  });

  it('과일 종치기는 2~4인 own 게임이고 ?dev 없이도 메뉴에 보인다', () => {
    const game = findGame('bell');
    expect(game?.name).toBe('과일 종치기');
    expect(game?.kind).toBe('own');
    expect(game?.hidden).toBeFalsy();
    expect(game?.minPlayers).toBe(2);
    expect(game?.maxPlayers).toBe(4);
    expect(game?.Icon).toBeDefined();
    expect(game?.kind === 'own' && game.levels).toEqual(LEVEL_TEXT);
    expect(menuGames(GAMES, '').map((g) => g.id)).toContain('bell');
  });

  it('짝 맞추기는 1~4인 own 게임이고 ?dev 없이도 메뉴에 보인다', () => {
    const game = findGame('pairs');
    expect(game?.name).toBe('짝 맞추기');
    expect(game?.kind).toBe('own');
    expect(game?.hidden).toBeFalsy();
    expect(game?.minPlayers).toBe(1);
    expect(game?.maxPlayers).toBe(4);
    expect(game?.Icon).toBeDefined();
    expect(game?.kind === 'own' && game.levels).toEqual(PAIRS_LEVEL_TEXT);
    expect(menuGames(GAMES, '').map((g) => g.id)).toContain('pairs');
  });

  it('게임은 나온 순서대로 메뉴에 놓인다', () => {
    expect(GAMES.map((g) => g.id)).toEqual(['blocks', 'stack', 'bell', 'pairs']);
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
