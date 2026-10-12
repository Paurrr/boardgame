import { useEffect, useRef, useState } from 'react';

/** 요소의 화면 크기(CSS px). 창 크기·전체화면이 바뀌면 다시 잰다 (ResizeObserver는 구형 Chrome에 없음) */
export function useElementSize<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSize((prev) => (prev.width === r.width && prev.height === r.height ? prev : { width: r.width, height: r.height }));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return { ref, size };
}
