import { describe, expect, it } from 'vitest';
import { decide, isWaiting, pressDown, pressUp } from './press';
import type { Press } from './press';

const A = 1;
const B = 2;

describe('decide', () => {
  it('톡 하나면 그 사람이 친다', () => {
    let book = pressDown([], A, 0, 0);
    book = pressUp(book, A, 100, 0);
    expect(decide(book, 100)).toEqual({ kind: 'ring', player: 0 });
  });

  it('계속 누르면 300ms 전까지 기다리고 그 뒤로는 빠진다', () => {
    const book = pressDown([], A, 0, 0);
    expect(decide(book, 299)).toEqual({ kind: 'wait' });
    expect(decide(book, 300)).toEqual({ kind: 'none' });
  });

  it('300ms 넘게 누르고 떼면 빠진다', () => {
    let book = pressDown([], A, 0, 0);
    book = pressUp(book, A, 300, 0);
    expect(decide(book, 300)).toEqual({ kind: 'none' });
  });

  it('10px 넘게 움직이고 떼면 빠진다', () => {
    let book = pressDown([], A, 0, 0);
    book = pressUp(book, A, 100, 10);
    expect(decide(book, 100)).toEqual({ kind: 'none' });
  });

  it('더 이른 톡이 늦게 떼도 이긴다', () => {
    let book = pressDown([], A, 0, 0);
    book = pressDown(book, B, 1, 50);
    book = pressUp(book, B, 100, 0);
    expect(decide(book, 100)).toEqual({ kind: 'wait' });
    book = pressUp(book, A, 200, 0);
    expect(decide(book, 200)).toEqual({ kind: 'ring', player: 0 });
  });

  it('계속 누르는 손바닥은 300ms 뒤 빠지고 다른 사람의 톡이 이긴다', () => {
    let book = pressDown([], A, 0, 0);
    book = pressDown(book, B, 1, 50);
    book = pressUp(book, B, 120, 0);
    expect(decide(book, 120)).toEqual({ kind: 'wait' });
    expect(decide(book, 300)).toEqual({ kind: 'ring', player: 1 });
  });

  it('downAt이 같으면 book에 먼저 들어온 사람이 이긴다', () => {
    let book = pressDown([], B, 1, 40);
    book = pressDown(book, A, 0, 40);
    book = pressUp(book, A, 90, 0);
    book = pressUp(book, B, 100, 0);
    expect(decide(book, 100)).toEqual({ kind: 'ring', player: 1 });
  });

  it('누름이 없으면 none', () => {
    expect(decide([], 0)).toEqual({ kind: 'none' });
  });
});

describe('pressDown', () => {
  it('이미 있는 pointerId는 새 누름으로 바꾼다', () => {
    let book = pressDown([], A, 0, 0);
    book = pressUp(book, A, 400, 0);
    book = pressDown(book, A, 0, 500);
    expect(book).toEqual<Press[]>([{ pointerId: A, player: 0, downAt: 500, upAt: null, distance: 0 }]);
  });

  it('받은 book을 바꾸지 않는다', () => {
    const before = pressDown([], A, 0, 0);
    pressDown(before, B, 1, 10);
    pressUp(before, A, 100, 0);
    expect(before).toEqual<Press[]>([{ pointerId: A, player: 0, downAt: 0, upAt: null, distance: 0 }]);
  });
});

describe('pressUp', () => {
  it('없는 pointerId면 내용이 같다', () => {
    const book = pressDown([], A, 0, 0);
    expect(pressUp(book, B, 100, 0)).toEqual(book);
  });
});

describe('isWaiting', () => {
  it('톡인지 모르는 누름이 있을 때만 true', () => {
    const book = pressDown([], A, 0, 0);
    expect(isWaiting(book, 299)).toBe(true);
    expect(isWaiting(book, 300)).toBe(false);
    expect(isWaiting(pressUp(book, A, 100, 0), 100)).toBe(false);
  });

  it('누름이 없으면 false', () => {
    expect(isWaiting([], 0)).toBe(false);
  });
});
