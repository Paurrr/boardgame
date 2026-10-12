import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed } from './random';

describe('createRng', () => {
  it('같은 시드는 같은 수열을 만든다', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    const ys = Array.from({ length: 5 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('다른 시드는 다른 수열을 만든다', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('next는 0 이상 1 미만이다', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n)은 0부터 n-1까지의 정수를 고르게 낸다', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(4);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('pick은 빈 배열이면 에러를 던진다', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });

  it('shuffle은 원본을 바꾸지 않고 순열을 돌려준다', () => {
    const src = [1, 2, 3, 4, 5];
    const out = createRng(3).shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('deriveSeed', () => {
  it('같은 입력이면 같은 시드', () => {
    expect(deriveSeed(1, 2, 3)).toBe(deriveSeed(1, 2, 3));
  });

  it('순서가 다르면 다른 시드', () => {
    expect(deriveSeed(1, 2, 3)).not.toBe(deriveSeed(3, 2, 1));
  });

  it('32비트 부호 없는 정수를 돌려준다', () => {
    const s = deriveSeed(123456789, 5, 0);
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});
