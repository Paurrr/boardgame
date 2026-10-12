import { describe, expect, it } from 'vitest';
import { formatClock, formatSeconds } from './format';

describe('formatClock', () => {
  it('남은 시간을 m:ss로, 초는 올림', () => {
    expect(formatClock(90000)).toBe('1:30');
    expect(formatClock(59001)).toBe('1:00');
    expect(formatClock(9000)).toBe('0:09');
    expect(formatClock(0)).toBe('0:00');
  });

  it('음수는 0:00', () => {
    expect(formatClock(-500)).toBe('0:00');
  });
});

describe('formatSeconds', () => {
  it('걸린 시간을 소수 첫째 자리 초로', () => {
    expect(formatSeconds(12345)).toBe('12.3초');
    expect(formatSeconds(5000)).toBe('5.0초');
  });
});
