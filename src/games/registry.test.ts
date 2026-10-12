import { describe, expect, it } from 'vitest';
import { findGame, GAMES } from './registry';

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
