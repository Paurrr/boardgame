import { afterEach, describe, expect, it, vi } from 'vitest';
import { canFullscreen, isFullscreen, toggleFullscreen } from './fullscreen';

// jsdom에는 전체화면 API가 없으므로 테스트마다 붙였다 뗀다
const root = document.documentElement as unknown as Record<string, unknown>;

describe('fullscreen', () => {
  afterEach(() => {
    delete root.requestFullscreen;
    delete root.webkitRequestFullscreen;
  });

  it('API가 없으면 못 한다고 알려주고, 눌러도 에러가 없다', () => {
    expect(canFullscreen()).toBe(false);
    expect(isFullscreen()).toBe(false);
    expect(() => toggleFullscreen()).not.toThrow();
  });

  it('표준 API가 있으면 그걸 부른다', () => {
    const request = vi.fn(() => Promise.resolve());
    root.requestFullscreen = request;
    expect(canFullscreen()).toBe(true);
    toggleFullscreen();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('구형 webkit API만 있으면 그걸 부른다', () => {
    const request = vi.fn();
    root.webkitRequestFullscreen = request;
    expect(canFullscreen()).toBe(true);
    toggleFullscreen();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
