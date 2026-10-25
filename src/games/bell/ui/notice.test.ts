import { describe, expect, it } from 'vitest';
import { noticeFor } from './notice';

const NAMES = ['민준', '서연', '아빠'];

describe('noticeFor', () => {
  it('맞게 친 사람 칸에는 가져간 장수를 ok로', () => {
    expect(noticeFor({ kind: 'correct', player: 1, gained: 7 }, 1, NAMES)).toEqual({
      text: '서연 먼저! +7장',
      tone: 'ok',
    });
  });

  it('맞음일 때 다른 칸에는 누가 먼저 쳤는지만 plain으로', () => {
    expect(noticeFor({ kind: 'correct', player: 1, gained: 7 }, 0, NAMES)).toEqual({
      text: '서연 먼저!',
      tone: 'plain',
    });
  });

  it('틀리게 친 사람 칸에는 낸 장수를 warn으로 (U+2212 빼기표)', () => {
    expect(noticeFor({ kind: 'wrong', player: 0, paidTo: [1, 2] }, 0, NAMES)).toEqual({
      text: '민준 틀렸어요 −2장',
      tone: 'warn',
    });
  });

  it('틀림일 때 한 장 받은 칸에는 +1장을 plain으로', () => {
    expect(noticeFor({ kind: 'wrong', player: 0, paidTo: [1, 2] }, 2, NAMES)).toEqual({
      text: '+1장',
      tone: 'plain',
    });
  });

  it('틀림일 때 받지 않은 칸에는 알림이 없다', () => {
    expect(noticeFor({ kind: 'wrong', player: 0, paidTo: [1] }, 2, NAMES)).toBeNull();
  });
});
