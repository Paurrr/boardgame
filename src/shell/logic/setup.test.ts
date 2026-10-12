import { describe, expect, it } from 'vitest';
import { defaultName, defaultSetup, finalizeSetup, MAX_NAME_LENGTH, resizePlayers, toMatchConfig } from './setup';

describe('defaultSetup', () => {
  it('2명, 보통, 5라운드, 90초', () => {
    expect(defaultSetup()).toEqual({
      players: [
        { name: '플레이어 1', difficulty: 'normal' },
        { name: '플레이어 2', difficulty: 'normal' },
      ],
      rounds: 5,
      timeLimitSec: 90,
    });
  });
});

describe('resizePlayers', () => {
  const two = defaultSetup().players.map((p, i) => (i === 0 ? { name: '민준', difficulty: 'easy' as const } : p));

  it('늘리면 기존 플레이어는 두고 기본값을 붙인다', () => {
    expect(resizePlayers(two, 3)).toEqual([...two, { name: defaultName(2), difficulty: 'normal' }]);
  });

  it('줄이면 앞에서부터 남긴다', () => {
    expect(resizePlayers(two, 1)).toEqual([two[0]]);
  });
});

describe('finalizeSetup', () => {
  it('빈 이름은 기본 이름으로, 앞뒤 공백은 지운다', () => {
    const out = finalizeSetup({
      players: [
        { name: '  ', difficulty: 'easy' },
        { name: ' 서연 ', difficulty: 'hard' },
      ],
      rounds: 3,
      timeLimitSec: 60,
    });
    expect(out.players).toEqual([
      { name: '플레이어 1', difficulty: 'easy' },
      { name: '서연', difficulty: 'hard' },
    ]);
  });

  it('긴 이름은 자른다', () => {
    const out = finalizeSetup({ players: [{ name: '가나다라마바사아자차카', difficulty: 'easy' }], rounds: 3, timeLimitSec: 60 });
    expect(out.players[0].name).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('toMatchConfig', () => {
  it('게임 id를 붙인다', () => {
    expect(toMatchConfig('blocks', defaultSetup())).toEqual({ gameId: 'blocks', ...defaultSetup() });
  });
});
