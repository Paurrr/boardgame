import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatSeconds } from './format';

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

describe('formatDuration', () => {
  it('60초 미만은 소수 첫째 자리 초로', () => {
    expect(formatDuration(0)).toBe('0.0초');
    expect(formatDuration(45200)).toBe('45.2초');
    expect(formatDuration(59940)).toBe('59.9초');
  });

  it('60초 이상은 분과 두 자리 초로', () => {
    expect(formatDuration(62300)).toBe('1분 02.3초');
    expect(formatDuration(600000)).toBe('10분 00.0초');
  });

  it('0.1초 단위로 먼저 반올림한 뒤 분·초로 나눈다', () => {
    expect(formatDuration(59960)).toBe('1분 00.0초');
  });
});
