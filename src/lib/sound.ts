type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let muted = false;

function audioCtor(): AudioCtor | null {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** 브라우저는 사용자가 화면을 만진 뒤에만 소리를 허용한다 → 첫 터치 때 부른다 */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor = audioCtor();
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType = 'sine', volume = 0.2): void {
  if (muted || !ctx) return;
  try {
    const t0 = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  } catch {
    // 소리가 실패해도 게임은 계속한다
  }
}

/** 에셋 파일 없이 합성음으로 */
export const sounds = {
  tick: () => tone(660, 0, 0.12),
  go: () => tone(880, 0, 0.3),
  solved: () => {
    tone(784, 0, 0.15);
    tone(1047, 0.15, 0.3);
  },
  timeUp: () => tone(196, 0, 0.7, 'square', 0.12),
  /** 과일 종치기: 맞게 친 종 "땡" (높은 음에 배음을 살짝 얹는다) */
  ding: () => {
    tone(1568, 0, 0.6);
    tone(2093, 0, 0.35, 'sine', 0.08);
  },
  /** 과일 종치기: 틀린 종 */
  buzz: () => tone(147, 0, 0.45, 'square', 0.12),
};
