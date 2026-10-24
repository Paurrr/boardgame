import { describe, expect, it } from 'vitest';
import {
  clampGameTime,
  defaultName,
  defaultSetup,
  finalizeSetup,
  fitTimeLimit,
  MAX_NAME_LENGTH,
  resizePlayers,
  stepGameTime,
  timeOptionsOf,
  toMatchConfig,
} from './setup';

const STACK_TIME = { timeOptions: [90, 120, 150], defaultTimeSec: 120 } as const;

describe('게임별 제한시간 선택지', () => {
  it('게임이 정하지 않으면 60/90/120', () => {
    expect(timeOptionsOf({})).toEqual([60, 90, 120]);
  });

  it('게임이 정하면 그 선택지', () => {
    expect(timeOptionsOf(STACK_TIME)).toEqual([90, 120, 150]);
  });

  it('선택지에 없는 값은 게임 기본값으로 맞춘다', () => {
    expect(fitTimeLimit(STACK_TIME, 60)).toBe(120);
    expect(fitTimeLimit({}, 150)).toBe(90);
  });

  it('선택지에 있는 값은 그대로', () => {
    expect(fitTimeLimit(STACK_TIME, 150)).toBe(150);
  });

  it('defaultSetup은 게임 기본 시간을 쓴다', () => {
    expect(defaultSetup(STACK_TIME).timeLimitSec).toBe(120);
  });
});

describe('defaultSetup', () => {
  it('2명, 보통, 5라운드, 90초', () => {
    expect(defaultSetup()).toEqual({
      players: [
        { name: '플레이어 1', difficulty: 'normal' },
        { name: '플레이어 2', difficulty: 'normal' },
      ],
      rounds: 5,
      timeMode: 'round',
      timeLimitSec: 90,
      gameTimeSec: 300,
    });
  });

  it('시간 방식은 라운드마다, 판 전체 시간은 300초', () => {
    expect(defaultSetup()).toMatchObject({ timeMode: 'round', gameTimeSec: 300 });
  });
});

describe('clampGameTime', () => {
  it.each([
    [25, 30],
    [47, 50],
    [601, 600],
    [9999, 600],
    [120, 120],
  ])('%s초는 %s초', (sec, want) => {
    expect(clampGameTime(sec)).toBe(want);
  });

  it.each([Number.NaN, Infinity])('%s이면 기본값 300초', (sec) => {
    expect(clampGameTime(sec)).toBe(300);
  });
});

describe('stepGameTime', () => {
  it('10초씩 늘리고 줄인다', () => {
    expect(stepGameTime(300, 1)).toBe(310);
    expect(stepGameTime(300, -1)).toBe(290);
  });

  it('30초 아래로, 600초 위로 나가지 않는다', () => {
    expect(stepGameTime(30, -1)).toBe(30);
    expect(stepGameTime(600, 1)).toBe(600);
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
      timeMode: 'round',
      timeLimitSec: 60,
      gameTimeSec: 300,
    });
    expect(out.players).toEqual([
      { name: '플레이어 1', difficulty: 'easy' },
      { name: '서연', difficulty: 'hard' },
    ]);
  });

  it('긴 이름은 자른다', () => {
    const out = finalizeSetup({
      players: [{ name: '가나다라마바사아자차카', difficulty: 'easy' }],
      rounds: 3,
      timeMode: 'round',
      timeLimitSec: 60,
      gameTimeSec: 300,
    });
    expect(out.players[0].name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('시간 방식과 판 전체 시간은 그대로 둔다', () => {
    const out = finalizeSetup({ ...defaultSetup(), timeMode: 'game', gameTimeSec: 120 });
    expect(out).toMatchObject({ timeMode: 'game', gameTimeSec: 120 });
  });
});

describe('toMatchConfig', () => {
  it('게임 id를 붙인다', () => {
    expect(toMatchConfig('blocks', defaultSetup())).toEqual({ gameId: 'blocks', ...defaultSetup() });
  });

  it('시간 방식과 판 전체 시간을 넘긴다', () => {
    const c = toMatchConfig('blocks', { ...defaultSetup(), timeMode: 'game', gameTimeSec: 120 });
    expect(c).toMatchObject({ timeMode: 'game', gameTimeSec: 120 });
  });
});
