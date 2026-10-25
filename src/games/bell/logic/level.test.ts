import { describe, expect, it } from 'vitest';
import { BELL_LEVELS, turnLimitMs } from './level';

describe('BELL_LEVELS', () => {
  it('쉬움은 시간 제한 없이 카드를 전부, 보통은 12장·어려움은 8장을 나눈다', () => {
    expect(BELL_LEVELS.easy.cardsEach).toBeNull();
    expect(BELL_LEVELS.easy.startMs).toBeNull();
    expect(BELL_LEVELS.normal.cardsEach).toBe(12);
    expect(BELL_LEVELS.hard.cardsEach).toBe(8);
  });
});

describe('turnLimitMs', () => {
  it('보통은 3초에서 시작해 한 장마다 0.05초씩 줄어 1초에서 멈춘다', () => {
    expect(turnLimitMs('normal', 0)).toBe(3000);
    expect(turnLimitMs('normal', 12)).toBe(2400);
    expect(turnLimitMs('normal', 40)).toBe(1000);
    expect(turnLimitMs('normal', 99)).toBe(1000);
  });

  it('어려움은 같은 속도로 줄어 0.5초까지 간다', () => {
    expect(turnLimitMs('hard', 0)).toBe(3000);
    expect(turnLimitMs('hard', 40)).toBe(1000);
    expect(turnLimitMs('hard', 50)).toBe(500);
    expect(turnLimitMs('hard', 200)).toBe(500);
  });

  it('쉬움은 시간 제한이 없다', () => {
    expect(turnLimitMs('easy', 0)).toBeNull();
    expect(turnLimitMs('easy', 5)).toBeNull();
  });
});
