import { describe, expect, it } from 'vitest';
import { LEVEL_TEXT, levelBadge, levelText } from './levelText';

describe('levelText', () => {
  it('설정 화면에 보일 단계별 설명', () => {
    expect(levelText('easy')).toBe('카드 16장 · 틀리면 3초만 보여요');
    expect(levelText('normal')).toBe('카드 32장 · 틀리면 2초만 보여요');
    expect(levelText('hard')).toBe('카드 48장 · 틀리면 1초만 보여요');
  });

  it('LEVEL_TEXT는 세 단계의 설명을 모은 것', () => {
    expect(LEVEL_TEXT.easy).toBe('카드 16장 · 틀리면 3초만 보여요');
    expect(LEVEL_TEXT).toEqual({ easy: levelText('easy'), normal: levelText('normal'), hard: levelText('hard') });
  });
});

describe('levelBadge', () => {
  it('위쪽 막대에 난이도·장수·보이는 시간을 보인다', () => {
    expect(levelBadge('easy')).toBe('쉬움 · 16장 · 3초');
    expect(levelBadge('normal')).toBe('보통 · 32장 · 2초');
    expect(levelBadge('hard')).toBe('어려움 · 48장 · 1초');
  });
});
