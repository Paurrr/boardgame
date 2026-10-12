import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/boardgame/',
  plugins: [
    react(),
    // 칠판의 구형 Chrome(Android 8 내장)용 번들. Chrome 105 미만은 이 번들을 받는다.
    legacy({ targets: ['chrome >= 61', 'android >= 61'] }),
  ],
  build: {
    // CSS는 폴리필되지 않으므로 문법만이라도 구형 기준으로 낮춘다.
    cssTarget: 'chrome61',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
