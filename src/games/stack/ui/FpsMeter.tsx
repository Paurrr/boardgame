import { useEffect, useState } from 'react';

/** 개발용(?dev): 초당 프레임 수. requestAnimationFrame을 세어 1초마다 보인다 (칠판 성능 확인, 설계서 §5.4) */
export function FpsMeter({ className }: { className?: string }) {
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    let frame = 0;
    let count = 0;
    let since = performance.now();
    const step = () => {
      count++;
      const now = performance.now();
      if (now - since >= 1000) {
        setFps(Math.round((count * 1000) / (now - since)));
        count = 0;
        since = now;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <div className={className}>{`${fps ?? '–'} fps`}</div>;
}
