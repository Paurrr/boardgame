import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Card } from '../logic/types';
import { LaneBody, LaneHead } from './Lane';
import type { LaneProps } from './Lane';
import styles from './Lane.module.css';

function props(over: Partial<LaneProps> = {}): LaneProps {
  return {
    name: '민준',
    color: '#D9442E',
    top: null,
    downCount: 14,
    isTurn: false,
    canFlip: false,
    out: false,
    notice: null,
    gained: false,
    onFlip: vi.fn(),
    onBellDown: vi.fn(),
    onBellUp: vi.fn(),
    onBellCancel: vi.fn(),
    ...over,
  };
}

function renderHead(p: LaneProps) {
  return render(<LaneHead {...p} />);
}

function renderBody(p: LaneProps) {
  return render(<LaneBody {...p} />);
}

const flipButton = () => screen.getByRole('button', { name: /뒤집기/ });
const bell = () => screen.getByRole('button', { name: '종' });

describe('LaneBody 뒤집기', () => {
  it('canFlip이면 pointerdown에 onFlip을 한 번 부른다', () => {
    const p = props({ canFlip: true });
    renderBody(p);
    expect(flipButton()).not.toHaveAttribute('aria-disabled', 'true');
    fireEvent.pointerDown(flipButton(), { pointerId: 1 });
    expect(p.onFlip).toHaveBeenCalledTimes(1);
  });

  it('canFlip이 아니면 aria-disabled이고 onFlip을 부르지 않는다', () => {
    const p = props({ canFlip: false });
    renderBody(p);
    expect(flipButton()).toHaveAttribute('aria-disabled', 'true');
    fireEvent.pointerDown(flipButton(), { pointerId: 1 });
    expect(p.onFlip).not.toHaveBeenCalled();
  });

  it('이름에 남은 장수가 들어간다', () => {
    renderBody(props({ downCount: 14 }));
    expect(flipButton()).toHaveAccessibleName(/14장/);
  });

  it('차례면 켜진 면, 아니면 꺼진 면', () => {
    const { unmount } = renderBody(props({ canFlip: true }));
    expect(flipButton()).toHaveClass(styles.flip);
    unmount();
    renderBody(props({ canFlip: false }));
    expect(flipButton()).toHaveClass(styles.flipOff);
    expect(flipButton()).not.toHaveClass(styles.flip);
  });

  it('카드를 가져간 칸은 장수가 커졌다 돌아온다', () => {
    const { unmount } = renderBody(props({ gained: true }));
    expect(screen.getByText('14장')).toHaveClass(styles.countGained);
    unmount();
    renderBody(props({ gained: false }));
    expect(screen.getByText('14장')).not.toHaveClass(styles.countGained);
  });
});

describe('LaneBody 종', () => {
  it('pointerdown·pointerup·pointercancel을 각각 한 번씩 넘긴다', () => {
    const p = props();
    renderBody(p);
    fireEvent.pointerDown(bell(), { pointerId: 3 });
    fireEvent.pointerUp(bell(), { pointerId: 3 });
    fireEvent.pointerCancel(bell(), { pointerId: 4 });
    expect(p.onBellDown).toHaveBeenCalledTimes(1);
    expect(p.onBellUp).toHaveBeenCalledTimes(1);
    expect(p.onBellCancel).toHaveBeenCalledTimes(1);
    expect(vi.mocked(p.onBellDown).mock.calls[0][0].pointerId).toBe(3);
  });

  it('종 안에 글자 종이 보인다', () => {
    renderBody(props());
    expect(bell()).toHaveTextContent('종');
  });

  it('탈락이면 종이 disabled이고 아무것도 넘기지 않는다', () => {
    const p = props({ out: true });
    renderBody(p);
    expect(bell()).toBeDisabled();
    fireEvent.pointerDown(bell(), { pointerId: 3 });
    fireEvent.pointerUp(bell(), { pointerId: 3 });
    fireEvent.pointerCancel(bell(), { pointerId: 3 });
    expect(p.onBellDown).not.toHaveBeenCalled();
    expect(p.onBellUp).not.toHaveBeenCalled();
    expect(p.onBellCancel).not.toHaveBeenCalled();
  });
});

describe('LaneBody 알림', () => {
  it('ok와 warn은 서로 다른 클래스, plain과도 다르다', () => {
    const { rerender } = renderBody(props({ notice: { text: '민준 먼저! +7장', tone: 'ok' } }));
    const ok = screen.getByText('민준 먼저! +7장').className;
    rerender(<LaneBody {...props({ notice: { text: '민준 틀렸어요 −2장', tone: 'warn' } })} />);
    const warn = screen.getByText('민준 틀렸어요 −2장').className;
    rerender(<LaneBody {...props({ notice: { text: '+1장', tone: 'plain' } })} />);
    const plain = screen.getByText('+1장').className;
    expect(ok).toContain(styles.noticeOk);
    expect(warn).toContain(styles.noticeWarn);
    expect(new Set([ok, warn, plain]).size).toBe(3);
  });

  it('알림이 없어도 같은 자리에 빈 줄을 둔다', () => {
    renderBody(props({ notice: null }));
    expect(screen.getByTestId('lane-notice')).toBeEmptyDOMElement();
  });
});

describe('LaneHead', () => {
  const banana2: Card = { fruit: 'banana', count: 2 };

  it('이름을 보이고, 펼친 카드가 있으면 카드를 그린다', () => {
    renderHead(props({ top: banana2 }));
    expect(screen.getByText('민준')).toBeInTheDocument();
    expect(screen.getByTestId('fruit-card')).toBeInTheDocument();
  });

  it('펼친 카드가 없으면 빈 자리', () => {
    renderHead(props({ top: null }));
    expect(screen.getByTestId('empty-card')).toBeInTheDocument();
  });

  it('차례면 차례!', () => {
    renderHead(props({ isTurn: true }));
    expect(screen.getByText('차례!')).toBeInTheDocument();
  });

  it('차례가 아니면 차례!가 없다', () => {
    renderHead(props({ isTurn: false }));
    expect(screen.queryByText('차례!')).toBeNull();
  });

  it('탈락이면 탈락', () => {
    renderHead(props({ out: true }));
    expect(screen.getByText('탈락')).toBeInTheDocument();
  });

  it('새 카드 객체가 오면 카드를 새로 그려 등장 애니메이션을 다시 한다', () => {
    const { rerender } = renderHead(props({ top: banana2 }));
    const first = screen.getByTestId('fruit-card');
    rerender(<LaneHead {...props({ top: banana2, downCount: 13 })} />);
    expect(screen.getByTestId('fruit-card')).toBe(first);
    rerender(<LaneHead {...props({ top: { fruit: 'banana', count: 2 } })} />);
    expect(screen.getByTestId('fruit-card')).not.toBe(first);
  });
});
