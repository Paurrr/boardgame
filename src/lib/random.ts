export type Rng = {
  /** 0 이상 1 미만 */
  next(): number;
  /** 0 이상 maxExclusive 미만 정수 */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** 원본을 바꾸지 않은 섞인 복사본 */
  shuffle<T>(items: readonly T[]): T[];
};

/** mulberry32: 같은 시드면 같은 수열 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(maxExclusive: number): number {
    return Math.floor(next() * maxExclusive);
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('빈 배열에서 고를 수 없습니다');
    return items[int(items.length)];
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  return { next, int, pick, shuffle };
}

/** 여러 정수를 섞어 32비트 시드 하나로 만든다 (FNV-1a) */
export function deriveSeed(...parts: number[]): number {
  let h = 2166136261;
  for (const part of parts) {
    let v = part >>> 0;
    for (let i = 0; i < 4; i++) {
      h ^= v & 0xff;
      h = Math.imul(h, 16777619) >>> 0;
      v >>>= 8;
    }
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
