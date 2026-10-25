import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../../lib/difficulty';
import { cardCount, PAIRS_LEVELS, PICTURE_COUNT } from './level';

describe('cardCount', () => {
  it('쉬움 16장(4×4), 보통 32장(4×8), 어려움 48장(6×8)이다', () => {
    expect(cardCount('easy')).toBe(16);
    expect(cardCount('normal')).toBe(32);
    expect(cardCount('hard')).toBe(48);
  });

  it('모든 단계가 짝수 장이고 필요한 그림 수가 그림 종류를 넘지 않는다', () => {
    for (const level of DIFFICULTIES) {
      expect(cardCount(level) % 2).toBe(0);
      expect(cardCount(level) / 2).toBeLessThanOrEqual(PICTURE_COUNT);
    }
  });
});

describe('PAIRS_LEVELS', () => {
  it('틀린 두 장 보이는 시간은 3초·2초·1초다', () => {
    expect(PAIRS_LEVELS.easy.showMs).toBe(3000);
    expect(PAIRS_LEVELS.normal.showMs).toBe(2000);
    expect(PAIRS_LEVELS.hard.showMs).toBe(1000);
  });
});
