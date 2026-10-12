import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTap, movedBeyondTap } from './gesture';
import { usePointerDrag } from './usePointerDrag';

const ev = (pointerId: number, clientX: number, clientY: number) =>
  ({ pointerId, clientX, clientY }) as unknown as ReactPointerEvent<Element>;

describe('gesture', () => {
  it('10px 미만, 300ms 미만이면 탭', () => {
    expect(isTap(9, 299)).toBe(true);
    expect(isTap(10, 100)).toBe(false);
    expect(isTap(0, 300)).toBe(false);
  });

  it('10px 이상 움직이면 끌기', () => {
    expect(movedBeyondTap(9.9)).toBe(false);
    expect(movedBeyondTap(10)).toBe(true);
  });
});

describe('usePointerDrag', () => {
  let calls: string[];

  beforeEach(() => {
    calls = [];
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () =>
    renderHook(() =>
      usePointerDrag<string>({
        onDragStart: (id) => calls.push(`start:${id}`),
        onDragMove: (id, dx, dy) => calls.push(`move:${id}:${dx},${dy}`),
        onDragEnd: (id, dx, dy) => calls.push(`end:${id}:${dx},${dy}`),
        onTap: (id) => calls.push(`tap:${id}`),
      }),
    );

  it('10px 넘게 움직이면 끌기 시작·이동·끝을 알린다', () => {
    const { result } = setup();
    const el = document.createElement('div');
    act(() => {
      result.current.begin(ev(1, 0, 0), 'a', el);
      result.current.move(ev(1, 5, 0));
      result.current.move(ev(1, 30, 0));
      result.current.end(ev(1, 40, 0));
    });
    expect(calls).toEqual(['start:a', 'move:a:30,0', 'end:a:40,0']);
  });

  it('제자리에서 짧게 누르면 탭', () => {
    const { result } = setup();
    act(() => {
      result.current.begin(ev(1, 0, 0), 'a', document.createElement('div'));
      vi.setSystemTime(100);
      result.current.end(ev(1, 2, 2));
    });
    expect(calls).toEqual(['tap:a']);
  });

  it('제자리에서 길게 누르면 아무것도 안 한다', () => {
    const { result } = setup();
    act(() => {
      result.current.begin(ev(1, 0, 0), 'a', document.createElement('div'));
      vi.setSystemTime(500);
      result.current.end(ev(1, 0, 0));
    });
    expect(calls).toEqual([]);
  });

  it('손가락(포인터)마다 따로 추적한다', () => {
    const { result } = setup();
    const el = document.createElement('div');
    act(() => {
      result.current.begin(ev(1, 0, 0), 'a', el);
      result.current.begin(ev(2, 100, 100), 'b', el);
      result.current.move(ev(2, 100, 150));
      result.current.move(ev(1, 20, 0));
      result.current.end(ev(2, 100, 160));
      result.current.end(ev(1, 25, 0));
    });
    expect(calls).toEqual(['start:b', 'move:b:0,50', 'start:a', 'move:a:20,0', 'end:b:0,60', 'end:a:25,0']);
  });

  it('끌던 중 취소되면 제자리(0,0)로 끝낸다', () => {
    const { result } = setup();
    act(() => {
      result.current.begin(ev(1, 0, 0), 'a', document.createElement('div'));
      result.current.move(ev(1, 50, 0));
      result.current.cancel(ev(1, 50, 0));
    });
    expect(calls).toEqual(['start:a', 'move:a:50,0', 'end:a:0,0']);
  });

  it('모르는 포인터의 이동·끝은 무시한다', () => {
    const { result } = setup();
    act(() => {
      result.current.move(ev(9, 50, 0));
      result.current.end(ev(9, 50, 0));
    });
    expect(calls).toEqual([]);
  });
});
