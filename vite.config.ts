import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/boardgame/',
  plugins: [react()],
  build: {
    // 칠판 실측 Chrome 99 기준 (docs/ADR.md ADR-006). Vite 기본값은 이보다 새 브라우저라 직접 정한다.
    // 더 오래된 기기에서 흰 화면이 나오면 ADR-006의 복구 절차로 plugin-legacy를 되살린다.
    target: 'chrome99',
    cssTarget: 'chrome99',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
