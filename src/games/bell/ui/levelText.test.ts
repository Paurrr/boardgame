import { describe, expect, it } from 'vitest';
import { LEVEL_TEXT, levelBadge, levelText } from './levelText';

describe('levelText', () => {
  it('설정 화면에 보일 단계별 설명', () => {
    expect(levelText('easy')).toBe('시간 제한 없음 · 카드는 전부 나눠요');
    expect(levelText('normal')).toBe('차례마다 3초 → 점점 빨라져 1초까지 (지나면 저절로 뒤집혀요) · 한 사람 12장');
    expect(levelText('hard')).toBe('차례마다 3초 → 점점 빨라져 0.5초까지 (지나면 저절로 뒤집혀요) · 한 사람 8장');
  });

  it('LEVEL_TEXT는 세 단계의 설명을 모은 것', () => {
    expect(LEVEL_TEXT).toEqual({ easy: levelText('easy'), normal: levelText('normal'), hard: levelText('hard') });
  });
});

describe('levelBadge', () => {
  it('위쪽 막대에 난이도와 지금 차례 제한시간을 보인다 (0.1초 아래는 버림)', () => {
    expect(levelBadge('normal', 0)).toBe('보통 · 3초');
    expect(levelBadge('normal', 1)).toBe('보통 · 2.9초');
    expect(levelBadge('normal', 12)).toBe('보통 · 2.4초');
    expect(levelBadge('normal', 99)).toBe('보통 · 1초');
    expect(levelBadge('hard', 99)).toBe('어려움 · 0.5초');
  });

  it('쉬움은 이름만', () => {
    expect(levelBadge('easy', 3)).toBe('쉬움');
  });
});
