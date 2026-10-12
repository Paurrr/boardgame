import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeAudioContext {
  static oscillators = 0;
  currentTime = 0;
  state = 'running';
  destination = {};
  createOscillator() {
    FakeAudioContext.oscillators++;
    return { type: '', frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  resume() {
    return Promise.resolve();
  }
}

const w = window as unknown as { AudioContext?: unknown };

describe('sound', () => {
  beforeEach(() => {
    vi.resetModules();
    FakeAudioContext.oscillators = 0;
  });

  afterEach(() => {
    delete w.AudioContext;
  });

  it('AudioContext가 없어도 에러 없이 조용히 넘어간다', async () => {
    const { sounds, unlockAudio } = await import('./sound');
    expect(() => {
      unlockAudio();
      sounds.tick();
      sounds.go();
      sounds.solved();
      sounds.timeUp();
    }).not.toThrow();
  });

  it('잠금을 풀기 전에는 소리를 내지 않는다', async () => {
    w.AudioContext = FakeAudioContext;
    const { sounds } = await import('./sound');
    sounds.tick();
    expect(FakeAudioContext.oscillators).toBe(0);
  });

  it('잠금을 풀면 소리를 낸다', async () => {
    w.AudioContext = FakeAudioContext;
    const { sounds, unlockAudio } = await import('./sound');
    unlockAudio();
    sounds.solved();
    expect(FakeAudioContext.oscillators).toBe(2);
  });

  it('음소거하면 소리를 내지 않는다', async () => {
    w.AudioContext = FakeAudioContext;
    const { setMuted, isMuted, sounds, unlockAudio } = await import('./sound');
    unlockAudio();
    setMuted(true);
    expect(isMuted()).toBe(true);
    sounds.tick();
    expect(FakeAudioContext.oscillators).toBe(0);
  });
});
