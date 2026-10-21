import { describe, expect, it } from 'vitest';
import { browserStore, memoryStore } from '../../lib/storage';
import type { KeyValueStore } from '../../lib/storage';
import { loadBestTimes, loadSetup, recordBestTime, saveSetup } from './persistence';
import { defaultSetup } from './setup';

const SETUP_KEY = 'boardgame.setup.v1';

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('storage', () => {
  it('memoryStore는 넣은 값을 돌려준다', () => {
    const s = memoryStore();
    expect(s.getItem('a')).toBeNull();
    s.setItem('a', '1');
    expect(s.getItem('a')).toBe('1');
  });

  it('browserStore는 jsdom에서 localStorage를 쓴다', () => {
    const s = browserStore();
    s.setItem('x', 'y');
    expect(window.localStorage.getItem('x')).toBe('y');
  });
});

describe('setup 저장', () => {
  it('저장한 설정을 그대로 불러온다', () => {
    const store = memoryStore();
    const setup = { ...defaultSetup(), rounds: 9 };
    saveSetup(store, setup);
    expect(loadSetup(store)).toEqual(setup);
  });

  it('판 전체 방식 설정도 그대로 불러온다', () => {
    const store = memoryStore();
    const setup = { ...defaultSetup(), timeMode: 'game' as const, gameTimeSec: 50 };
    saveSetup(store, setup);
    expect(loadSetup(store)).toEqual(setup);
  });

  it('시간 방식이 없던 예전 저장값은 라운드마다, 판 전체 300초로 채운다', () => {
    const store = memoryStore();
    const { players } = defaultSetup();
    store.setItem(SETUP_KEY, JSON.stringify({ players, rounds: 5, timeLimitSec: 90 }));
    expect(loadSetup(store)).toEqual({ players, rounds: 5, timeMode: 'round', timeLimitSec: 90, gameTimeSec: 300 });
  });

  it('판 전체 시간은 10초 단위로 정리한다', () => {
    const store = memoryStore();
    store.setItem(SETUP_KEY, JSON.stringify({ ...defaultSetup(), gameTimeSec: 47 }));
    expect(loadSetup(store)?.gameTimeSec).toBe(50);
  });

  it('저장된 게 없으면 null', () => {
    expect(loadSetup(memoryStore())).toBeNull();
  });

  it.each([
    ['깨진 JSON', '{oops'],
    ['배열', '[]'],
    ['플레이어 0명', JSON.stringify({ players: [], rounds: 5, timeLimitSec: 90 })],
    ['플레이어 5명', JSON.stringify({ ...defaultSetup(), players: new Array(5).fill(defaultSetup().players[0]) })],
    ['모르는 난이도', JSON.stringify({ ...defaultSetup(), players: [{ name: 'a', difficulty: 'expert' }] })],
    ['이름이 문자열이 아님', JSON.stringify({ ...defaultSetup(), players: [{ name: 3, difficulty: 'easy' }] })],
    ['없는 라운드 수', JSON.stringify({ ...defaultSetup(), rounds: 4 })],
    ['없는 제한시간', JSON.stringify({ ...defaultSetup(), timeLimitSec: 30 })],
    ['모르는 시간 방식', JSON.stringify({ ...defaultSetup(), timeMode: 'fast' })],
    ['판 전체 시간이 숫자가 아님', JSON.stringify({ ...defaultSetup(), gameTimeSec: '50' })],
  ])('%s이면 null', (_name, raw) => {
    const store = memoryStore();
    store.setItem(SETUP_KEY, raw);
    expect(loadSetup(store)).toBeNull();
  });

  it('저장소가 막혀 있어도 에러 없이 null', () => {
    expect(() => saveSetup(throwingStore, defaultSetup())).not.toThrow();
    expect(loadSetup(throwingStore)).toBeNull();
  });
});

describe('최고기록', () => {
  it('처음 기록은 새 기록', () => {
    const store = memoryStore();
    expect(recordBestTime(store, 'easy', 12000)).toBe(true);
    expect(loadBestTimes(store)).toEqual({ easy: 12000 });
  });

  it('더 느리면 새 기록이 아니고, 더 빠르면 새 기록', () => {
    const store = memoryStore();
    recordBestTime(store, 'normal', 20000);
    expect(recordBestTime(store, 'normal', 25000)).toBe(false);
    expect(recordBestTime(store, 'normal', 15000)).toBe(true);
    expect(loadBestTimes(store).normal).toBe(15000);
  });

  it('난이도별로 따로 저장한다', () => {
    const store = memoryStore();
    recordBestTime(store, 'easy', 5000);
    recordBestTime(store, 'hard', 50000);
    expect(loadBestTimes(store)).toEqual({ easy: 5000, hard: 50000 });
  });

  it('0 이하나 숫자가 아닌 시간은 무시한다', () => {
    const store = memoryStore();
    expect(recordBestTime(store, 'easy', 0)).toBe(false);
    expect(recordBestTime(store, 'easy', Number.NaN)).toBe(false);
    expect(loadBestTimes(store)).toEqual({});
  });

  it('깨진 기록 데이터는 빈 기록으로 본다', () => {
    const store = memoryStore();
    store.setItem('boardgame.blocks.best.v1', '{"easy":"fast","normal":-1}');
    expect(loadBestTimes(store)).toEqual({});
  });

  it('저장소가 막혀 있어도 에러 없이 동작한다', () => {
    expect(() => recordBestTime(throwingStore, 'easy', 1000)).not.toThrow();
    expect(loadBestTimes(throwingStore)).toEqual({});
  });
});
