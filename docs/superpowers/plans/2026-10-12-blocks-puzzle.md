# 블록 퍼즐(우봉고 스타일) 보드게임 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 오래된 LG 전자칠판 브라우저에서 1~4명이 함께 하는 우봉고 스타일 퍼즐 게임 "블록 퍼즐"을 만들고, 게임을 계속 추가할 수 있는 공통 셸까지 갖춘 정적 웹앱을 GitHub Pages에 배포한다.

**Architecture:** Vite + React + TypeScript 정적 SPA. 게임 규칙(`src/games/blocks/logic`)과 판 진행(`src/shell/logic`)은 React에 의존하지 않는 순수 TS로 TDD 한다. UI는 셸(메뉴·설정·칸 분할·라운드·점수)과 게임 모듈(`GameModule.PlayerArea`)로 나뉘고, 퍼즐 칸은 한 장의 SVG(판 + 버튼 줄 + 트레이)로 그린다. `@vitejs/plugin-legacy`가 칠판의 구형 Chrome용 번들을 함께 만든다.

**Tech Stack:** Vite 7.3.7, React 19.3.0, TypeScript 5.9.3, @vitejs/plugin-legacy 7.2.1, Vitest 3.2.7 + jsdom 26.1.0 + Testing Library, ESLint 9.39.5 + typescript-eslint 8.71.1, GitHub Actions → GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (실행 전에 반드시 함께 읽는다)

> 이 계획의 모든 코드는 2026-10-12에 임시 폴더에서 실제로 작성·실행해 검증했다: lint 통과, `tsc --noEmit` 통과, 테스트 25개 파일 265개 통과, `vite build` 성공(legacy 번들 생성, 빌드 CSS에 금지 속성 없음). 코드를 그대로 옮기면 같은 결과가 나와야 한다.

## Global Constraints

- 패키지는 아래 버전으로 고정(`-E`)한다. 더 새 메이저(Vite 8, TS 7, Vitest 5, ESLint 10 등)는 쓰지 않는다 — 검증한 조합이 아니다.
- `vite.config.ts`: `base: '/boardgame/'`, legacy `targets: ['chrome >= 61', 'android >= 61']`(Task 3 진단 결과로 확정), `build.cssTarget: 'chrome61'`.
- 최신 CSS 금지: Tailwind v4, flexbox `gap`, `aspect-ratio`, `inset`, CSS nesting, `:is()/:where()`, `oklch()/color-mix()`, container query. 간격은 margin/padding으로. 색은 16진수만.
- `public/check.html`은 빌드를 거치지 않으므로 ES5만 (화살표 함수·`let`/`const`·템플릿 문자열·`class`·전개 연산자·`for...of` 금지).
- 서버·외부 API 호출 금지. 저장은 `localStorage`만, 접근은 try/catch로 감싸고 실패해도 동작.
- "우봉고" 이름·원작 카드·그림 금지. 앱 이름 "우리집 보드게임", 게임 이름 "블록 퍼즐".
- 플레이어 칸은 가로로만 나란히(2×2 금지), 조작 영역은 칸의 아래쪽 2/3.
- 퍼즐판에는 목표 모양의 실루엣만 굵게, 조각 경계선 금지. 칸 격자선은 모든 칸에 똑같이.
- 놓기 규칙: 쉬움 = 목표 모양 안에만(`inside`), 보통·어려움 = 판 격자(사방 여유 2칸) 안 어디든(`free`), 겹침은 항상 금지.
- 터치는 Pointer Events, 끄는 동안은 React 상태 대신 SVG `transform`을 직접 바꾸고 놓을 때만 상태 커밋.
- 여러 명이 동시에 만지는 버튼(퍼즐 칸 안 돌리기/뒤집기)은 `click` 대신 `pointerdown`에 반응한다 (터치 click은 첫 손가락에만 생긴다).
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits(`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- 외부에 영향 주는 작업(공개 저장소 생성, Pages 활성화, push)은 실행 직전에 사용자에게 확인받는다.
- 프로젝트 `.claude/settings.json`의 Stop 훅이 턴마다 `npm run lint && npm run build && npm run test`를 돌린다. Task 1 전에는 `package.json`이 없어 실패하는 게 정상이고, 각 Task는 한 턴 안에서 테스트까지 통과시킨 상태로 끝낸다.

## Review Focus

스펙이 암시하지만 사용자가 실제로 부딪히기 쉬운 입력·상황과, 그걸 붙잡는 테스트 위치:

1. **여러 손가락이 동시에 끌 때** (2~4명 동시 플레이) → 손가락(pointerId)마다 독립 추적. `usePointerDrag` "손가락(포인터)마다 따로 추적한다" 테스트(Task 9) + 칠판 실기기 4명 동시 끌기(Task 10, Task 16).
2. **끌던 중 터치가 취소될 때** (손바닥·시스템 제스처, 칠판 IR 터치 오작동) → 조각이 제자리로 돌아가야 한다. `usePointerDrag` "끌던 중 취소되면 제자리(0,0)로 끝낸다"(Task 9). 탭이 끌기로 잘못 인식되는 IR 터치 떨림은 "돌리기" 버튼으로 우회(Task 10 테스트).
3. **시간 종료와 정답이 거의 동시에 / 라운드가 끝난 뒤 늦게 도착한 정답** → 무시해야 한다. `matchReducer` "SOLVED: … 플레이 중이 아닐 때는 무시한다", "같은 사람이 두 번 풀어도 한 번만"(Task 11).
4. **저장소가 깨졌거나 막혔을 때** (사생활 보호 모드, 손으로 고친 값, 옛 버전 형식) → 기본값으로 동작. `persistence` "깨진 JSON / 모르는 난이도 / 저장소가 막혀 있어도"(Task 12).
5. **칸 크기를 아직 못 쟀을 때·화면 크기가 바뀔 때** (첫 렌더, 전체화면 전환) → 0 크기에서도 깨지지 않고 기본 레이아웃. `bestLayout` "크기를 아직 모르면 2열"(Task 9), PlayerArea 렌더 테스트는 jsdom 0 크기에서 돈다(Task 10).

---

## 파일 구조

```
.github/workflows/deploy.yml     # lint·test·build 후 GitHub Pages 배포
index.html  vite.config.ts  tsconfig.json  eslint.config.js  package.json
public/check.html                # 기기 진단 페이지 (ES5, 빌드 미경유)
src/
├── main.tsx  App.tsx  App.test.tsx  styles.css   # 진입점, 화면 전환, 전역 스타일(.btn 등)
├── checkPage.test.ts            # check.html 검증
├── test/setup.ts                # jest-dom, cleanup, PointerEvent 대용
├── lib/                         # 게임 무관 공통 도구
│   ├── difficulty.ts            # Difficulty 타입·라벨
│   ├── random.ts                # 시드 난수, 시드 파생
│   ├── gesture.ts               # 탭/끌기 판정 기준
│   ├── usePointerDrag.ts        # 손가락별 끌기·탭 훅
│   ├── useElementSize.ts        # 요소 크기 측정
│   ├── storage.ts               # localStorage 래퍼
│   ├── sound.ts                 # WebAudio 합성음
│   └── fullscreen.ts            # 전체화면 (webkit 접두사 포함)
├── games/
│   ├── types.ts                 # GameModule, PlayerAreaProps (셸↔게임 계약)
│   ├── registry.ts              # 게임 목록
│   └── blocks/
│       ├── index.ts             # blocksGame: GameModule
│       ├── logic/               # 순수 TS
│       │   ├── types.ts         # Cell, PieceId, Orientation, Placement, Puzzle, BoardArea, PlaceMode
│       │   ├── shape.ts         # 정규화, 크기, 연결, 구멍, 테두리
│       │   ├── transform.ts     # 회전·뒤집기·방향
│       │   ├── pieces.ts        # 조각 10종
│       │   ├── board.ts         # 판 영역, 놓기 규칙, 정답 판정, 제자리 회전
│       │   ├── solver.ts        # 검증용 백트래킹 솔버
│       │   ├── generator.ts     # 퍼즐 생성기
│       │   └── play.ts          # 칸 하나의 조각 상태 변화(놓기·돌리기·뒤집기)
│       └── ui/
│           ├── layout.ts        # SVG 안 판·버튼 줄·트레이 배치 계산
│           ├── PieceView.tsx    # 조각 하나
│           ├── PlayerArea.tsx   # 플레이어 칸 하나 (GameModule.PlayerArea)
│           └── PlayerArea.module.css
└── shell/
    ├── logic/
    │   ├── match.ts             # 판 진행 reducer, 점수, 남은 시간, 시드
    │   ├── setup.ts             # 설정 기본값·정리
    │   ├── persistence.ts       # 설정·최고기록 저장/불러오기
    │   └── format.ts            # 시간 표시
    └── ui/
        ├── colors.ts            # 플레이어 색
        ├── PlayLayout.tsx/.module.css   # 가로 칸 분할 (위 1/3 정보, 아래 2/3 조작)
        ├── GameMenu.tsx/.module.css
        ├── PlayerSetup.tsx/.module.css
        ├── TopBar.tsx           # 라운드·시간·소리·전체화면·그만하기
        ├── Match.tsx/.module.css        # 카운트다운·플레이·라운드 결과
        └── FinalResult.tsx/.module.css
```

## 실행 순서와 사용자 확인 지점

| Task | 내용 | 사용자 확인 |
|---|---|---|
| 1 | 프로젝트 셋업 | |
| 2 | 기기 진단 페이지 | |
| 3 | GitHub 저장소·자동 배포·칠판 진단 | **공개 저장소 생성·push 전 확인, 칠판에서 진단 결과 받기** |
| 4~8 | 퍼즐 규칙 로직 (TDD) | |
| 9~10 | 퍼즐 칸 UI + 터치 시험 화면 | **배포 후 칠판에서 터치 시험** |
| 11~15 | 셸 (판 진행·저장·소리·메뉴·대결 화면) | |
| 16 | 실기기 점검·문서 마무리 | **칠판에서 최종 점검** |

---

### Task 1: 프로젝트 셋업

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: `npm run dev | build | preview | lint | test` 명령, 전역 CSS 변수(`--bg`, `--panel`, `--ink`, `--ink-soft`, `--ink-faint`, `--target`, `--target-edge`, `--margin-cell`, `--grid-line`, `--tray`, `--ok`, `--warn`), 테스트 환경(jsdom + jest-dom 매처 + 자동 cleanup)

- [ ] **Step 1: package.json 만들고 의존성 설치**

`package.json`:

```json
{
  "name": "boardgame",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

```bash
npm install -E react@19.3.0 react-dom@19.3.0
npm install -D -E vite@7.3.7 @vitejs/plugin-react@5.2.0 @vitejs/plugin-legacy@7.2.1 terser@5.51.2 typescript@5.9.3 @types/react@19.3.0 @types/react-dom@19.3.0 vitest@3.2.7 jsdom@26.1.0 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/jest-dom@6.10.0 eslint@9.39.5 @eslint/js@9.39.5 typescript-eslint@8.71.1 eslint-plugin-react-hooks@5.2.0 globals@16.5.0
```

npm 12가 `core-js`, `esbuild`의 install script를 막았다는 경고를 낼 수 있다. 무시해도 된다 (검증 환경에서도 같은 경고가 났고 빌드·테스트 모두 정상).

- [ ] **Step 2: 설정 파일 작성**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
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
```

`eslint.config.js`:

```js
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'public', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
  },
]);
```

`index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <title>우리집 보드게임</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: 실패하는 테스트 작성**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('앱 제목을 보여준다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `Failed to resolve import "./App"`

- [ ] **Step 5: 구현**

`src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app">
      <h1>우리집 보드게임</h1>
    </main>
  );
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root 요소가 없습니다');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/styles.css` (전역: 색 변수, 화면 높이, 칠판용 글자 크기, 브라우저 터치 동작 차단):

```css
:root {
  --bg: #fff7ec;
  --panel: #ffffff;
  --ink: #2b2118;
  --ink-soft: #6b5b4b;
  --ink-faint: #a89a8a;
  --target: #ede3d3;
  --target-edge: #5b4a3a;
  --margin-cell: #f7f0e4;
  --grid-line: #d9ccb8;
  --tray: #f3eadb;
  --ok: #27ae60;
  --warn: #e5483b;
}

html,
body,
#root,
.app {
  height: 100%;
  margin: 0;
}

/* 칠판(1~3m 거리)에서 읽히도록 화면 짧은 변에 비례 */
html {
  font-size: calc(10px + 1.4vmin);
}

body {
  background: var(--bg);
  color: var(--ink);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

button,
input {
  font: inherit;
  color: inherit;
}

input {
  -webkit-user-select: text;
  user-select: text;
}
```

- [ ] **Step 6: 전체 검증**

Run: `npm run lint && npm test && npm run build`
Expected: lint 에러 없음, `1 passed`, `dist/assets/`에 `index-legacy-*.js`와 `polyfills-legacy-*.js`가 생긴다.

Run: `grep -c nomodule dist/index.html`
Expected: 1 이상 (구형 브라우저용 스크립트 주입됨)

- [ ] **Step 7: 커밋**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts eslint.config.js index.html src
git commit -m "chore: Vite+React+TS 프로젝트 셋업 (legacy 빌드, Vitest, ESLint)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 기기 진단 페이지

**Files:**
- Create: `public/check.html`
- Test: `src/checkPage.test.ts`

**Interfaces:**
- Produces: 배포 후 `/boardgame/check.html` — 칠판의 브라우저·화면·동시 터치 수를 보여주고 복사용 보고서(`#report`)를 만든다. 메뉴의 "기기 확인" 링크(Task 14)가 여기로 온다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/checkPage.test.ts` (`?raw`로 HTML을 문자열로 읽어 ES5 문법 검사 + jsdom에서 실행):

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import html from '../public/check.html?raw';

function section(re: RegExp): string {
  const m = html.match(re);
  if (!m) throw new Error(`check.html에서 찾지 못함: ${re}`);
  return m[1];
}

const script = section(/<script>([\s\S]*?)<\/script>/);
const body = section(/<body>([\s\S]*?)<script>/);

describe('check.html (기기 진단 페이지)', () => {
  it('인라인 스크립트에 ES5 이후 문법이 없다', () => {
    expect(script).not.toMatch(/=>/);
    expect(script).not.toMatch(/`/);
    expect(script).not.toMatch(/\b(let|const|class)\s/);
    expect(script).not.toMatch(/\.\.\./);
    expect(script).not.toMatch(/\bfor\s*\([^)]*\sof\s/);
  });

  describe('실행', () => {
    beforeEach(() => {
      document.body.innerHTML = body;
      new Function(script)();
    });

    it('기기 정보를 표로 보여준다', () => {
      const text = document.getElementById('rows')?.textContent ?? '';
      expect(text).toContain('Chrome 버전');
      expect(text).toContain('maxTouchPoints');
      expect(text).toContain('devicePixelRatio');
    });

    it('복사용 보고서에 정보가 들어간다', () => {
      const report = document.getElementById('report') as HTMLTextAreaElement;
      expect(report.value).toContain('브라우저: ');
      expect(report.value).toContain('최대 동시 터치: 0');
    });

    it('터치 영역을 누르면 동시 터치 수를 센다', () => {
      const pad = document.getElementById('pad') as HTMLElement;
      pad.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, bubbles: true }));
      expect(document.getElementById('count')?.textContent).toBe('지금 1개 / 최대 1개');
      const report = document.getElementById('report') as HTMLTextAreaElement;
      expect(report.value).toContain('최대 동시 터치: 1');
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/checkPage.test.ts`
Expected: FAIL — `../public/check.html?raw`를 찾지 못함

- [ ] **Step 3: 구현**

`public/check.html`:

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>기기 확인 - 우리집 보드게임</title>
<style>
  html, body { margin: 0; height: 100%; }
  body { background: #fff7ec; color: #2b2118; font-family: sans-serif; font-size: 22px; overflow: hidden; touch-action: none; -webkit-user-select: none; user-select: none; }
  #info { position: absolute; top: 0; left: 0; width: 46%; height: 100%; overflow: auto; padding: 16px; box-sizing: border-box; touch-action: pan-y; }
  #pad { position: absolute; top: 0; right: 0; width: 54%; height: 100%; background: #ffffff; border-left: 4px solid #2b2118; overflow: hidden; }
  h1 { margin: 0 0 12px 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #d9ccb8; vertical-align: top; word-break: break-all; }
  th { width: 38%; color: #6b5b4b; font-weight: normal; }
  .yes { color: #27ae60; font-weight: bold; }
  .no { color: #e5483b; font-weight: bold; }
  #count { position: absolute; top: 16px; left: 16px; font-size: 40px; font-weight: bold; pointer-events: none; }
  .dot { position: absolute; width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 45px; opacity: 0.8; pointer-events: none; }
  button { font-size: 22px; padding: 12px 20px; margin: 12px 8px 0 0; border: 3px solid #2b2118; background: #ffffff; border-radius: 12px; }
  textarea { width: 100%; height: 160px; font-size: 16px; margin-top: 8px; box-sizing: border-box; }
</style>
</head>
<body>
<div id="info">
  <h1>기기 확인</h1>
  <table id="rows"></table>
  <button id="fs" type="button">전체화면 시험</button>
  <button id="home" type="button">게임으로</button>
  <p>아래 내용을 그대로 알려주세요.</p>
  <textarea id="report" readonly></textarea>
</div>
<div id="pad"><div id="count">손가락을 여러 개 대 보세요</div></div>
<script>
(function () {
  'use strict';
  var nav = window.navigator;
  var ua = nav.userAgent;
  var root = document.documentElement;
  var maxSeen = 0;

  function find(re) {
    var m = ua.match(re);
    return m ? m[1] : '알 수 없음';
  }

  function yesNo(v) {
    return v ? '있음' : '없음';
  }

  function storageWorks() {
    try {
      window.localStorage.setItem('__check', '1');
      window.localStorage.removeItem('__check');
      return true;
    } catch (e) {
      return false;
    }
  }

  function collect() {
    return [
      ['브라우저', ua],
      ['Chrome 버전', find(/Chrome\/([\d.]+)/)],
      ['Android 버전', find(/Android ([\d.]+)/)],
      ['WebView 여부', /; wv\)/.test(ua) ? '예' : '아니오'],
      ['화면 크기(screen)', screen.width + ' x ' + screen.height],
      ['보이는 크기(viewport)', window.innerWidth + ' x ' + window.innerHeight],
      ['devicePixelRatio', String(window.devicePixelRatio || 1)],
      ['maxTouchPoints', nav.maxTouchPoints === undefined ? '알 수 없음' : String(nav.maxTouchPoints)],
      ['PointerEvent', yesNo('PointerEvent' in window)],
      ['전체화면 API', yesNo(!!(root.requestFullscreen || root.webkitRequestFullscreen))],
      ['localStorage', yesNo(storageWorks())],
      ['WebAudio', yesNo(!!(window.AudioContext || window.webkitAudioContext))],
      ['ES 모듈', yesNo('noModule' in document.createElement('script'))],
      ['CSS 변수', yesNo(!!(window.CSS && CSS.supports && CSS.supports('--a', '0')))]
    ];
  }

  function render() {
    var rows = collect();
    var table = document.getElementById('rows');
    var lines = [];
    var i, tr, th, td;
    while (table.firstChild) table.removeChild(table.firstChild);
    for (i = 0; i < rows.length; i++) {
      tr = document.createElement('tr');
      th = document.createElement('th');
      td = document.createElement('td');
      th.textContent = rows[i][0];
      td.textContent = rows[i][1];
      if (rows[i][1] === '있음') td.className = 'yes';
      if (rows[i][1] === '없음') td.className = 'no';
      tr.appendChild(th);
      tr.appendChild(td);
      table.appendChild(tr);
      lines.push(rows[i][0] + ': ' + rows[i][1]);
    }
    lines.push('최대 동시 터치: ' + maxSeen);
    document.getElementById('report').value = lines.join('\n');
  }

  var pad = document.getElementById('pad');
  var countEl = document.getElementById('count');
  var colors = ['#e5483b', '#2f80ed', '#27ae60', '#f2994a', '#eb5fa0', '#2bb5b5', '#f2c94c', '#8d6e63', '#9bc53d', '#1b4f72'];

  function draw(points) {
    var old = pad.querySelectorAll('.dot');
    var rect = pad.getBoundingClientRect();
    var i, d;
    for (i = 0; i < old.length; i++) pad.removeChild(old[i]);
    for (i = 0; i < points.length; i++) {
      d = document.createElement('div');
      d.className = 'dot';
      d.style.left = (points[i].clientX - rect.left) + 'px';
      d.style.top = (points[i].clientY - rect.top) + 'px';
      d.style.background = colors[i % colors.length];
      pad.appendChild(d);
    }
    if (points.length > maxSeen) maxSeen = points.length;
    countEl.textContent = '지금 ' + points.length + '개 / 최대 ' + maxSeen + '개';
    render();
  }

  function onTouch(e) {
    e.preventDefault();
    draw(e.touches);
  }

  pad.addEventListener('touchstart', onTouch, { passive: false });
  pad.addEventListener('touchmove', onTouch, { passive: false });
  pad.addEventListener('touchend', onTouch, { passive: false });
  pad.addEventListener('touchcancel', onTouch, { passive: false });
  pad.addEventListener('mousedown', function (e) {
    draw([{ clientX: e.clientX, clientY: e.clientY }]);
  });
  pad.addEventListener('mouseup', function () {
    draw([]);
  });

  document.getElementById('fs').addEventListener('click', function () {
    var inFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (inFs) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else if (root.requestFullscreen) {
      root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    }
  });

  document.getElementById('home').addEventListener('click', function () {
    window.location.href = './';
  });

  window.addEventListener('resize', render);
  render();
})();
</script>
</body>
</html>
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/checkPage.test.ts`
Expected: PASS (4 tests)

Run: `npm run dev` 후 브라우저에서 `http://localhost:5173/boardgame/check.html` 열기 → 표가 보이고, 오른쪽을 마우스로 누르면 "지금 1개 / 최대 1개".

- [ ] **Step 5: 커밋**

```bash
git add public/check.html src/checkPage.test.ts
git commit -m "feat: 칠판 사양 확인용 기기 진단 페이지" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: GitHub 저장소, 자동 배포, 칠판 진단

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `docs/ADR.md` (ADR-006 추가), 필요하면 `vite.config.ts`의 legacy `targets`

**Interfaces:**
- Produces: `main`에 push하면 lint·test·build 후 `https://paurrr.github.io/boardgame/`에 배포

- [ ] **Step 1: 배포 워크플로 작성**

`.github/workflows/deploy.yml`:

```yaml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: 커밋**

```bash
git add .github/workflows/deploy.yml
git commit -m "chore: GitHub Pages 자동 배포 워크플로" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: 사용자 확인 (필수)**

다음을 사용자에게 보여주고 진행 여부를 묻는다: "GitHub `Paurrr` 계정에 **공개** 저장소 `boardgame`을 만들고 지금까지의 커밋(설계 문서, CLAUDE.md, scripts/ 포함)을 올립니다. 무료 GitHub Pages는 공개 저장소여야 합니다. 진행할까요?" — 거절하면 여기서 멈춘다.

- [ ] **Step 4: 저장소 생성, Pages 켜기, 배포**

```bash
gh repo create boardgame --public --source . --remote origin --push
gh api -X POST repos/Paurrr/boardgame/pages -f build_type=workflow
gh workflow run deploy.yml
gh run watch
```

첫 push로 시작된 실행은 Pages가 꺼져 있어 deploy 단계에서 실패할 수 있다. 위 순서대로 Pages를 켠 뒤 다시 실행한 결과가 성공이면 된다.

Run: `curl -s -o /dev/null -w "%{http_code}" https://paurrr.github.io/boardgame/check.html`
Expected: `200` (반영까지 1~2분 걸릴 수 있다)

- [ ] **Step 5: 칠판 진단 (사용자 작업)**

사용자에게 요청: "칠판 브라우저에서 `paurrr.github.io/boardgame/check.html`을 열고, 오른쪽 흰 영역에 손가락을 최대한 여러 개 동시에 대 본 뒤, 아래 상자의 글을 그대로 보내 주세요. 전체화면 시험 버튼도 눌러 봐 주세요."

- [ ] **Step 6: 결과에 따라 결정하고 기록**

| 진단 결과 | 조치 |
|---|---|
| Chrome 61 이상 | `targets` 유지 |
| Chrome 55~60 | `vite.config.ts`의 `targets`를 `['chrome >= <버전>', 'android >= <버전>']`, `cssTarget`을 `'chrome<버전>'`으로 낮추고 재빌드·재배포 후 check.html·메인 페이지가 열리는지 다시 확인 |
| Chrome 55 미만 또는 PointerEvent 없음 | 구현을 멈추고 사용자와 플랜 B(미니PC를 HDMI+USB 터치로 연결) 논의 |
| 최대 동시 터치 4 미만 | Task 10에서 `blocksGame.maxPlayers`를 (최대 동시 터치 수, 최소 1)로 낮춘다 |
| 전체화면 API 없음 | 문제 없음 (버튼이 숨겨진다) |

`docs/ADR.md` 끝에 추가 (값은 실제 진단 결과로 채운다):

```markdown
### ADR-006: 칠판 브라우저 호환 대상
**결정**: legacy targets `chrome >= <확정 버전>`, 최대 인원 <N>명.
**근거(2026-xx-xx 칠판 진단)**: <check.html 보고서 붙여넣기>
**트레이드오프**: <예: 없음 / 인원 제한>
```

- [ ] **Step 7: 커밋·배포**

```bash
git add docs/ADR.md vite.config.ts
git commit -m "docs: 칠판 진단 결과와 브라우저 호환 대상 기록" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

---

### Task 4: 시드 난수와 난이도 타입

**Files:**
- Create: `src/lib/difficulty.ts`, `src/lib/random.ts`
- Test: `src/lib/random.test.ts`

**Interfaces:**
- Produces:
  - `type Difficulty = 'easy' | 'normal' | 'hard'`, `DIFFICULTIES: readonly Difficulty[]`, `DIFFICULTY_LABEL: Record<Difficulty, string>`(쉬움/보통/어려움), `isDifficulty(v: unknown): v is Difficulty`
  - `type Rng = { next(): number; int(maxExclusive): number; pick<T>(items: readonly T[]): T; shuffle<T>(items: readonly T[]): T[] }`
  - `createRng(seed: number): Rng`, `deriveSeed(...parts: number[]): number`, `randomSeed(): number`

- [ ] **Step 1: 난이도 타입 작성** (타입·상수만이라 테스트 없이 다음 테스트들에서 함께 쓰인다)

`src/lib/difficulty.ts`:

```ts
export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard';
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/lib/random.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed } from './random';

describe('createRng', () => {
  it('같은 시드는 같은 수열을 만든다', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    const ys = Array.from({ length: 5 }, () => b.next());
    expect(xs).toEqual(ys);
  });

  it('다른 시드는 다른 수열을 만든다', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('next는 0 이상 1 미만이다', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n)은 0부터 n-1까지의 정수를 고르게 낸다', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(4);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('pick은 빈 배열이면 에러를 던진다', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });

  it('shuffle은 원본을 바꾸지 않고 순열을 돌려준다', () => {
    const src = [1, 2, 3, 4, 5];
    const out = createRng(3).shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('deriveSeed', () => {
  it('같은 입력이면 같은 시드', () => {
    expect(deriveSeed(1, 2, 3)).toBe(deriveSeed(1, 2, 3));
  });

  it('순서가 다르면 다른 시드', () => {
    expect(deriveSeed(1, 2, 3)).not.toBe(deriveSeed(3, 2, 1));
  });

  it('32비트 부호 없는 정수를 돌려준다', () => {
    const s = deriveSeed(123456789, 5, 0);
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/random.test.ts`
Expected: FAIL — `Failed to resolve import "./random"`

- [ ] **Step 4: 구현**

`src/lib/random.ts`:

```ts
export type Rng = {
  /** 0 이상 1 미만 */
  next(): number;
  /** 0 이상 maxExclusive 미만 정수 */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** 원본을 바꾸지 않은 섞인 복사본 */
  shuffle<T>(items: readonly T[]): T[];
};

/** mulberry32: 같은 시드면 같은 수열 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(maxExclusive: number): number {
    return Math.floor(next() * maxExclusive);
  }

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('빈 배열에서 고를 수 없습니다');
    return items[int(items.length)];
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  return { next, int, pick, shuffle };
}

/** 여러 정수를 섞어 32비트 시드 하나로 만든다 (FNV-1a) */
export function deriveSeed(...parts: number[]): number {
  let h = 2166136261;
  for (const part of parts) {
    let v = part >>> 0;
    for (let i = 0; i < 4; i++) {
      h ^= v & 0xff;
      h = Math.imul(h, 16777619) >>> 0;
      v >>>= 8;
    }
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run src/lib/random.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/difficulty.ts src/lib/random.ts src/lib/random.test.ts
git commit -m "feat: 시드 난수와 난이도 타입" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 모양·변환·조각 정의

**Files:**
- Create: `src/games/blocks/logic/types.ts`, `shape.ts`, `transform.ts`, `pieces.ts`
- Test: `src/games/blocks/logic/shape.test.ts`, `transform.test.ts`, `pieces.test.ts`

**Interfaces:**
- Produces:
  - 타입: `Cell {x,y}`, `PieceId`(`'I3'|'L3'|'I4'|'O4'|'T4'|'L4'|'S4'|'P5'|'L5'|'U5'`), `Rotation`(0~3), `Orientation {rotation, flipped}`, `Placement {pieceId, orientation, at}`, `PlaceMode`(`'inside'|'free'`), `Puzzle {target, pieceIds, solution}`, `BoardArea {width, height, target}`
  - `shape.ts`: `cellKey(c)`, `neighbors(c)`, `normalize(cells)`(최소 (0,0), y→x 정렬), `shapeSize(cells) → {w,h}`, `isConnected(cells)`, `hasHoles(cells)`, `outlineSegments(cells)`, `outlinePath(cells) → SVG path`
  - `transform.ts`: `rotateCW`, `flipH`, `orient(cells, o)`(뒤집기→회전), `shapeKey`, `uniqueOrientations(cells, allowFlip)`, `rotateOrientation(o)`, `flipOrientation(o)` — 뒤의 둘은 "지금 보이는 모양"을 돌리고/뒤집은 방향을 준다
  - `pieces.ts`: `PIECES: Record<PieceId, {id, cells, color}>`, `PIECE_IDS`, `PENTOMINO_IDS`, `SMALL_PIECE_IDS`(7종), `MAX_PIECE_EXTENT = 4`

- [ ] **Step 1: 타입 작성**

`src/games/blocks/logic/types.ts`:

```ts
export type Cell = { x: number; y: number };

export type PieceId = 'I3' | 'L3' | 'I4' | 'O4' | 'T4' | 'L4' | 'S4' | 'P5' | 'L5' | 'U5';

export type Rotation = 0 | 1 | 2 | 3;

/** 기본 모양에 (뒤집기 →) 시계방향 90° × rotation 순서로 적용한다 */
export type Orientation = { rotation: Rotation; flipped: boolean };

/** at = 방향을 적용해 정규화한 모양의 (0,0) 칸이 놓이는 판 좌표 */
export type Placement = { pieceId: PieceId; orientation: Orientation; at: Cell };

/** inside: 목표 모양 안에만 놓임(쉬움), free: 판 격자 안이면 어디든(보통·어려움) */
export type PlaceMode = 'inside' | 'free';

/** target은 (0,0) 기준으로 정규화돼 있고, solution은 target 좌표계다 */
export type Puzzle = { target: Cell[]; pieceIds: PieceId[]; solution: Placement[] };

/** 퍼즐판 격자 = 목표 바운딩박스 + 사방 여유 칸. target은 판 좌표다 */
export type BoardArea = { width: number; height: number; target: Cell[] };
```

- [ ] **Step 2: shape 테스트 작성 → 실패 확인**

`src/games/blocks/logic/shape.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cellKey, hasHoles, isConnected, normalize, outlinePath, outlineSegments, shapeSize } from './shape';
import type { Cell } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

describe('cellKey', () => {
  it('좌표를 문자열 키로 만든다', () => {
    expect(cellKey({ x: 3, y: -2 })).toBe('3,-2');
  });
});

describe('normalize', () => {
  it('최소 좌표를 (0,0)으로 옮기고 y, x 순으로 정렬한다', () => {
    expect(normalize(cells([[5, 3], [4, 4], [4, 3]]))).toEqual(cells([[0, 0], [1, 0], [0, 1]]));
  });

  it('음수 좌표도 옮긴다', () => {
    expect(normalize(cells([[-2, -1], [-1, -1]]))).toEqual(cells([[0, 0], [1, 0]]));
  });

  it('빈 배열은 빈 배열', () => {
    expect(normalize([])).toEqual([]);
  });
});

describe('shapeSize', () => {
  it('바운딩박스 가로세로를 구한다', () => {
    expect(shapeSize(cells([[0, 0], [2, 0], [2, 1]]))).toEqual({ w: 3, h: 2 });
  });
});

describe('isConnected', () => {
  it('변으로 이어진 모양은 true', () => {
    expect(isConnected(cells([[0, 0], [0, 1], [1, 1]]))).toBe(true);
  });

  it('대각선으로만 닿은 모양은 false', () => {
    expect(isConnected(cells([[0, 0], [1, 1]]))).toBe(false);
  });
});

describe('hasHoles', () => {
  it('가운데가 빈 고리는 구멍이 있다', () => {
    const ring = cells([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]);
    expect(hasHoles(ring)).toBe(true);
  });

  it('꽉 찬 사각형은 구멍이 없다', () => {
    expect(hasHoles(cells([[0, 0], [1, 0], [0, 1], [1, 1]]))).toBe(false);
  });

  it('한쪽이 열린 U 모양은 구멍이 없다', () => {
    expect(hasHoles(cells([[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]))).toBe(false);
  });
});

describe('outlineSegments', () => {
  it('한 칸은 테두리 4개', () => {
    expect(outlineSegments(cells([[0, 0]]))).toHaveLength(4);
  });

  it('가로 2칸은 맞닿은 변을 빼고 6개', () => {
    expect(outlineSegments(cells([[0, 0], [1, 0]]))).toHaveLength(6);
  });

  it('2x2는 바깥 변 8개', () => {
    expect(outlineSegments(cells([[0, 0], [1, 0], [0, 1], [1, 1]]))).toHaveLength(8);
  });
});

describe('outlinePath', () => {
  it('SVG path 문자열을 만든다', () => {
    expect(outlinePath(cells([[0, 0]]))).toBe('M0 0L1 0M1 0L1 1M0 1L1 1M0 0L0 1');
  });
});
```

Run: `npx vitest run src/games/blocks/logic/shape.test.ts`
Expected: FAIL — `Failed to resolve import "./shape"`

- [ ] **Step 3: shape 구현 → 통과 확인**

`src/games/blocks/logic/shape.ts`:

```ts
import type { Cell } from './types';

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export function cellKey(c: Cell): string {
  return c.x + ',' + c.y;
}

export function neighbors(c: Cell): Cell[] {
  return [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 },
  ];
}

function bounds(cells: readonly Cell[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cells) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  }
  return { minX, minY, maxX, maxY };
}

/** 최소 좌표를 (0,0)으로 옮기고 y, x 순으로 정렬한 새 배열 */
export function normalize(cells: readonly Cell[]): Cell[] {
  if (cells.length === 0) return [];
  const { minX, minY } = bounds(cells);
  return cells
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

export function shapeSize(cells: readonly Cell[]): { w: number; h: number } {
  if (cells.length === 0) return { w: 0, h: 0 };
  const { minX, minY, maxX, maxY } = bounds(cells);
  return { w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function isConnected(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const all = new Set(cells.map(cellKey));
  const seen = new Set<string>([cellKey(cells[0])]);
  const stack: Cell[] = [cells[0]];
  while (stack.length > 0) {
    const c = stack.pop() as Cell;
    for (const n of neighbors(c)) {
      const k = cellKey(n);
      if (all.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  return seen.size === all.size;
}

/** 사방이 막힌 빈칸이 있으면 true */
export function hasHoles(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const filled = new Set(cells.map(cellKey));
  const { minX, minY, maxX, maxY } = bounds(cells);
  // 바운딩박스를 한 칸 넓힌 영역에서 바깥 빈칸을 모두 칠한다
  const start = { x: minX - 1, y: minY - 1 };
  const outside = new Set<string>([cellKey(start)]);
  const stack: Cell[] = [start];
  while (stack.length > 0) {
    const c = stack.pop() as Cell;
    for (const n of neighbors(c)) {
      if (n.x < minX - 1 || n.x > maxX + 1 || n.y < minY - 1 || n.y > maxY + 1) continue;
      const k = cellKey(n);
      if (filled.has(k) || outside.has(k)) continue;
      outside.add(k);
      stack.push(n);
    }
  }
  const total = (maxX - minX + 3) * (maxY - minY + 3);
  return filled.size + outside.size < total;
}

/** 다른 칸과 맞닿지 않은 변들 = 바깥 테두리 */
export function outlineSegments(cells: readonly Cell[]): Segment[] {
  const set = new Set(cells.map(cellKey));
  const has = (x: number, y: number) => set.has(cellKey({ x, y }));
  const segs: Segment[] = [];
  for (const { x, y } of cells) {
    if (!has(x, y - 1)) segs.push({ x1: x, y1: y, x2: x + 1, y2: y });
    if (!has(x + 1, y)) segs.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 });
    if (!has(x, y + 1)) segs.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1 });
    if (!has(x - 1, y)) segs.push({ x1: x, y1: y, x2: x, y2: y + 1 });
  }
  return segs;
}

export function outlinePath(cells: readonly Cell[]): string {
  return outlineSegments(cells)
    .map((s) => 'M' + s.x1 + ' ' + s.y1 + 'L' + s.x2 + ' ' + s.y2)
    .join('');
}
```

Run: `npx vitest run src/games/blocks/logic/shape.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 4: transform 테스트 작성 → 실패 확인**

`src/games/blocks/logic/transform.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalize } from './shape';
import {
  flipH,
  flipOrientation,
  orient,
  rotateCW,
  rotateOrientation,
  shapeKey,
  uniqueOrientations,
} from './transform';
import type { Cell, Orientation, Rotation } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

const LINE3 = cells([[0, 0], [1, 0], [2, 0]]);
const SQUARE = cells([[0, 0], [1, 0], [0, 1], [1, 1]]);
const LINE4 = cells([[0, 0], [1, 0], [2, 0], [3, 0]]);
const TEE = cells([[0, 0], [1, 0], [2, 0], [1, 1]]);
const ELL = cells([[0, 0], [0, 1], [0, 2], [1, 2]]);
const ESS = cells([[1, 0], [2, 0], [0, 1], [1, 1]]);

const ALL_ORIENTATIONS: Orientation[] = [false, true].flatMap((flipped) =>
  ([0, 1, 2, 3] as Rotation[]).map((rotation) => ({ rotation, flipped })),
);

describe('rotateCW', () => {
  it('가로 막대를 세로로 세운다', () => {
    expect(rotateCW(LINE3)).toEqual(cells([[0, 0], [0, 1], [0, 2]]));
  });

  it('L을 시계방향으로 돌린다', () => {
    // ■        ■■■
    // ■   →    ■
    // ■■
    expect(rotateCW(ELL)).toEqual(cells([[0, 0], [1, 0], [2, 0], [0, 1]]));
  });

  it('네 번 돌리면 원래대로', () => {
    expect(rotateCW(rotateCW(rotateCW(rotateCW(ELL))))).toEqual(normalize(ELL));
  });
});

describe('flipH', () => {
  it('좌우로 뒤집는다', () => {
    expect(flipH(ELL)).toEqual(cells([[1, 0], [1, 1], [0, 2], [1, 2]]));
  });

  it('두 번 뒤집으면 원래대로', () => {
    expect(flipH(flipH(ESS))).toEqual(normalize(ESS));
  });
});

describe('orient', () => {
  it('기본 방향은 정규화한 원래 모양', () => {
    expect(orient(ELL, { rotation: 0, flipped: false })).toEqual(normalize(ELL));
  });

  it('뒤집은 뒤 돌린다', () => {
    expect(orient(ELL, { rotation: 1, flipped: true })).toEqual(rotateCW(flipH(ELL)));
  });
});

describe('uniqueOrientations', () => {
  it.each([
    ['정사각형', SQUARE, 1, 1],
    ['막대', LINE4, 2, 2],
    ['T', TEE, 4, 4],
    ['L', ELL, 8, 4],
    ['S', ESS, 4, 2],
  ])('%s: 뒤집기 포함 %i가지, 회전만 %i가지', (_name, shape, withFlip, rotateOnly) => {
    expect(uniqueOrientations(shape, true)).toHaveLength(withFlip);
    expect(uniqueOrientations(shape, false)).toHaveLength(rotateOnly);
  });

  it('회전만 허용하면 뒤집힌 방향이 없다', () => {
    expect(uniqueOrientations(ELL, false).every((o) => !o.flipped)).toBe(true);
  });

  it('서로 다른 모양만 남긴다', () => {
    const keys = uniqueOrientations(ELL, true).map((o) => shapeKey(orient(ELL, o)));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('rotateOrientation / flipOrientation', () => {
  it.each(ALL_ORIENTATIONS)('돌리기는 지금 보이는 모양을 시계방향으로 돌린다 (%o)', (o) => {
    expect(orient(ELL, rotateOrientation(o))).toEqual(rotateCW(orient(ELL, o)));
  });

  it.each(ALL_ORIENTATIONS)('뒤집기는 지금 보이는 모양을 좌우로 뒤집는다 (%o)', (o) => {
    expect(orient(ELL, flipOrientation(o))).toEqual(flipH(orient(ELL, o)));
  });
});
```

Run: `npx vitest run src/games/blocks/logic/transform.test.ts`
Expected: FAIL — `Failed to resolve import "./transform"`

- [ ] **Step 5: transform 구현 → 통과 확인**

`src/games/blocks/logic/transform.ts`:

```ts
import { cellKey, normalize } from './shape';
import type { Cell, Orientation, Rotation } from './types';

const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3];

/** 화면 좌표(y가 아래로 증가) 기준 시계방향 90° */
export function rotateCW(cells: readonly Cell[]): Cell[] {
  return normalize(cells.map((c) => ({ x: -c.y, y: c.x })));
}

/** 좌우 뒤집기 */
export function flipH(cells: readonly Cell[]): Cell[] {
  return normalize(cells.map((c) => ({ x: -c.x, y: c.y })));
}

/** 뒤집기 → 회전 순서로 적용한 정규화된 모양 */
export function orient(cells: readonly Cell[], o: Orientation): Cell[] {
  let out = o.flipped ? flipH(cells) : normalize(cells);
  for (let i = 0; i < o.rotation; i++) out = rotateCW(out);
  return out;
}

export function shapeKey(cells: readonly Cell[]): string {
  return normalize(cells).map(cellKey).join(';');
}

/** 모양이 서로 다른 방향만 돌려준다 (회전 대칭 조각은 줄어든다) */
export function uniqueOrientations(cells: readonly Cell[], allowFlip: boolean): Orientation[] {
  const seen = new Set<string>();
  const out: Orientation[] = [];
  const flips = allowFlip ? [false, true] : [false];
  for (const flipped of flips) {
    for (const rotation of ROTATIONS) {
      const o = { rotation, flipped };
      const key = shapeKey(orient(cells, o));
      if (!seen.has(key)) {
        seen.add(key);
        out.push(o);
      }
    }
  }
  return out;
}

/** 지금 보이는 모양을 시계방향으로 한 번 더 돌린 방향 */
export function rotateOrientation(o: Orientation): Orientation {
  return { rotation: ((o.rotation + 1) % 4) as Rotation, flipped: o.flipped };
}

/** 지금 보이는 모양을 좌우로 뒤집은 방향 (flipH ∘ rotate^r = rotate^-r ∘ flipH) */
export function flipOrientation(o: Orientation): Orientation {
  return { rotation: ((4 - o.rotation) % 4) as Rotation, flipped: !o.flipped };
}
```

Run: `npx vitest run src/games/blocks/logic/transform.test.ts`
Expected: PASS (30 tests)

- [ ] **Step 6: pieces 테스트 작성 → 실패 확인**

`src/games/blocks/logic/pieces.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_PIECE_EXTENT, PENTOMINO_IDS, PIECE_IDS, PIECES, SMALL_PIECE_IDS } from './pieces';
import { isConnected, normalize, shapeSize } from './shape';
import { orient, uniqueOrientations } from './transform';

describe('PIECES', () => {
  it('10종이고 키와 id가 같다', () => {
    expect(PIECE_IDS).toHaveLength(10);
    for (const id of PIECE_IDS) expect(PIECES[id].id).toBe(id);
  });

  it.each(PIECE_IDS)('%s: 이름의 숫자만큼 칸이 있다', (id) => {
    expect(PIECES[id].cells).toHaveLength(Number(id[1]));
  });

  it.each(PIECE_IDS)('%s: 정규화돼 있고 이어져 있다', (id) => {
    const { cells } = PIECES[id];
    expect(cells).toEqual(normalize(cells));
    expect(isConnected(cells)).toBe(true);
  });

  it('색이 모두 다르다', () => {
    const colors = PIECE_IDS.map((id) => PIECES[id].color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it.each(PIECE_IDS)('%s: 어느 방향이든 MAX_PIECE_EXTENT 안에 들어간다', (id) => {
    for (const o of uniqueOrientations(PIECES[id].cells, true)) {
      const { w, h } = shapeSize(orient(PIECES[id].cells, o));
      expect(Math.max(w, h)).toBeLessThanOrEqual(MAX_PIECE_EXTENT);
    }
  });

  it('작은 조각은 펜토미노를 뺀 7종', () => {
    expect(SMALL_PIECE_IDS).toHaveLength(7);
    for (const id of PENTOMINO_IDS) expect(SMALL_PIECE_IDS).not.toContain(id);
  });
});
```

Run: `npx vitest run src/games/blocks/logic/pieces.test.ts`
Expected: FAIL — `Failed to resolve import "./pieces"`

- [ ] **Step 7: pieces 구현 → 통과 확인**

`src/games/blocks/logic/pieces.ts`:

```ts
import type { Cell, PieceId } from './types';

export type PieceDef = { id: PieceId; cells: Cell[]; color: string };

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

/** 자체 정의 폴리오미노 10종. 색은 docs/UI_GUIDE.md 조각 색 */
export const PIECES: Record<PieceId, PieceDef> = {
  I3: { id: 'I3', color: '#E5483B', cells: cells([[0, 0], [1, 0], [2, 0]]) },
  L3: { id: 'L3', color: '#F2C94C', cells: cells([[0, 0], [0, 1], [1, 1]]) },
  I4: { id: 'I4', color: '#2F80ED', cells: cells([[0, 0], [1, 0], [2, 0], [3, 0]]) },
  O4: { id: 'O4', color: '#F2994A', cells: cells([[0, 0], [1, 0], [0, 1], [1, 1]]) },
  T4: { id: 'T4', color: '#27AE60', cells: cells([[0, 0], [1, 0], [2, 0], [1, 1]]) },
  L4: { id: 'L4', color: '#EB5FA0', cells: cells([[0, 0], [0, 1], [0, 2], [1, 2]]) },
  S4: { id: 'S4', color: '#2BB5B5', cells: cells([[1, 0], [2, 0], [0, 1], [1, 1]]) },
  P5: { id: 'P5', color: '#8D6E63', cells: cells([[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]) },
  L5: { id: 'L5', color: '#9BC53D', cells: cells([[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]]) },
  U5: { id: 'U5', color: '#1B4F72', cells: cells([[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) },
};

export const PIECE_IDS: readonly PieceId[] = ['I3', 'L3', 'I4', 'O4', 'T4', 'L4', 'S4', 'P5', 'L5', 'U5'];

export const PENTOMINO_IDS: readonly PieceId[] = ['P5', 'L5', 'U5'];

export const SMALL_PIECE_IDS: readonly PieceId[] = PIECE_IDS.filter((id) => !PENTOMINO_IDS.includes(id));

/** 어떤 조각이든 어느 방향으로 돌려도 이 크기의 정사각형 안에 들어간다 */
export const MAX_PIECE_EXTENT = 4;
```

Run: `npx vitest run src/games/blocks/logic`
Expected: PASS (shape 14 + transform 30 + pieces 33)

- [ ] **Step 8: 커밋**

```bash
git add src/games/blocks/logic
git commit -m "feat: 블록 퍼즐 모양·회전·뒤집기와 조각 10종" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 판 규칙 (놓기·정답·제자리 회전)

**Files:**
- Create: `src/games/blocks/logic/board.ts`
- Test: `src/games/blocks/logic/board.test.ts`

**Interfaces:**
- Consumes: `PIECES`(Task 5), `orient`, `rotateOrientation`, `flipOrientation`, `normalize`, `shapeSize`, `cellKey`, `Difficulty`(Task 4)
- Produces:
  - `BOARD_MARGIN: Record<Difficulty, number>` (쉬움 0, 보통·어려움 2)
  - `placeModeOf(d): PlaceMode` (쉬움 `inside`, 나머지 `free`)
  - `placedCells(p: Placement): Cell[]`
  - `boardAreaFor(target, d): BoardArea` — 목표를 정규화하고 여유 칸만큼 옮긴 판
  - `canPlace(area, others, p, mode): boolean` — `others`에는 지금 옮기는 조각을 빼고 넘긴다
  - `isSolved(target, placements): boolean` — 목표 전부 덮음 && 목표 밖 칸 없음
  - `rotatePlacement(p)` — 가운데가 제자리에 머물도록 `at` 보정, 네 번 돌리면 원위치
  - `flipPlacement(p)` — `at` 그대로

- [ ] **Step 1: 실패하는 테스트 작성**

`src/games/blocks/logic/board.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BOARD_MARGIN,
  boardAreaFor,
  canPlace,
  flipPlacement,
  isSolved,
  placedCells,
  placeModeOf,
  rotatePlacement,
} from './board';
import { PIECE_IDS } from './pieces';
import type { BoardArea, Cell, Placement } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));
const BASE = { rotation: 0, flipped: false } as const;
const at = (x: number, y: number): Cell => ({ x, y });

// 목표: 가로 I3 한 줄 + 그 아래 L3 = 6칸, 판 5x4(여유 칸 포함)
//   x: 0 1 2 3 4
// y0   . . . . .
// y1   . ■ ■ ■ .
// y2   . ■ . . .
// y3   . ■ ■ . .
const AREA: BoardArea = { width: 5, height: 4, target: cells([[1, 1], [2, 1], [3, 1], [1, 2], [1, 3], [2, 3]]) };

describe('placedCells', () => {
  it('방향을 적용한 모양을 at만큼 옮긴다', () => {
    expect(placedCells({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: at(2, 5) })).toEqual(
      cells([[2, 5], [2, 6], [2, 7]]),
    );
  });
});

describe('placeModeOf', () => {
  it('쉬움은 inside, 보통·어려움은 free', () => {
    expect(placeModeOf('easy')).toBe('inside');
    expect(placeModeOf('normal')).toBe('free');
    expect(placeModeOf('hard')).toBe('free');
  });
});

describe('boardAreaFor', () => {
  const target = cells([[0, 0], [1, 0], [2, 0], [0, 1]]);

  it('쉬움은 여유 칸 없이 목표 크기 그대로', () => {
    expect(BOARD_MARGIN.easy).toBe(0);
    expect(boardAreaFor(target, 'easy')).toEqual({ width: 3, height: 2, target });
  });

  it('어려움은 사방 2칸 여유를 두고 목표를 옮긴다', () => {
    const area = boardAreaFor(target, 'hard');
    expect(area.width).toBe(7);
    expect(area.height).toBe(6);
    expect(area.target).toEqual(cells([[2, 2], [3, 2], [4, 2], [2, 3]]));
  });
});

describe('canPlace — inside(쉬움)', () => {
  it('목표 안이면 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(1, 1) }, 'inside')).toBe(true);
  });

  it('목표 밖으로 한 칸이라도 나가면 안 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(2, 1) }, 'inside')).toBe(false);
  });

  it('다른 조각과 겹치면 안 놓인다', () => {
    const other: Placement = { pieceId: 'I3', orientation: BASE, at: at(1, 1) };
    expect(canPlace(AREA, [other], { pieceId: 'L3', orientation: BASE, at: at(1, 1) }, 'inside')).toBe(false);
  });
});

describe('canPlace — free(보통·어려움)', () => {
  it('목표 밖으로 삐져나와도 판 안이면 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(2, 0) }, 'free')).toBe(true);
  });

  it('판 밖으로 나가면 안 놓인다', () => {
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(3, 0) }, 'free')).toBe(false);
    expect(canPlace(AREA, [], { pieceId: 'I3', orientation: BASE, at: at(-1, 0) }, 'free')).toBe(false);
    expect(canPlace(AREA, [], { pieceId: 'L3', orientation: BASE, at: at(0, 3) }, 'free')).toBe(false);
  });

  it('겹치면 안 놓인다', () => {
    const other: Placement = { pieceId: 'I3', orientation: BASE, at: at(0, 0) };
    expect(canPlace(AREA, [other], { pieceId: 'L3', orientation: BASE, at: at(2, 0) }, 'free')).toBe(false);
  });
});

describe('isSolved', () => {
  const target = cells([[0, 0], [1, 0], [2, 0], [3, 0]]);

  it('목표를 정확히 덮으면 true', () => {
    expect(isSolved(target, [{ pieceId: 'I4', orientation: BASE, at: at(0, 0) }])).toBe(true);
  });

  it('덜 덮으면 false', () => {
    expect(isSolved(target, [{ pieceId: 'I3', orientation: BASE, at: at(0, 0) }])).toBe(false);
  });

  it('목표 밖에 걸친 칸이 있으면 false', () => {
    expect(isSolved(target, [{ pieceId: 'I4', orientation: BASE, at: at(1, 0) }])).toBe(false);
  });

  it('놓인 조각이 없으면 false', () => {
    expect(isSolved(target, [])).toBe(false);
  });
});

describe('rotatePlacement', () => {
  it('가로 I4를 세우면 가운데 근처에 선다', () => {
    const r = rotatePlacement({ pieceId: 'I4', orientation: BASE, at: at(2, 2) });
    expect(r.orientation).toEqual({ rotation: 1, flipped: false });
    expect(r.at).toEqual(at(3, 1));
  });

  it.each(PIECE_IDS)('%s: 네 번 돌리면 같은 자리 같은 방향으로 돌아온다', (pieceId) => {
    for (const flipped of [false, true]) {
      const start: Placement = { pieceId, orientation: { rotation: 0, flipped }, at: at(5, 5) };
      let p = start;
      for (let i = 0; i < 4; i++) p = rotatePlacement(p);
      expect(p).toEqual(start);
    }
  });
});

describe('flipPlacement', () => {
  it('자리는 그대로 두고 뒤집는다', () => {
    const f = flipPlacement({ pieceId: 'L4', orientation: { rotation: 1, flipped: false }, at: at(3, 4) });
    expect(f).toEqual({ pieceId: 'L4', orientation: { rotation: 3, flipped: true }, at: at(3, 4) });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/games/blocks/logic/board.test.ts`
Expected: FAIL — `Failed to resolve import "./board"`

- [ ] **Step 3: 구현**

`src/games/blocks/logic/board.ts`:

```ts
import type { Difficulty } from '../../../lib/difficulty';
import { PIECES } from './pieces';
import { cellKey, normalize, shapeSize } from './shape';
import { flipOrientation, orient, rotateOrientation } from './transform';
import type { BoardArea, Cell, Placement, PlaceMode } from './types';

/** 퍼즐판에서 목표 바운딩박스 바깥에 두는 여유 칸 수 */
export const BOARD_MARGIN: Record<Difficulty, number> = { easy: 0, normal: 2, hard: 2 };

export function placeModeOf(difficulty: Difficulty): PlaceMode {
  return difficulty === 'easy' ? 'inside' : 'free';
}

export function placedCells(p: Placement): Cell[] {
  return orient(PIECES[p.pieceId].cells, p.orientation).map((c) => ({ x: c.x + p.at.x, y: c.y + p.at.y }));
}

export function boardAreaFor(target: readonly Cell[], difficulty: Difficulty): BoardArea {
  const m = BOARD_MARGIN[difficulty];
  const norm = normalize(target);
  const { w, h } = shapeSize(norm);
  return { width: w + 2 * m, height: h + 2 * m, target: norm.map((c) => ({ x: c.x + m, y: c.y + m })) };
}

/** others에는 지금 옮기는 조각을 빼고 넘긴다 */
export function canPlace(area: BoardArea, others: readonly Placement[], p: Placement, mode: PlaceMode): boolean {
  const targetSet = new Set(area.target.map(cellKey));
  const occupied = new Set<string>();
  for (const o of others) for (const c of placedCells(o)) occupied.add(cellKey(c));
  for (const c of placedCells(p)) {
    if (c.x < 0 || c.y < 0 || c.x >= area.width || c.y >= area.height) return false;
    const k = cellKey(c);
    if (occupied.has(k)) return false;
    if (mode === 'inside' && !targetSet.has(k)) return false;
  }
  return true;
}

/** 목표 칸을 전부 덮고, 목표 밖에 놓인 칸이 하나도 없으면 정답 */
export function isSolved(target: readonly Cell[], placements: readonly Placement[]): boolean {
  const targetSet = new Set(target.map(cellKey));
  const covered = new Set<string>();
  for (const p of placements) {
    for (const c of placedCells(p)) {
      const k = cellKey(c);
      if (!targetSet.has(k)) return false;
      covered.add(k);
    }
  }
  return covered.size === targetSet.size;
}

/** 시계방향으로 돌리되 조각 가운데가 제자리에 머물게 at을 보정한다 (네 번 돌리면 원위치) */
export function rotatePlacement(p: Placement): Placement {
  const shape = PIECES[p.pieceId].cells;
  const orientation = rotateOrientation(p.orientation);
  const before = shapeSize(orient(shape, p.orientation));
  const after = shapeSize(orient(shape, orientation));
  return {
    pieceId: p.pieceId,
    orientation,
    at: {
      x: p.at.x + Math.trunc((before.w - after.w) / 2),
      y: p.at.y + Math.trunc((before.h - after.h) / 2),
    },
  };
}

/** 뒤집어도 바운딩박스 크기는 같으므로 at은 그대로 */
export function flipPlacement(p: Placement): Placement {
  return { pieceId: p.pieceId, orientation: flipOrientation(p.orientation), at: p.at };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/games/blocks/logic/board.test.ts`
Expected: PASS (26 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/games/blocks/logic/board.ts src/games/blocks/logic/board.test.ts
git commit -m "feat: 난이도별 놓기 규칙과 정답 판정" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 솔버와 퍼즐 생성기

**Files:**
- Create: `src/games/blocks/logic/solver.ts`, `src/games/blocks/logic/generator.ts`
- Test: `src/games/blocks/logic/solver.test.ts`, `src/games/blocks/logic/generator.test.ts`

**Interfaces:**
- Consumes: `Rng`, `createRng`(Task 4), `DIFFICULTIES`, Task 5·6의 모양·조각·판 함수
- Produces:
  - `solve(target, pieceIds, allowFlip): Placement[] | null` — 검증용
  - `RULES: Record<Difficulty, GenRules>` — 쉬움: 2~3조각·작은 조각만·뒤집기 없음·5×4 / 보통: 3조각·펜토미노 ≤1·5×5 / 어려움: 4조각·6×5
  - `generatePuzzle(rng, difficulty): Puzzle` — target은 정규화, solution은 target 좌표

생성 원리: 조각을 실제로 변끼리 맞붙여 덩어리를 만들고 그 모양을 목표로 낸다(항상 풀림). 크기 초과·구멍 있는 모양은 버리고, 유효 후보 20개 중 바운딩박스 채움률이 가장 높은 것을 고른다. 조각 방향별 모양은 캐시한다 (검증 PC 기준 어려움 1개 약 2ms — 칠판에서도 라운드 시작 지연이 짧도록).

- [ ] **Step 1: solver 테스트 작성 → 실패 확인**

`src/games/blocks/logic/solver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isSolved } from './board';
import { PIECES } from './pieces';
import { solve } from './solver';
import { flipH } from './transform';
import type { Cell } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));

describe('solve', () => {
  it('풀 수 있는 모양의 정답 배치를 찾는다', () => {
    // ■■■
    // ■
    // ■■
    const target = cells([[0, 0], [1, 0], [2, 0], [0, 1], [0, 2], [1, 2]]);
    const result = solve(target, ['I3', 'L3'], true);
    expect(result).not.toBeNull();
    expect(isSolved(target, result ?? [])).toBe(true);
  });

  it('칸 수가 다르면 null', () => {
    expect(solve(cells([[0, 0], [1, 0]]), ['I3'], true)).toBeNull();
  });

  it('칸 수가 같아도 못 채우면 null', () => {
    expect(solve(cells([[0, 0], [1, 0], [2, 0], [3, 0]]), ['O4'], true)).toBeNull();
  });

  it('거울 모양은 뒤집기를 허용해야만 풀린다', () => {
    const mirrored = flipH(PIECES.L4.cells);
    expect(solve(mirrored, ['L4'], false)).toBeNull();
    expect(solve(mirrored, ['L4'], true)).not.toBeNull();
  });
});
```

Run: `npx vitest run src/games/blocks/logic/solver.test.ts`
Expected: FAIL — `Failed to resolve import "./solver"`

- [ ] **Step 2: solver 구현 → 통과 확인**

`src/games/blocks/logic/solver.ts`:

```ts
import { PIECES } from './pieces';
import { cellKey } from './shape';
import { orient, uniqueOrientations } from './transform';
import type { Cell, PieceId, Placement } from './types';

/**
 * 백트래킹으로 target을 pieceIds로 빈틈없이 채우는 배치를 찾는다. 없으면 null.
 * 생성기 검증용 — 아직 비어 있는 칸 중 (y, x) 순서로 가장 앞 칸은
 * 그 칸을 덮는 조각의 (y, x) 순서상 첫 칸이어야 한다는 점을 이용한다.
 */
export function solve(target: readonly Cell[], pieceIds: readonly PieceId[], allowFlip: boolean): Placement[] | null {
  const targetSet = new Set(target.map(cellKey));
  let total = 0;
  for (const id of pieceIds) total += PIECES[id].cells.length;
  if (total !== targetSet.size) return null;

  const order = target.slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const shapes = pieceIds.map((id) =>
    uniqueOrientations(PIECES[id].cells, allowFlip).map((o) => ({ o, cells: orient(PIECES[id].cells, o) })),
  );
  const filled = new Set<string>();
  const used = pieceIds.map(() => false);
  const result: Placement[] = [];

  const firstEmpty = (): Cell | null => {
    for (const c of order) if (!filled.has(cellKey(c))) return c;
    return null;
  };

  const search = (): boolean => {
    const cell = firstEmpty();
    if (!cell) return true;
    for (let i = 0; i < pieceIds.length; i++) {
      if (used[i]) continue;
      for (const { o, cells } of shapes[i]) {
        const anchor = cells[0];
        const at = { x: cell.x - anchor.x, y: cell.y - anchor.y };
        const keys = cells.map((c) => cellKey({ x: c.x + at.x, y: c.y + at.y }));
        if (!keys.every((k) => targetSet.has(k) && !filled.has(k))) continue;
        for (const k of keys) filled.add(k);
        used[i] = true;
        result.push({ pieceId: pieceIds[i], orientation: o, at });
        if (search()) return true;
        result.pop();
        used[i] = false;
        for (const k of keys) filled.delete(k);
      }
    }
    return false;
  };

  return search() ? result.slice() : null;
}
```

Run: `npx vitest run src/games/blocks/logic/solver.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 3: generator 속성 테스트 작성 → 실패 확인**

`src/games/blocks/logic/generator.test.ts` (난이도별 시드 1000개):

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../../../lib/difficulty';
import { createRng } from '../../../lib/random';
import { isSolved } from './board';
import { generatePuzzle, RULES } from './generator';
import { PENTOMINO_IDS, PIECES } from './pieces';
import { hasHoles, isConnected, normalize, shapeSize } from './shape';
import { solve } from './solver';
import type { Puzzle } from './types';

const SEEDS = 1000;

describe.each(DIFFICULTIES)('generatePuzzle(%s) — 시드 1000개 속성 테스트', (difficulty) => {
  const rules = RULES[difficulty];
  let puzzles: Puzzle[] = [];

  beforeAll(() => {
    puzzles = Array.from({ length: SEEDS }, (_, i) => generatePuzzle(createRng(i + 1), difficulty));
  });

  it('조각 수, 조각 풀, 펜토미노 수 규칙을 지킨다', () => {
    for (const p of puzzles) {
      expect(p.pieceIds.length).toBeGreaterThanOrEqual(rules.minPieces);
      expect(p.pieceIds.length).toBeLessThanOrEqual(rules.maxPieces);
      expect(new Set(p.pieceIds).size).toBe(p.pieceIds.length);
      for (const id of p.pieceIds) expect(rules.pool).toContain(id);
      const pentominoes = p.pieceIds.filter((id) => PENTOMINO_IDS.includes(id)).length;
      expect(pentominoes).toBeLessThanOrEqual(rules.maxPentominoes);
    }
  });

  it('목표 모양은 정규화돼 있고, 크기 제한 안이며, 이어져 있고, 구멍이 없다', () => {
    for (const p of puzzles) {
      expect(p.target).toEqual(normalize(p.target));
      const { w, h } = shapeSize(p.target);
      expect(w).toBeLessThanOrEqual(rules.maxW);
      expect(h).toBeLessThanOrEqual(rules.maxH);
      expect(isConnected(p.target)).toBe(true);
      expect(hasHoles(p.target)).toBe(false);
    }
  });

  it('목표 칸 수는 조각 칸 수의 합과 같다', () => {
    for (const p of puzzles) {
      const total = p.pieceIds.reduce((sum, id) => sum + PIECES[id].cells.length, 0);
      expect(p.target).toHaveLength(total);
    }
  });

  it('함께 주는 solution이 실제 정답이다', () => {
    for (const p of puzzles) expect(isSolved(p.target, p.solution)).toBe(true);
  });

  it('독립 솔버로도 풀린다 (쉬움은 뒤집기 없이)', () => {
    for (const p of puzzles) expect(solve(p.target, p.pieceIds, rules.allowFlip)).not.toBeNull();
  });

  it('같은 시드는 같은 퍼즐을 만든다', () => {
    expect(generatePuzzle(createRng(99), difficulty)).toEqual(generatePuzzle(createRng(99), difficulty));
  });
});

describe('쉬움', () => {
  it('정답 배치에 뒤집은 조각이 없다', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = generatePuzzle(createRng(seed), 'easy');
      expect(p.solution.every((s) => !s.orientation.flipped)).toBe(true);
    }
  });
});
```

Run: `npx vitest run src/games/blocks/logic/generator.test.ts`
Expected: FAIL — `Failed to resolve import "./generator"`

- [ ] **Step 4: generator 구현 → 통과 확인**

`src/games/blocks/logic/generator.ts`:

```ts
import type { Difficulty } from '../../../lib/difficulty';
import type { Rng } from '../../../lib/random';
import { PENTOMINO_IDS, PIECE_IDS, PIECES, SMALL_PIECE_IDS } from './pieces';
import { cellKey, hasHoles, neighbors, normalize, shapeSize } from './shape';
import { orient, uniqueOrientations } from './transform';
import type { Cell, Orientation, PieceId, Placement, Puzzle } from './types';

export type GenRules = {
  minPieces: number;
  maxPieces: number;
  pool: readonly PieceId[];
  maxPentominoes: number;
  allowFlip: boolean;
  maxW: number;
  maxH: number;
};

/** 난이도별 생성 규칙 (설계 문서 §3.2). 크기 수치는 조정 가능 */
export const RULES: Record<Difficulty, GenRules> = {
  easy: { minPieces: 2, maxPieces: 3, pool: SMALL_PIECE_IDS, maxPentominoes: 0, allowFlip: false, maxW: 5, maxH: 4 },
  normal: { minPieces: 3, maxPieces: 3, pool: PIECE_IDS, maxPentominoes: 1, allowFlip: true, maxW: 5, maxH: 5 },
  hard: { minPieces: 4, maxPieces: 4, pool: PIECE_IDS, maxPentominoes: 4, allowFlip: true, maxW: 6, maxH: 5 },
};

/** 조각 조합 하나당 모을 유효 후보 수 — 그중 가장 반듯한 것을 고른다 */
const CANDIDATES = 20;
const MAX_ATTEMPTS = 300;
const MAX_PIECE_SETS = 50;
/** 조각 하나를 기존 덩어리에 붙일 때 무작위로 시도하는 횟수 */
const PLACE_TRIES = 40;

type OrientedShape = { o: Orientation; cells: Cell[] };
type Assembly = { placements: Placement[]; cells: Cell[] };

const shapeCache = new Map<string, OrientedShape[]>();

/**
 * 조각을 실제로 이어 붙여 만든 모양을 목표로 낸다 → 항상 풀 수 있다.
 * 쉬움은 회전만 써서 만들므로 뒤집기 없이 풀린다.
 */
export function generatePuzzle(rng: Rng, difficulty: Difficulty): Puzzle {
  const rules = RULES[difficulty];
  for (let set = 0; set < MAX_PIECE_SETS; set++) {
    const pieceIds = choosePieces(rng, rules);
    let best: Puzzle | null = null;
    let bestScore = -1;
    let found = 0;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && found < CANDIDATES; attempt++) {
      const assembly = assemble(rng, pieceIds, rules.allowFlip);
      if (!assembly) continue;
      const { w, h } = shapeSize(assembly.cells);
      if (w > rules.maxW || h > rules.maxH || hasHoles(assembly.cells)) continue;
      found++;
      const score = assembly.cells.length / (w * h);
      if (score > bestScore) {
        best = toPuzzle(pieceIds, assembly);
        bestScore = score;
      }
    }
    if (best) return best;
  }
  throw new Error('퍼즐 생성 실패: ' + difficulty);
}

function choosePieces(rng: Rng, rules: GenRules): PieceId[] {
  const count = rules.minPieces + rng.int(rules.maxPieces - rules.minPieces + 1);
  const chosen: PieceId[] = [];
  let pentominoes = 0;
  for (const id of rng.shuffle(rules.pool)) {
    if (chosen.length === count) break;
    const isPentomino = PENTOMINO_IDS.includes(id);
    if (isPentomino && pentominoes >= rules.maxPentominoes) continue;
    if (isPentomino) pentominoes++;
    chosen.push(id);
  }
  return chosen;
}

/** 조각의 서로 다른 방향별 모양 (자주 쓰므로 캐시) */
function orientedShapes(pieceId: PieceId, allowFlip: boolean): OrientedShape[] {
  const key = pieceId + (allowFlip ? '+flip' : '');
  let shapes = shapeCache.get(key);
  if (!shapes) {
    shapes = uniqueOrientations(PIECES[pieceId].cells, allowFlip).map((o) => ({
      o,
      cells: orient(PIECES[pieceId].cells, o),
    }));
    shapeCache.set(key, shapes);
  }
  return shapes;
}

/** 조각을 하나씩 기존 덩어리에 변으로 맞닿게 붙인다. 실패하면 null */
function assemble(rng: Rng, pieceIds: readonly PieceId[], allowFlip: boolean): Assembly | null {
  const placements: Placement[] = [];
  const occupied = new Set<string>();
  const cells: Cell[] = [];

  for (const pieceId of rng.shuffle(pieceIds)) {
    const shapes = orientedShapes(pieceId, allowFlip);
    let chosen: OrientedShape | null = null;
    let at: Cell = { x: 0, y: 0 };

    if (placements.length === 0) {
      chosen = rng.pick(shapes);
    } else {
      const frontier = frontierOf(cells, occupied);
      for (let t = 0; t < PLACE_TRIES && !chosen; t++) {
        const shape = rng.pick(shapes);
        const f = rng.pick(frontier);
        const s = rng.pick(shape.cells);
        const candidate = { x: f.x - s.x, y: f.y - s.y };
        const free = shape.cells.every((c) => !occupied.has(cellKey({ x: c.x + candidate.x, y: c.y + candidate.y })));
        if (free) {
          chosen = shape;
          at = candidate;
        }
      }
      if (!chosen) return null;
    }

    placements.push({ pieceId, orientation: chosen.o, at });
    for (const c of chosen.cells) {
      const abs = { x: c.x + at.x, y: c.y + at.y };
      occupied.add(cellKey(abs));
      cells.push(abs);
    }
  }
  return { placements, cells };
}

/** 덩어리에 변으로 맞닿은 빈칸들 */
function frontierOf(cells: readonly Cell[], occupied: ReadonlySet<string>): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];
  for (const c of cells) {
    for (const n of neighbors(c)) {
      const k = cellKey(n);
      if (occupied.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
  }
  return out;
}

function toPuzzle(pieceIds: readonly PieceId[], assembly: Assembly): Puzzle {
  let minX = Infinity;
  let minY = Infinity;
  for (const c of assembly.cells) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
  }
  return {
    target: normalize(assembly.cells),
    pieceIds: pieceIds.slice(),
    solution: assembly.placements.map((p) => ({ ...p, at: { x: p.at.x - minX, y: p.at.y - minY } })),
  };
}
```

Run: `npx vitest run src/games/blocks/logic/generator.test.ts`
Expected: PASS (19 tests, 5초 안팎)

- [ ] **Step 5: 커밋**

```bash
git add src/games/blocks/logic/solver.ts src/games/blocks/logic/solver.test.ts src/games/blocks/logic/generator.ts src/games/blocks/logic/generator.test.ts
git commit -m "feat: 항상 풀리는 퍼즐 생성기와 검증용 솔버" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 조각 조작 상태 (놓기·돌리기·뒤집기)

**Files:**
- Create: `src/games/blocks/logic/play.ts`
- Test: `src/games/blocks/logic/play.test.ts`

**Interfaces:**
- Consumes: `canPlace`, `isSolved`, `rotatePlacement`, `flipPlacement`(Task 6), `rotateOrientation`, `flipOrientation`(Task 5)
- Produces:
  - `type PieceState = { pieceId; orientation; at: Cell | null }` (null = 트레이)
  - `initialPieces(pieceIds)`, `placementsOf(pieces, except?)`
  - `dropPiece(pieces, pieceId, at | null, area, mode)` — 규칙에 안 맞으면 트레이로
  - `rotatePiece(pieces, pieceId, area, mode)`, `flipPiece(...)` — 트레이면 방향만, 판 위면 제자리에서 바꾸고 안 맞으면 바뀐 방향 그대로 트레이로
  - `piecesSolved(pieces, area): boolean`
  - 모두 원래 배열을 바꾸지 않고 새 배열을 돌려준다

- [ ] **Step 1: 실패하는 테스트 작성**

`src/games/blocks/logic/play.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../../../lib/random';
import { boardAreaFor } from './board';
import { generatePuzzle } from './generator';
import { dropPiece, flipPiece, initialPieces, piecesSolved, placementsOf, rotatePiece } from './play';
import type { PieceState } from './play';
import type { BoardArea, Cell } from './types';

const cells = (pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }));
const at = (x: number, y: number): Cell => ({ x, y });

// 목표: I3 가로 + 아래 L3 (6칸). 판 5x4
const AREA: BoardArea = { width: 5, height: 4, target: cells([[1, 1], [2, 1], [3, 1], [1, 2], [1, 3], [2, 3]]) };
const start = (): PieceState[] => initialPieces(['I3', 'L3']);
const pieceOf = (pieces: PieceState[], id: string) => pieces.find((p) => p.pieceId === id) as PieceState;

describe('initialPieces', () => {
  it('모든 조각이 기본 방향으로 트레이에 있다', () => {
    expect(start()).toEqual([
      { pieceId: 'I3', orientation: { rotation: 0, flipped: false }, at: null },
      { pieceId: 'L3', orientation: { rotation: 0, flipped: false }, at: null },
    ]);
  });
});

describe('dropPiece', () => {
  it('놓을 수 있으면 판에 놓는다', () => {
    const next = dropPiece(start(), 'I3', at(1, 1), AREA, 'inside');
    expect(pieceOf(next, 'I3').at).toEqual(at(1, 1));
  });

  it('inside에서 목표 밖이면 트레이로 돌아간다', () => {
    const next = dropPiece(start(), 'I3', at(2, 1), AREA, 'inside');
    expect(pieceOf(next, 'I3').at).toBeNull();
  });

  it('free에서는 목표 밖으로 걸쳐도 판 안이면 놓인다', () => {
    const next = dropPiece(start(), 'I3', at(2, 0), AREA, 'free');
    expect(pieceOf(next, 'I3').at).toEqual(at(2, 0));
  });

  it('판 밖이면 트레이로 돌아간다', () => {
    const next = dropPiece(start(), 'I3', at(4, 0), AREA, 'free');
    expect(pieceOf(next, 'I3').at).toBeNull();
  });

  it('다른 조각과 겹치면 트레이로 돌아간다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'free');
    const next = dropPiece(placed, 'L3', at(2, 0), AREA, 'free');
    expect(pieceOf(next, 'L3').at).toBeNull();
  });

  it('판 위 조각을 살짝 옮겨 자기 원래 자리와 겹쳐도 된다', () => {
    const placed = dropPiece(start(), 'I3', at(0, 0), AREA, 'free');
    const next = dropPiece(placed, 'I3', at(1, 0), AREA, 'free');
    expect(pieceOf(next, 'I3').at).toEqual(at(1, 0));
  });

  it('null을 주면 트레이로 보낸다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'free');
    expect(pieceOf(dropPiece(placed, 'I3', null, AREA, 'free'), 'I3').at).toBeNull();
  });

  it('원래 배열은 바꾸지 않는다', () => {
    const before = start();
    dropPiece(before, 'I3', at(1, 1), AREA, 'free');
    expect(before[0].at).toBeNull();
  });
});

describe('rotatePiece', () => {
  it('트레이 조각은 방향만 돈다', () => {
    const next = rotatePiece(start(), 'I3', AREA, 'free');
    expect(pieceOf(next, 'I3')).toEqual({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: null });
  });

  it('판 위에서 돌려도 맞으면 판에 남는다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'free');
    const next = rotatePiece(placed, 'I3', AREA, 'free');
    expect(pieceOf(next, 'I3')).toEqual({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: at(2, 0) });
  });

  it('판 위에서 돌려서 안 맞으면 돌린 채로 트레이로 간다', () => {
    const placed = dropPiece(start(), 'I3', at(1, 1), AREA, 'inside');
    const next = rotatePiece(placed, 'I3', AREA, 'inside');
    expect(pieceOf(next, 'I3')).toEqual({ pieceId: 'I3', orientation: { rotation: 1, flipped: false }, at: null });
  });
});

describe('flipPiece', () => {
  it('트레이 조각은 방향만 뒤집힌다', () => {
    const next = flipPiece(start(), 'L3', AREA, 'free');
    expect(pieceOf(next, 'L3').orientation).toEqual({ rotation: 0, flipped: true });
    expect(pieceOf(next, 'L3').at).toBeNull();
  });

  it('판 위에서 뒤집어도 맞으면 그 자리에 남는다', () => {
    const placed = dropPiece(start(), 'L3', at(0, 0), AREA, 'free');
    const next = flipPiece(placed, 'L3', AREA, 'free');
    expect(pieceOf(next, 'L3').at).toEqual(at(0, 0));
    expect(pieceOf(next, 'L3').orientation.flipped).toBe(true);
  });

  it('판 위에서 뒤집어서 안 맞으면 트레이로 간다', () => {
    const placed = dropPiece(start(), 'L3', at(1, 2), AREA, 'inside');
    expect(pieceOf(placed, 'L3').at).toEqual(at(1, 2));
    const next = flipPiece(placed, 'L3', AREA, 'inside');
    expect(pieceOf(next, 'L3').at).toBeNull();
  });
});

describe('placementsOf', () => {
  it('판 위 조각만 돌려주고 except는 뺀다', () => {
    const placed = dropPiece(dropPiece(start(), 'I3', at(1, 1), AREA, 'free'), 'L3', at(0, 2), AREA, 'free');
    expect(placementsOf(placed).map((p) => p.pieceId)).toEqual(['I3', 'L3']);
    expect(placementsOf(placed, 'I3').map((p) => p.pieceId)).toEqual(['L3']);
  });
});

describe('piecesSolved', () => {
  it('생성된 퍼즐의 정답대로 놓으면 true, 하나라도 트레이면 false', () => {
    const puzzle = generatePuzzle(createRng(5), 'normal');
    const area = boardAreaFor(puzzle.target, 'normal');
    const solvedPieces: PieceState[] = puzzle.solution.map((s) => ({
      pieceId: s.pieceId,
      orientation: s.orientation,
      at: { x: s.at.x + 2, y: s.at.y + 2 },
    }));
    expect(piecesSolved(solvedPieces, area)).toBe(true);
    const oneInTray = solvedPieces.map((p, i) => (i === 0 ? { ...p, at: null } : p));
    expect(piecesSolved(oneInTray, area)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/games/blocks/logic/play.test.ts`
Expected: FAIL — `Failed to resolve import "./play"`

- [ ] **Step 3: 구현**

`src/games/blocks/logic/play.ts`:

```ts
import { canPlace, flipPlacement, isSolved, rotatePlacement } from './board';
import { flipOrientation, rotateOrientation } from './transform';
import type { BoardArea, Cell, Orientation, PieceId, Placement, PlaceMode } from './types';

/** 플레이어 칸 하나의 조각 상태. at이 null이면 트레이에 있다 */
export type PieceState = { pieceId: PieceId; orientation: Orientation; at: Cell | null };

export function initialPieces(pieceIds: readonly PieceId[]): PieceState[] {
  return pieceIds.map((pieceId) => ({ pieceId, orientation: { rotation: 0, flipped: false }, at: null }));
}

/** 판 위에 놓인 조각들 (except는 제외) */
export function placementsOf(pieces: readonly PieceState[], except?: PieceId): Placement[] {
  const out: Placement[] = [];
  for (const p of pieces) {
    if (p.at && p.pieceId !== except) out.push({ pieceId: p.pieceId, orientation: p.orientation, at: p.at });
  }
  return out;
}

function find(pieces: readonly PieceState[], pieceId: PieceId): PieceState {
  const piece = pieces.find((p) => p.pieceId === pieceId);
  if (!piece) throw new Error('없는 조각: ' + pieceId);
  return piece;
}

/** next.at이 있으면 놓기 규칙을 검사하고, 안 되면 트레이(at: null)로 보낸다 */
function settle(pieces: readonly PieceState[], next: PieceState, area: BoardArea, mode: PlaceMode): PieceState[] {
  let settled = next;
  if (next.at) {
    const placement = { pieceId: next.pieceId, orientation: next.orientation, at: next.at };
    if (!canPlace(area, placementsOf(pieces, next.pieceId), placement, mode)) settled = { ...next, at: null };
  }
  return pieces.map((p) => (p.pieceId === next.pieceId ? settled : p));
}

export function dropPiece(
  pieces: readonly PieceState[],
  pieceId: PieceId,
  at: Cell | null,
  area: BoardArea,
  mode: PlaceMode,
): PieceState[] {
  return settle(pieces, { ...find(pieces, pieceId), at }, area, mode);
}

export function rotatePiece(pieces: readonly PieceState[], pieceId: PieceId, area: BoardArea, mode: PlaceMode): PieceState[] {
  const cur = find(pieces, pieceId);
  if (!cur.at) return settle(pieces, { ...cur, orientation: rotateOrientation(cur.orientation) }, area, mode);
  const r = rotatePlacement({ pieceId, orientation: cur.orientation, at: cur.at });
  return settle(pieces, { pieceId, orientation: r.orientation, at: r.at }, area, mode);
}

export function flipPiece(pieces: readonly PieceState[], pieceId: PieceId, area: BoardArea, mode: PlaceMode): PieceState[] {
  const cur = find(pieces, pieceId);
  if (!cur.at) return settle(pieces, { ...cur, orientation: flipOrientation(cur.orientation) }, area, mode);
  const f = flipPlacement({ pieceId, orientation: cur.orientation, at: cur.at });
  return settle(pieces, { pieceId, orientation: f.orientation, at: f.at }, area, mode);
}

export function piecesSolved(pieces: readonly PieceState[], area: BoardArea): boolean {
  return isSolved(area.target, placementsOf(pieces));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/games/blocks/logic`
Expected: PASS (logic 전체)

- [ ] **Step 5: 커밋**

```bash
git add src/games/blocks/logic/play.ts src/games/blocks/logic/play.test.ts
git commit -m "feat: 플레이어 칸의 조각 놓기·돌리기·뒤집기 상태 변화" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 화면 배치 계산과 터치 제스처

**Files:**
- Create: `src/games/blocks/ui/layout.ts`, `src/lib/gesture.ts`, `src/lib/usePointerDrag.ts`
- Test: `src/games/blocks/ui/layout.test.ts`, `src/lib/usePointerDrag.test.ts`

**Interfaces:**
- Consumes: `MAX_PIECE_EXTENT`, `BoardArea`
- Produces:
  - `layout.ts` (단위 = 퍼즐 칸): `SLOT = 4`, `SLOT_GAP = 1`, `ACTION_H = 2`, `PAD = 0.5`, `type Point`, `type Layout { width, height, boardX, boardY, actionY, slots: Point[], columns }`, `computeLayout(area, pieceCount, columns)`, `cellSizeFor(layout, w, h)`, `bestLayout(area, pieceCount, w, h)`(트레이 2열/4열 중 칸이 더 크게 보이는 쪽, 크기 0이면 2열), `trayPosition(slot, w, h)`
  - `gesture.ts`: `TAP_MAX_DISTANCE = 10`, `TAP_MAX_DURATION_MS = 300`, `isTap(distance, ms)`, `movedBeyondTap(distance)`
  - `usePointerDrag<T>(callbacks: { onDragStart(id), onDragMove(id, dx, dy), onDragEnd(id, dx, dy), onTap(id) }) → { begin(e, id, captureTarget), move(e), end(e), cancel(e) }` — 포인터(손가락)마다 독립, 취소되면 `onDragEnd(id, 0, 0)`

- [ ] **Step 1: layout 테스트 작성 → 실패 확인**

`src/games/blocks/ui/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { BoardArea } from '../logic/types';
import { ACTION_H, bestLayout, cellSizeFor, computeLayout, PAD, SLOT, trayPosition } from './layout';

const area = (width: number, height: number): BoardArea => ({ width, height, target: [] });

describe('computeLayout', () => {
  it('판 아래에 버튼 줄, 그 아래 트레이를 둔다', () => {
    const l = computeLayout(area(10, 9), 4, 2);
    expect(l.boardY).toBe(PAD);
    expect(l.actionY).toBe(PAD + 9);
    expect(l.slots[0].y).toBe(PAD + 9 + ACTION_H);
  });

  it('2열 트레이: 조각 4개면 2줄', () => {
    const l = computeLayout(area(10, 9), 4, 2);
    expect(l.columns).toBe(2);
    // 트레이 가로 = 4*2 + 1, 세로 = 4*2 + 1
    expect(l.width).toBe(10 + 2 * PAD);
    expect(l.height).toBe(PAD + 9 + ACTION_H + 9 + PAD);
  });

  it('4열 트레이: 조각 4개면 1줄', () => {
    const l = computeLayout(area(10, 9), 4, 4);
    expect(l.columns).toBe(4);
    expect(l.width).toBe(19 + 2 * PAD);
    expect(l.height).toBe(PAD + 9 + ACTION_H + SLOT + PAD);
  });

  it('열 수는 조각 수를 넘지 않는다', () => {
    expect(computeLayout(area(5, 4), 2, 4).columns).toBe(2);
  });

  it('칸끼리 겹치지 않는다', () => {
    const { slots } = computeLayout(area(10, 9), 4, 2);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const apart = Math.abs(slots[i].x - slots[j].x) >= SLOT || Math.abs(slots[i].y - slots[j].y) >= SLOT;
        expect(apart).toBe(true);
      }
    }
  });

  it('판이 트레이보다 좁으면 가운데 정렬', () => {
    const l = computeLayout(area(5, 4), 3, 2);
    // 트레이 가로 9 → 판(5)은 (9-5)/2 만큼 들여쓴다
    expect(l.boardX).toBe(PAD + 2);
  });
});

describe('bestLayout', () => {
  it('넓은 칸에서는 4열 트레이', () => {
    expect(bestLayout(area(10, 9), 4, 2000, 700).columns).toBe(4);
  });

  it('좁고 긴 칸에서는 2열 트레이', () => {
    expect(bestLayout(area(10, 9), 4, 480, 720).columns).toBe(2);
  });

  it('크기를 아직 모르면 2열', () => {
    expect(bestLayout(area(10, 9), 4, 0, 0).columns).toBe(2);
  });
});

describe('cellSizeFor', () => {
  it('가로·세로 중 빡빡한 쪽에 맞춘다', () => {
    const l = computeLayout(area(10, 9), 4, 2); // 11 x 21
    expect(cellSizeFor(l, 1100, 420)).toBe(20);
  });
});

describe('trayPosition', () => {
  it('슬롯 가운데에 둔다', () => {
    expect(trayPosition({ x: 1, y: 2 }, 2, 3)).toEqual({ x: 2, y: 2.5 });
  });
});
```

Run: `npx vitest run src/games/blocks/ui/layout.test.ts`
Expected: FAIL — `Failed to resolve import "./layout"`

- [ ] **Step 2: layout 구현 → 통과 확인**

`src/games/blocks/ui/layout.ts`:

```ts
import { MAX_PIECE_EXTENT } from '../logic/pieces';
import type { BoardArea } from '../logic/types';

// 단위: 퍼즐 칸 1개 = 1 (SVG viewBox 좌표)
/** 트레이 슬롯 한 변 — 어떤 조각이든 어느 방향이든 들어간다 */
export const SLOT = MAX_PIECE_EXTENT;
export const SLOT_GAP = 1;
/** 판과 트레이 사이 버튼 줄 높이 */
export const ACTION_H = 2;
export const PAD = 0.5;

export type Point = { x: number; y: number };

export type Layout = {
  width: number;
  height: number;
  boardX: number;
  boardY: number;
  actionY: number;
  /** pieces 배열 순서대로 조각마다 고정된 트레이 슬롯 왼쪽 위 */
  slots: Point[];
  columns: number;
};

export function computeLayout(area: BoardArea, pieceCount: number, columns: number): Layout {
  const cols = Math.max(1, Math.min(columns, pieceCount));
  const rows = Math.ceil(pieceCount / cols);
  const trayW = cols * SLOT + (cols - 1) * SLOT_GAP;
  const trayH = rows * SLOT + (rows - 1) * SLOT_GAP;
  const contentW = Math.max(area.width, trayW);
  const boardX = PAD + (contentW - area.width) / 2;
  const boardY = PAD;
  const actionY = boardY + area.height;
  const trayX = PAD + (contentW - trayW) / 2;
  const trayY = actionY + ACTION_H;
  const slots = Array.from({ length: pieceCount }, (_, i) => ({
    x: trayX + (i % cols) * (SLOT + SLOT_GAP),
    y: trayY + Math.floor(i / cols) * (SLOT + SLOT_GAP),
  }));
  return { width: contentW + 2 * PAD, height: trayY + trayH + PAD, boardX, boardY, actionY, slots, columns: cols };
}

/** 칸(px) 안에 layout을 꽉 맞췄을 때 퍼즐 칸 하나의 크기(px) */
export function cellSizeFor(layout: Layout, containerW: number, containerH: number): number {
  return Math.min(containerW / layout.width, containerH / layout.height);
}

/** 트레이 2열/4열 중 퍼즐 칸이 더 크게 보이는 쪽 */
export function bestLayout(area: BoardArea, pieceCount: number, containerW: number, containerH: number): Layout {
  const narrow = computeLayout(area, pieceCount, 2);
  if (containerW <= 0 || containerH <= 0) return narrow;
  const wide = computeLayout(area, pieceCount, 4);
  return cellSizeFor(wide, containerW, containerH) > cellSizeFor(narrow, containerW, containerH) ? wide : narrow;
}

/** w×h 모양을 슬롯 가운데에 둘 때 왼쪽 위 */
export function trayPosition(slot: Point, w: number, h: number): Point {
  return { x: slot.x + (SLOT - w) / 2, y: slot.y + (SLOT - h) / 2 };
}
```

Run: `npx vitest run src/games/blocks/ui/layout.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 3: 제스처 테스트 작성 → 실패 확인**

`src/lib/usePointerDrag.test.ts`:

```ts
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
```

Run: `npx vitest run src/lib/usePointerDrag.test.ts`
Expected: FAIL — `Failed to resolve import "./gesture"`

- [ ] **Step 4: 제스처 구현 → 통과 확인**

`src/lib/gesture.ts`:

```ts
/** 이보다 덜 움직이고(CSS px) 짧게 누르면 탭 */
export const TAP_MAX_DISTANCE = 10;
export const TAP_MAX_DURATION_MS = 300;

export function isTap(distance: number, durationMs: number): boolean {
  return distance < TAP_MAX_DISTANCE && durationMs < TAP_MAX_DURATION_MS;
}

export function movedBeyondTap(distance: number): boolean {
  return distance >= TAP_MAX_DISTANCE;
}
```

`src/lib/usePointerDrag.ts`:

```ts
import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { isTap, movedBeyondTap } from './gesture';

export type DragCallbacks<T> = {
  onDragStart(id: T): void;
  /** dx, dy: 누른 지점부터 움직인 거리(CSS px) */
  onDragMove(id: T, dx: number, dy: number): void;
  onDragEnd(id: T, dx: number, dy: number): void;
  onTap(id: T): void;
};

type Session<T> = { id: T; startX: number; startY: number; startTime: number; moved: boolean };

/**
 * 포인터(손가락)마다 끌기/탭을 따로 추적한다.
 * begin은 대상 요소의 pointerdown에서, move/end/cancel은 captureTarget(SVG 루트)의 이벤트에서 부른다.
 */
export function usePointerDrag<T>(callbacks: DragCallbacks<T>) {
  const sessions = useRef(new Map<number, Session<T>>());

  function begin(e: ReactPointerEvent<Element>, id: T, captureTarget: Element): void {
    if (typeof captureTarget.setPointerCapture === 'function') {
      try {
        captureTarget.setPointerCapture(e.pointerId);
      } catch {
        // 캡처를 못 해도 끌기는 동작한다
      }
    }
    sessions.current.set(e.pointerId, {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      moved: false,
    });
  }

  function move(e: ReactPointerEvent<Element>): void {
    const s = sessions.current.get(e.pointerId);
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.moved) {
      if (!movedBeyondTap(Math.hypot(dx, dy))) return;
      s.moved = true;
      callbacks.onDragStart(s.id);
    }
    callbacks.onDragMove(s.id, dx, dy);
  }

  function end(e: ReactPointerEvent<Element>): void {
    const s = sessions.current.get(e.pointerId);
    if (!s) return;
    sessions.current.delete(e.pointerId);
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (s.moved) callbacks.onDragEnd(s.id, dx, dy);
    else if (isTap(Math.hypot(dx, dy), Date.now() - s.startTime)) callbacks.onTap(s.id);
  }

  function cancel(e: ReactPointerEvent<Element>): void {
    const s = sessions.current.get(e.pointerId);
    if (!s) return;
    sessions.current.delete(e.pointerId);
    if (s.moved) callbacks.onDragEnd(s.id, 0, 0);
  }

  return { begin, move, end, cancel };
}
```

Run: `npx vitest run src/lib/usePointerDrag.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/games/blocks/ui/layout.ts src/games/blocks/ui/layout.test.ts src/lib/gesture.ts src/lib/usePointerDrag.ts src/lib/usePointerDrag.test.ts
git commit -m "feat: 퍼즐 칸 배치 계산과 손가락별 끌기·탭 인식" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 퍼즐 칸 UI와 터치 시험 화면

**Files:**
- Create: `src/games/types.ts`, `src/lib/useElementSize.ts`
- Create: `src/games/blocks/ui/PieceView.tsx`, `src/games/blocks/ui/PlayerArea.tsx`, `src/games/blocks/ui/PlayerArea.module.css`
- Create: `src/games/blocks/index.ts`, `src/games/registry.ts`
- Create: `src/shell/ui/colors.ts`, `src/shell/ui/PlayLayout.tsx`, `src/shell/ui/PlayLayout.module.css`
- Modify: `src/test/setup.ts` (PointerEvent 대용 추가), `src/App.tsx`·`src/App.test.tsx` (임시 터치 시험 화면), `src/styles.css` (버튼 스타일 + 임시 화면 스타일 추가)
- Test: `src/games/blocks/ui/PlayerArea.test.tsx`, `src/games/registry.test.ts`, `src/shell/ui/PlayLayout.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 4~9 전부
- Produces:
  - `games/types.ts`: `PlayerAreaProps { difficulty, seed, active, onSolved }`, `GameModule { id, name, description, minPlayers, maxPlayers, PlayerArea }`
  - `PlayerArea` (memo): seed로 퍼즐을 만들고, 판(실루엣·격자·여유 칸) + 버튼 줄(돌리기, 보통·어려움은 뒤집기) + 트레이를 한 SVG로 그린다. 조각을 누르면 선택, 탭하면 회전, 끌어 놓으면 규칙대로 놓이거나 트레이로. 다 맞추면 `onSolved()`를 한 번 부르고 "완성!" 표시. `active=false`면 입력 무시. 테스트용 `data-testid`: `puzzle-svg`, `target-cell`, `outside-cell`, `piece`(`data-piece`, `data-rotation`, `data-flipped`, `data-placed`)
  - `blocksGame: GameModule`, `GAMES`, `findGame(id)`
  - `PLAYER_COLORS`, `PlayLayout({ columns: { key, color, header, body }[] })` — `data-testid="player-column"`
  - 전역 `.btn`, `.btn-primary`, `.btn[aria-pressed='true']`

> 스펙 §4.3과의 차이: 뒤집기 버튼을 "조각 바로 위"가 아니라 **판과 트레이 사이의 고정 버튼 줄**에 두고, 같은 줄에 **돌리기 버튼**도 둔다(마지막으로 만진 조각에 적용, 그 조각은 점선 테두리로 강조). 이유: 떠다니는 버튼은 손에 가리고 판 위쪽 조각이면 화면 밖으로 나가며, 칠판 IR 터치는 떨림 때문에 탭이 끌기로 인식될 수 있어 돌리기 버튼이 대안이 된다. 탭=회전은 그대로다. (설계 문서에 반영됨)

- [ ] **Step 1: 테스트 환경에 PointerEvent 대용 추가**

jsdom에는 `PointerEvent`가 없어 `fireEvent.pointerMove`의 좌표·`pointerId`가 사라진다. `src/test/setup.ts`를 다음으로 바꾼다:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom에는 PointerEvent가 없다 → fireEvent.pointerX가 좌표·pointerId를 잃지 않게 MouseEvent로 흉내 낸다
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'touch';
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 2: 게임 계약·등록부·칸 분할 테스트 작성 → 실패 확인**

`src/games/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { findGame, GAMES } from './registry';

describe('registry', () => {
  it('블록 퍼즐이 1~4인 게임으로 등록돼 있다', () => {
    const game = findGame('blocks');
    expect(game?.name).toBe('블록 퍼즐');
    expect(game?.minPlayers).toBe(1);
    expect(game?.maxPlayers).toBe(4);
  });

  it('게임 id는 겹치지 않는다', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('없는 id는 undefined', () => {
    expect(findGame('nope')).toBeUndefined();
  });
});
```

`src/shell/ui/PlayLayout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayLayout } from './PlayLayout';

describe('PlayLayout', () => {
  it('칸마다 머리와 몸통을 그린다', () => {
    render(
      <PlayLayout
        columns={[
          { key: 'a', color: '#E5483B', header: <span>민준</span>, body: <span>퍼즐A</span> },
          { key: 'b', color: '#2F80ED', header: <span>서연</span>, body: <span>퍼즐B</span> },
          { key: 'c', color: '#27AE60', header: <span>아빠</span>, body: <span>퍼즐C</span> },
        ]}
      />,
    );
    const columns = screen.getAllByTestId('player-column');
    expect(columns).toHaveLength(3);
    expect(columns[1]).toHaveTextContent('서연');
    expect(columns[1]).toHaveTextContent('퍼즐B');
  });
});
```

`src/games/blocks/ui/PlayerArea.test.tsx` (마지막 테스트는 실제로 조각을 돌리고 끌어 정답을 완성한다):

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '../../../lib/random';
import { boardAreaFor } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { PIECES } from '../logic/pieces';
import { shapeSize } from '../logic/shape';
import { orient } from '../logic/transform';
import { bestLayout, cellSizeFor, trayPosition } from './layout';
import { PlayerArea } from './PlayerArea';

const noop = () => {};

describe('PlayerArea', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('목표 칸과 조각을 그린다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    expect(screen.getAllByTestId('target-cell')).toHaveLength(puzzle.target.length);
    expect(screen.getAllByTestId('piece')).toHaveLength(puzzle.pieceIds.length);
  });

  it('판 격자는 보통이면 사방 2칸 여유, 쉬움이면 목표 크기 그대로', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { w, h } = shapeSize(puzzle.target);
    const { unmount } = render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    const cellCount = () => screen.getAllByTestId('target-cell').length + screen.queryAllByTestId('outside-cell').length;
    expect(cellCount()).toBe((w + 4) * (h + 4));
    unmount();

    const easy = generatePuzzle(createRng(7), 'easy');
    const e = shapeSize(easy.target);
    render(<PlayerArea difficulty="easy" seed={7} active onSolved={noop} />);
    expect(cellCount()).toBe(e.w * e.h);
  });

  it('쉬움에는 뒤집기 버튼이 없다', () => {
    render(<PlayerArea difficulty="easy" seed={7} active onSolved={noop} />);
    expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '뒤집기' })).toBeNull();
  });

  it('조각을 고르고 돌리기·뒤집기를 누르면 그 조각이 바뀐다', () => {
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    fireEvent.pointerDown(screen.getAllByTestId('piece')[0], { pointerId: 1 });
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(screen.getAllByTestId('piece')[0]).toHaveAttribute('data-rotation', '1');
    fireEvent.pointerDown(screen.getByRole('button', { name: '뒤집기' }));
    expect(screen.getAllByTestId('piece')[0]).toHaveAttribute('data-flipped', 'yes');
  });

  it('active가 false면 조각을 고를 수 없다', () => {
    render(<PlayerArea difficulty="normal" seed={7} active={false} onSolved={noop} />);
    fireEvent.pointerDown(screen.getAllByTestId('piece')[0], { pointerId: 1 });
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(screen.getAllByTestId('piece')[0]).toHaveAttribute('data-rotation', '0');
  });

  it('조각을 끌어 정답 자리에 모두 놓으면 onSolved를 한 번 부른다', () => {
    const W = 600;
    const H = 1000;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: W, height: H } as DOMRect);
    const seed = 11;
    const puzzle = generatePuzzle(createRng(seed), 'normal');
    const area = boardAreaFor(puzzle.target, 'normal');
    const layout = bestLayout(area, puzzle.pieceIds.length, W, H);
    const scale = cellSizeFor(layout, W, H);
    const onSolved = vi.fn();
    render(<PlayerArea difficulty="normal" seed={seed} active onSolved={onSolved} />);
    const svg = screen.getByTestId('puzzle-svg');

    puzzle.solution.forEach((s, n) => {
      const piece = screen.getAllByTestId('piece').find((el) => el.getAttribute('data-piece') === s.pieceId);
      if (!piece) throw new Error('조각 없음: ' + s.pieceId);
      // 정답 방향 만들기: 고르고(누르기만) → 뒤집기 → 돌리기 r번
      fireEvent.pointerDown(piece, { pointerId: 100 + n, clientX: 0, clientY: 0 });
      if (s.orientation.flipped) fireEvent.pointerDown(screen.getByRole('button', { name: '뒤집기' }));
      for (let r = 0; r < s.orientation.rotation; r++) {
        fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
      }
      // 트레이 → 정답 자리로 끌기 (보통은 여유 칸 2)
      const { w, h } = shapeSize(orient(PIECES[s.pieceId].cells, s.orientation));
      const from = trayPosition(layout.slots[puzzle.pieceIds.indexOf(s.pieceId)], w, h);
      const to = { x: layout.boardX + s.at.x + 2, y: layout.boardY + s.at.y + 2 };
      const dx = (to.x - from.x) * scale;
      const dy = (to.y - from.y) * scale;
      fireEvent.pointerDown(piece, { pointerId: 200 + n, clientX: 0, clientY: 0 });
      fireEvent.pointerMove(svg, { pointerId: 200 + n, clientX: dx, clientY: dy });
      fireEvent.pointerUp(svg, { pointerId: 200 + n, clientX: dx, clientY: dy });
      expect(piece).toHaveAttribute('data-placed', 'yes');
    });

    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(screen.getByText('완성!')).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/games src/shell`
Expected: FAIL — `./registry`, `./PlayLayout`, `./PlayerArea`를 찾지 못함

- [ ] **Step 3: 계약·측정 훅 작성**

`src/games/types.ts`:

```ts
import type { ComponentType } from 'react';
import type { Difficulty } from '../lib/difficulty';

/** 셸이 플레이어 칸 하나에 넘겨주는 값. seed가 바뀌면 셸이 key로 다시 마운트한다 */
export type PlayerAreaProps = {
  difficulty: Difficulty;
  seed: number;
  /** false면 입력을 받지 않는다 (라운드 밖, 이미 푼 뒤) */
  active: boolean;
  /** 풀었을 때 한 번 부른다 */
  onSolved: () => void;
};

export type GameModule = {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  PlayerArea: ComponentType<PlayerAreaProps>;
};
```

`src/lib/useElementSize.ts`:

```ts
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
```

- [ ] **Step 4: 퍼즐 칸 구현**

`src/games/blocks/ui/PlayerArea.module.css`:

```css
.box {
  position: relative;
  width: 100%;
  height: 100%;
}

.svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.targetCell {
  fill: var(--target);
  stroke: var(--grid-line);
  stroke-width: 0.03;
}

.marginCell {
  fill: var(--margin-cell);
  stroke: var(--grid-line);
  stroke-width: 0.03;
}

.silhouette {
  fill: none;
  stroke: var(--target-edge);
  stroke-width: 0.14;
  stroke-linecap: square;
}

.silhouetteSolved {
  fill: none;
  stroke: var(--ok);
  stroke-width: 0.22;
  stroke-linecap: square;
}

.pieceOutline {
  fill: none;
  stroke: var(--ink);
  stroke-width: 0.07;
  stroke-linecap: square;
}

.pieceOutlineSelected {
  fill: none;
  stroke: var(--ink);
  stroke-width: 0.16;
  stroke-linecap: square;
  stroke-dasharray: 0.3 0.12;
}

.action rect {
  fill: var(--ink);
}

.action text {
  fill: #ffffff;
  font-size: 0.6px;
  font-weight: bold;
}

.actionDisabled rect {
  fill: var(--grid-line);
}

.actionDisabled text {
  fill: var(--ink-faint);
  font-size: 0.6px;
  font-weight: bold;
}

.solvedText {
  fill: var(--ok);
  font-size: 1.6px;
  font-weight: bold;
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 0.15px;
}
```

`src/games/blocks/ui/PieceView.tsx`:

```tsx
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { PieceState } from '../logic/play';
import { PIECES } from '../logic/pieces';
import { outlinePath } from '../logic/shape';
import { orient } from '../logic/transform';
import styles from './PlayerArea.module.css';

type Props = {
  piece: PieceState;
  x: number;
  y: number;
  selected: boolean;
  registerRef: (el: SVGGElement | null) => void;
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
};

export function PieceView({ piece, x, y, selected, registerRef, onPointerDown }: Props) {
  const def = PIECES[piece.pieceId];
  const cells = orient(def.cells, piece.orientation);
  return (
    <g
      ref={registerRef}
      transform={`translate(${x} ${y})`}
      onPointerDown={onPointerDown}
      data-testid="piece"
      data-piece={piece.pieceId}
      data-rotation={piece.orientation.rotation}
      data-flipped={piece.orientation.flipped ? 'yes' : 'no'}
      data-placed={piece.at ? 'yes' : 'no'}
    >
      {cells.map((c) => (
        // 칸 사이 가는 틈이 보이지 않게 살짝 겹친다
        <rect key={c.x + ',' + c.y} x={c.x} y={c.y} width={1.02} height={1.02} fill={def.color} />
      ))}
      <path d={outlinePath(cells)} className={selected ? styles.pieceOutlineSelected : styles.pieceOutline} />
    </g>
  );
}
```

`src/games/blocks/ui/PlayerArea.tsx`:

```tsx
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createRng } from '../../../lib/random';
import { useElementSize } from '../../../lib/useElementSize';
import { usePointerDrag } from '../../../lib/usePointerDrag';
import type { PlayerAreaProps } from '../../types';
import { boardAreaFor, placeModeOf } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { dropPiece, flipPiece, initialPieces, piecesSolved, rotatePiece } from '../logic/play';
import type { PieceState } from '../logic/play';
import { PIECES } from '../logic/pieces';
import { cellKey, outlinePath, shapeSize } from '../logic/shape';
import { orient } from '../logic/transform';
import type { PieceId } from '../logic/types';
import { bestLayout, cellSizeFor, trayPosition } from './layout';
import type { Layout, Point } from './layout';
import { PieceView } from './PieceView';
import styles from './PlayerArea.module.css';

const BUTTON_W = 3.6;
const BUTTON_H = 1.4;
const BUTTON_GAP = 0.6;

const translate = (p: Point) => `translate(${p.x} ${p.y})`;

/** 조각의 왼쪽 위 (SVG 좌표): 판 위면 판 칸, 아니면 자기 트레이 슬롯 가운데 */
function piecePosition(piece: PieceState, index: number, layout: Layout): Point {
  if (piece.at) return { x: layout.boardX + piece.at.x, y: layout.boardY + piece.at.y };
  const { w, h } = shapeSize(orient(PIECES[piece.pieceId].cells, piece.orientation));
  return trayPosition(layout.slots[index], w, h);
}

type ActionButtonProps = { x: number; y: number; label: string; disabled: boolean; onPress: () => void };

/** 여러 명이 동시에 만져도 동작하도록 click 대신 pointerdown에 반응한다 */
function ActionButton({ x, y, label, disabled, onPress }: ActionButtonProps) {
  return (
    <g
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      transform={translate({ x, y })}
      className={disabled ? styles.actionDisabled : styles.action}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!disabled) onPress();
      }}
    >
      <rect width={BUTTON_W} height={BUTTON_H} rx={0.3} />
      <text x={BUTTON_W / 2} y={BUTTON_H / 2} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}

function PlayerAreaImpl({ difficulty, seed, active, onSolved }: PlayerAreaProps) {
  const puzzle = useMemo(() => generatePuzzle(createRng(seed), difficulty), [seed, difficulty]);
  const area = useMemo(() => boardAreaFor(puzzle.target, difficulty), [puzzle, difficulty]);
  const boardCells = useMemo(() => {
    const targetKeys = new Set(area.target.map(cellKey));
    const out: { x: number; y: number; target: boolean }[] = [];
    for (let y = 0; y < area.height; y++) {
      for (let x = 0; x < area.width; x++) out.push({ x, y, target: targetKeys.has(cellKey({ x, y })) });
    }
    return out;
  }, [area]);
  const mode = placeModeOf(difficulty);

  const [pieces, setPieces] = useState<PieceState[]>(() => initialPieces(puzzle.pieceIds));
  const [selected, setSelected] = useState<PieceId | null>(null);
  const [dragging, setDragging] = useState<PieceId | null>(null);
  const { ref: boxRef, size } = useElementSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pieceEls = useRef(new Map<PieceId, SVGGElement>());
  const reported = useRef(false);

  const solved = piecesSolved(pieces, area);
  const canAct = active && !solved;
  const layout = bestLayout(area, pieces.length, size.width, size.height);
  /** 퍼즐 칸 하나의 화면 크기(px). 아직 못 쟀으면 1 */
  const scale = cellSizeFor(layout, size.width, size.height) || 1;

  useEffect(() => {
    if (solved && !reported.current) {
      reported.current = true;
      onSolved();
    }
  }, [solved, onSolved]);

  const positionOf = (id: PieceId): Point => {
    const i = pieces.findIndex((p) => p.pieceId === id);
    return piecePosition(pieces[i], i, layout);
  };
  const moveEl = (id: PieceId, p: Point) => pieceEls.current.get(id)?.setAttribute('transform', translate(p));

  const drag = usePointerDrag<PieceId>({
    onDragStart: (id) => setDragging(id),
    onDragMove: (id, dx, dy) => {
      const base = positionOf(id);
      // 끄는 동안은 React 렌더 없이 transform만 바꾼다 (약한 칠판 SoC 대비)
      moveEl(id, { x: base.x + dx / scale, y: base.y + dy / scale });
    },
    onDragEnd: (id, dx, dy) => {
      const base = positionOf(id);
      // 놓은 결과가 원래 자리와 같으면 React가 transform을 다시 쓰지 않으므로 직접 되돌린다
      moveEl(id, base);
      setDragging(null);
      if (!canAct) return;
      // + 0 은 -0 을 0 으로 바꾼다
      const at = {
        x: Math.round(base.x + dx / scale - layout.boardX) + 0,
        y: Math.round(base.y + dy / scale - layout.boardY) + 0,
      };
      setPieces((prev) => dropPiece(prev, id, at, area, mode));
    },
    onTap: (id) => {
      if (canAct) setPieces((prev) => rotatePiece(prev, id, area, mode));
    },
  });

  const onPiecePointerDown = (id: PieceId) => (e: ReactPointerEvent<SVGGElement>) => {
    if (!canAct || !svgRef.current) return;
    setSelected(id);
    drag.begin(e, id, svgRef.current);
  };

  const press = (action: 'rotate' | 'flip') => {
    if (!canAct || selected === null) return;
    const apply = action === 'rotate' ? rotatePiece : flipPiece;
    setPieces((prev) => apply(prev, selected, area, mode));
  };

  const ordered = dragging
    ? [...pieces.filter((p) => p.pieceId !== dragging), ...pieces.filter((p) => p.pieceId === dragging)]
    : pieces;
  const showFlip = difficulty !== 'easy';
  const buttonCount = showFlip ? 2 : 1;
  const buttonsX = (layout.width - (buttonCount * BUTTON_W + (buttonCount - 1) * BUTTON_GAP)) / 2;
  const buttonY = layout.actionY + (2 - BUTTON_H) / 2;
  const buttonsDisabled = !canAct || selected === null;

  return (
    <div ref={boxRef} className={styles.box}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMax meet"
        onPointerMove={drag.move}
        onPointerUp={drag.end}
        onPointerCancel={drag.cancel}
        data-testid="puzzle-svg"
      >
        <g transform={translate({ x: layout.boardX, y: layout.boardY })}>
          {boardCells.map((c) => (
            <rect
              key={c.x + ',' + c.y}
              x={c.x}
              y={c.y}
              width={1}
              height={1}
              className={c.target ? styles.targetCell : styles.marginCell}
              data-testid={c.target ? 'target-cell' : 'outside-cell'}
            />
          ))}
          <path d={outlinePath(area.target)} className={solved ? styles.silhouetteSolved : styles.silhouette} />
        </g>

        <ActionButton
          x={buttonsX}
          y={buttonY}
          label="돌리기"
          disabled={buttonsDisabled}
          onPress={() => press('rotate')}
        />
        {showFlip && (
          <ActionButton
            x={buttonsX + BUTTON_W + BUTTON_GAP}
            y={buttonY}
            label="뒤집기"
            disabled={buttonsDisabled}
            onPress={() => press('flip')}
          />
        )}

        {ordered.map((piece) => {
          const index = pieces.indexOf(piece);
          return (
            <PieceView
              key={piece.pieceId}
              piece={piece}
              {...piecePosition(piece, index, layout)}
              selected={selected === piece.pieceId}
              registerRef={(el) => {
                if (el) pieceEls.current.set(piece.pieceId, el);
                else pieceEls.current.delete(piece.pieceId);
              }}
              onPointerDown={onPiecePointerDown(piece.pieceId)}
            />
          );
        })}

        {solved && (
          <text
            x={layout.boardX + area.width / 2}
            y={layout.boardY + area.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className={styles.solvedText}
          >
            완성!
          </text>
        )}
      </svg>
    </div>
  );
}

/** 셸의 타이머가 매 초 다시 그려도 퍼즐 칸은 props가 바뀔 때만 다시 그린다 */
export const PlayerArea = memo(PlayerAreaImpl);
```

- [ ] **Step 5: 게임 등록과 칸 분할 구현**

`src/games/blocks/index.ts` (Task 3에서 최대 동시 터치가 4 미만이었으면 `maxPlayers`를 그 수로):

```ts
import type { GameModule } from '../types';
import { PlayerArea } from './ui/PlayerArea';

export const blocksGame: GameModule = {
  id: 'blocks',
  name: '블록 퍼즐',
  description: '조각을 돌리고 뒤집어 모양을 빈틈없이 채워요',
  minPlayers: 1,
  maxPlayers: 4,
  PlayerArea,
};
```

`src/games/registry.ts`:

```ts
import { blocksGame } from './blocks';
import type { GameModule } from './types';

/** 새 게임은 src/games/<id>/index.ts 에 GameModule을 만들고 여기에 추가한다 */
export const GAMES: readonly GameModule[] = [blocksGame];

export function findGame(id: string): GameModule | undefined {
  return GAMES.find((g) => g.id === id);
}
```

`src/shell/ui/colors.ts`:

```ts
/** docs/UI_GUIDE.md 플레이어 색 */
export const PLAYER_COLORS: readonly string[] = ['#E5483B', '#2F80ED', '#27AE60', '#F2994A'];
```

`src/shell/ui/PlayLayout.module.css`:

```css
/* 칸은 가로로만 나란히 (2x2 금지: 벽걸이 칠판 윗줄에 아이 손이 닿지 않음) */
.columns {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.column {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
  background: var(--panel);
  border-right: 4px solid var(--ink);
}

.column:last-child {
  border-right: none;
}

/* 위쪽 1/3: 보기 전용 */
.head {
  flex: 1 1 0;
  min-height: 0;
  border-top: 0.6rem solid var(--ink);
  padding: 0.6rem 0.8rem;
  overflow: hidden;
}

/* 아래쪽 2/3: 아이 손이 닿는 조작 영역 */
.body {
  position: relative;
  flex: 2 1 0;
  min-height: 0;
}
```

`src/shell/ui/PlayLayout.tsx`:

```tsx
import type { ReactNode } from 'react';
import styles from './PlayLayout.module.css';

export type Column = { key: string; color: string; header: ReactNode; body: ReactNode };

/** 플레이어 칸을 가로로 나란히. 각 칸 위 1/3은 정보, 아래 2/3은 조작 영역 */
export function PlayLayout({ columns }: { columns: Column[] }) {
  return (
    <div className={styles.columns}>
      {columns.map((c) => (
        <section key={c.key} className={styles.column} data-testid="player-column">
          <div className={styles.head} style={{ borderTopColor: c.color }}>
            {c.header}
          </div>
          <div className={styles.body}>{c.body}</div>
        </section>
      ))}
    </div>
  );
}
```

Run: `npx vitest run src/games src/shell`
Expected: PASS

- [ ] **Step 6: 임시 터치 시험 화면 — 테스트 먼저**

`src/App.test.tsx`를 바꾼다:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App (터치 시험 화면)', () => {
  it('기본 2명 칸에 퍼즐을 하나씩 그린다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /터치 시험/ })).toBeInTheDocument();
    expect(screen.getAllByTestId('player-column')).toHaveLength(2);
    expect(screen.getAllByTestId('puzzle-svg')).toHaveLength(2);
  });

  it('4명을 누르면 칸이 4개가 된다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '4명' }));
    expect(screen.getAllByTestId('player-column')).toHaveLength(4);
  });
});
```

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `/터치 시험/` 제목을 찾지 못함

- [ ] **Step 7: 임시 터치 시험 화면 구현**

`src/App.tsx`를 바꾼다:

```tsx
import { useState } from 'react';
import { blocksGame } from './games/blocks';
import { DIFFICULTIES, DIFFICULTY_LABEL } from './lib/difficulty';
import type { Difficulty } from './lib/difficulty';
import { deriveSeed } from './lib/random';
import { PLAYER_COLORS } from './shell/ui/colors';
import { PlayLayout } from './shell/ui/PlayLayout';

const noop = () => {};
const { PlayerArea } = blocksGame;

/** 임시 터치 시험 화면 — 셸(메뉴·설정·대결)이 생기면 교체한다 */
export default function App() {
  const [players, setPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [round, setRound] = useState(1);

  return (
    <div className="app touch-test">
      <div className="touch-test-bar">
        <h1>우리집 보드게임 · 터치 시험</h1>
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" className="btn" aria-pressed={players === n} onClick={() => setPlayers(n)}>
            {n}명
          </button>
        ))}
        {DIFFICULTIES.map((d) => (
          <button key={d} type="button" className="btn" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
        <button type="button" className="btn" onClick={() => setRound((r) => r + 1)}>
          새 문제
        </button>
      </div>
      <div className="touch-test-play">
        <PlayLayout
          columns={Array.from({ length: players }, (_, i) => ({
            key: String(i),
            color: PLAYER_COLORS[i],
            header: <strong>{i + 1}번</strong>,
            body: (
              <PlayerArea
                key={round + '-' + difficulty}
                difficulty={difficulty}
                seed={deriveSeed(round, i)}
                active
                onSolved={noop}
              />
            ),
          }))}
        />
      </div>
    </div>
  );
}
```

`src/styles.css` 끝에 추가:

```css
.btn {
  min-height: 3rem;
  padding: 0 1.2rem;
  margin: 0 0.5rem 0.5rem 0;
  border: 3px solid var(--ink);
  border-radius: 12px;
  background: var(--panel);
  font-weight: bold;
}

.btn:active {
  transform: translateY(2px);
}

.btn[aria-pressed='true'],
.btn-primary {
  background: var(--ink);
  color: #ffffff;
}

.btn:disabled {
  opacity: 0.4;
}

/* 임시 터치 시험 화면 — 셸이 생기면 지운다 */
.touch-test {
  display: flex;
  flex-direction: column;
}

.touch-test-bar {
  flex: 0 0 auto;
  padding: 0.5rem 1rem 0 1rem;
}

.touch-test-bar h1 {
  font-size: 1.4rem;
  margin: 0 0 0.5rem 0;
}

.touch-test-play {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}
```

- [ ] **Step 8: 전체 검증**

Run: `npm run lint && npm test && npm run build`
Expected: 모두 통과

Run: `npm run dev` → 브라우저 개발자도구의 기기 에뮬레이션(터치)으로 `http://localhost:5173/boardgame/` 확인: 조각 끌기, 탭으로 회전, 돌리기·뒤집기 버튼, 정답 시 "완성!".

- [ ] **Step 9: 커밋·배포**

```bash
git add src
git commit -m "feat: 블록 퍼즐 플레이어 칸 UI와 임시 터치 시험 화면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

`gh run watch`로 배포 성공 확인.

- [ ] **Step 10: 칠판 터치 시험 (사용자 작업)**

사용자에게 요청: "칠판에서 `paurrr.github.io/boardgame/`을 열고 확인해 주세요: ① 4명을 누르고 네 칸에서 동시에 조각 끌기 ② 조각 톡 치기로 회전 ③ 돌리기·뒤집기 버튼 ④ 퍼즐 하나 완성해서 '완성!' 보기 ⑤ 쉬움/보통/어려움 전환 ⑥ 끌 때 끊기거나 느린지". 문제가 나오면 superpowers:systematic-debugging으로 원인을 찾아 고친 뒤 다음 Task로 간다.

---

### Task 11: 판 진행 로직 (라운드·점수·시간)

**Files:**
- Create: `src/shell/logic/match.ts`
- Test: `src/shell/logic/match.test.ts`

**Interfaces:**
- Consumes: `Difficulty`, `deriveSeed`(Task 4)
- Produces:
  - 타입: `PlayerConfig { name, difficulty }`, `MatchConfig { gameId, players, rounds, timeLimitSec }`, `Phase`(`countdown|playing|roundResult|final`), `MatchState`, `MatchAction`(`START_ROUND{now}`, `SOLVED{player, now}`, `TIME_UP`, `NEXT_ROUND`)
  - 상수: `COUNTDOWN_SECONDS = 3`, `ROUND_OPTIONS = [3,5,9]`, `TIME_OPTIONS = [60,90,120]`
  - `createMatch(config, seed)`, `matchReducer(state, action)`, `roundPoints(solveOrder, n)`(3/2/1/0), `remainingMs(state, now)`(0~제한시간), `playerSeed(state, player)`, `winners(totals)`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/shell/logic/match.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createMatch, matchReducer, playerSeed, remainingMs, roundPoints, winners } from './match';
import type { MatchConfig, MatchState } from './match';

const config = (players: number, rounds = 3): MatchConfig => ({
  gameId: 'blocks',
  players: Array.from({ length: players }, (_, i) => ({ name: `P${i + 1}`, difficulty: 'normal' as const })),
  rounds,
  timeLimitSec: 90,
});

const playing = (players: number, rounds = 3, now = 1000): MatchState =>
  matchReducer(createMatch(config(players, rounds), 42), { type: 'START_ROUND', now });

describe('roundPoints', () => {
  it('1등 3점, 2등 2점, 그 뒤로 푼 사람 1점, 못 풀면 0점', () => {
    expect(roundPoints([2, 0, 3, 1], 5)).toEqual([2, 1, 3, 1, 0]);
  });

  it('아무도 못 풀면 모두 0점', () => {
    expect(roundPoints([], 3)).toEqual([0, 0, 0]);
  });
});

describe('createMatch', () => {
  it('1라운드 카운트다운에서 시작하고 점수는 0', () => {
    const s = createMatch(config(3), 7);
    expect(s.phase).toBe('countdown');
    expect(s.round).toBe(1);
    expect(s.totals).toEqual([0, 0, 0]);
    expect(s.solveTimesMs).toEqual([null, null, null]);
  });
});

describe('matchReducer', () => {
  it('START_ROUND: 카운트다운 → 플레이, 시작 시각 기록', () => {
    const s = playing(2, 3, 5000);
    expect(s.phase).toBe('playing');
    expect(s.roundStartedAt).toBe(5000);
  });

  it('START_ROUND는 카운트다운이 아닐 때 무시한다', () => {
    const s = playing(2);
    expect(matchReducer(s, { type: 'START_ROUND', now: 9999 })).toBe(s);
  });

  it('SOLVED: 푼 순서와 걸린 시간을 기록한다', () => {
    const s = matchReducer(playing(3, 3, 1000), { type: 'SOLVED', player: 1, now: 13500 });
    expect(s.solveOrder).toEqual([1]);
    expect(s.solveTimesMs).toEqual([null, 12500, null]);
    expect(s.phase).toBe('playing');
  });

  it('SOLVED: 같은 사람이 두 번 풀어도 한 번만 센다', () => {
    const once = matchReducer(playing(3), { type: 'SOLVED', player: 1, now: 2000 });
    expect(matchReducer(once, { type: 'SOLVED', player: 1, now: 3000 })).toBe(once);
  });

  it('SOLVED: 없는 플레이어 번호나 플레이 중이 아닐 때는 무시한다', () => {
    const s = playing(2);
    expect(matchReducer(s, { type: 'SOLVED', player: 5, now: 2000 })).toBe(s);
    const countdown = createMatch(config(2), 1);
    expect(matchReducer(countdown, { type: 'SOLVED', player: 0, now: 2000 })).toBe(countdown);
  });

  it('모두 풀면 라운드가 끝나고 점수가 더해진다', () => {
    let s = playing(3);
    s = matchReducer(s, { type: 'SOLVED', player: 2, now: 2000 });
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 3000 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 4000 });
    expect(s.phase).toBe('roundResult');
    expect(s.roundPoints).toEqual([2, 1, 3]);
    expect(s.totals).toEqual([2, 1, 3]);
  });

  it('TIME_UP: 못 푼 사람은 0점으로 라운드를 끝낸다', () => {
    let s = matchReducer(playing(3), { type: 'SOLVED', player: 1, now: 2000 });
    s = matchReducer(s, { type: 'TIME_UP' });
    expect(s.phase).toBe('roundResult');
    expect(s.roundPoints).toEqual([0, 3, 0]);
  });

  it('TIME_UP은 플레이 중이 아니면 무시한다', () => {
    const s = createMatch(config(2), 1);
    expect(matchReducer(s, { type: 'TIME_UP' })).toBe(s);
  });

  it('혼자 하면 풀자마자 라운드가 끝난다', () => {
    const s = matchReducer(playing(1), { type: 'SOLVED', player: 0, now: 4000 });
    expect(s.phase).toBe('roundResult');
    expect(s.totals).toEqual([3]);
  });

  it('NEXT_ROUND: 다음 라운드 카운트다운으로 가며 라운드 기록을 비운다', () => {
    let s = matchReducer(playing(2), { type: 'TIME_UP' });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('countdown');
    expect(s.round).toBe(2);
    expect(s.solveOrder).toEqual([]);
    expect(s.solveTimesMs).toEqual([null, null]);
    expect(s.roundStartedAt).toBeNull();
  });

  it('NEXT_ROUND: 마지막 라운드 뒤에는 최종 결과', () => {
    let s = matchReducer(playing(2, 1), { type: 'TIME_UP' });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('final');
  });

  it('NEXT_ROUND는 라운드 결과 화면이 아니면 무시한다', () => {
    const s = playing(2);
    expect(matchReducer(s, { type: 'NEXT_ROUND' })).toBe(s);
  });

  it('점수는 라운드를 넘어 누적된다', () => {
    let s = playing(2, 3, 0);
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 1 });
    s = matchReducer(s, { type: 'TIME_UP' });
    s = matchReducer(s, { type: 'NEXT_ROUND' });
    s = matchReducer(s, { type: 'START_ROUND', now: 100 });
    s = matchReducer(s, { type: 'SOLVED', player: 1, now: 200 });
    s = matchReducer(s, { type: 'SOLVED', player: 0, now: 300 });
    expect(s.totals).toEqual([5, 3]);
  });
});

describe('remainingMs', () => {
  it('플레이 중에는 시작 시각부터 줄어든다', () => {
    const s = playing(2, 3, 1000);
    expect(remainingMs(s, 1000)).toBe(90000);
    expect(remainingMs(s, 31000)).toBe(60000);
  });

  it('0 아래로 내려가지 않는다', () => {
    expect(remainingMs(playing(2, 3, 0), 999999)).toBe(0);
  });

  it('시작 시각보다 이른 시각을 받아도 제한시간을 넘지 않는다', () => {
    expect(remainingMs(playing(2, 3, 5000), 4000)).toBe(90000);
  });

  it('플레이 중이 아니면 제한시간 전체', () => {
    expect(remainingMs(createMatch(config(2), 1), 0)).toBe(90000);
  });
});

describe('winners', () => {
  it('최고점인 사람들 (동점이면 여럿)', () => {
    expect(winners([5, 9, 3])).toEqual([1]);
    expect(winners([7, 2, 7])).toEqual([0, 2]);
  });
});

describe('playerSeed', () => {
  it('같은 판·라운드·플레이어면 같고, 하나라도 다르면 다르다', () => {
    const s = playing(2);
    expect(playerSeed(s, 0)).toBe(playerSeed(s, 0));
    expect(playerSeed(s, 0)).not.toBe(playerSeed(s, 1));
    const next = matchReducer(matchReducer(matchReducer(s, { type: 'TIME_UP' }), { type: 'NEXT_ROUND' }), {
      type: 'START_ROUND',
      now: 0,
    });
    expect(playerSeed(next, 0)).not.toBe(playerSeed(s, 0));
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/shell/logic/match.test.ts`
Expected: FAIL — `Failed to resolve import "./match"`

- [ ] **Step 3: 구현**

`src/shell/logic/match.ts`:

```ts
import type { Difficulty } from '../../lib/difficulty';
import { deriveSeed } from '../../lib/random';

export type PlayerConfig = { name: string; difficulty: Difficulty };

export type MatchConfig = {
  gameId: string;
  players: PlayerConfig[];
  rounds: number;
  timeLimitSec: number;
};

export type Phase = 'countdown' | 'playing' | 'roundResult' | 'final';

export type MatchState = {
  config: MatchConfig;
  /** 판 전체 시드 — 플레이어별 퍼즐 시드는 여기서 파생 */
  seed: number;
  phase: Phase;
  /** 1부터 */
  round: number;
  roundStartedAt: number | null;
  /** 이번 라운드에 푼 플레이어 번호, 푼 순서대로 */
  solveOrder: number[];
  /** 이번 라운드 플레이어별 걸린 시간(ms), 못 풀었으면 null */
  solveTimesMs: (number | null)[];
  /** 방금 끝난 라운드에서 얻은 점수 */
  roundPoints: number[];
  totals: number[];
};

export type MatchAction =
  | { type: 'START_ROUND'; now: number }
  | { type: 'SOLVED'; player: number; now: number }
  | { type: 'TIME_UP' }
  | { type: 'NEXT_ROUND' };

export const COUNTDOWN_SECONDS = 3;
export const ROUND_OPTIONS: readonly number[] = [3, 5, 9];
export const TIME_OPTIONS: readonly number[] = [60, 90, 120];

export function createMatch(config: MatchConfig, seed: number): MatchState {
  const n = config.players.length;
  return {
    config,
    seed,
    phase: 'countdown',
    round: 1,
    roundStartedAt: null,
    solveOrder: [],
    solveTimesMs: new Array<number | null>(n).fill(null),
    roundPoints: new Array<number>(n).fill(0),
    totals: new Array<number>(n).fill(0),
  };
}

/** 1등 3점, 2등 2점, 그 뒤로 푼 사람 1점, 못 풀면 0점 */
export function roundPoints(solveOrder: readonly number[], playerCount: number): number[] {
  const points = new Array<number>(playerCount).fill(0);
  solveOrder.forEach((player, rank) => {
    points[player] = rank === 0 ? 3 : rank === 1 ? 2 : 1;
  });
  return points;
}

function finishRound(state: MatchState): MatchState {
  const points = roundPoints(state.solveOrder, state.config.players.length);
  return {
    ...state,
    phase: 'roundResult',
    roundPoints: points,
    totals: state.totals.map((t, i) => t + points[i]),
  };
}

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'START_ROUND':
      if (state.phase !== 'countdown') return state;
      return { ...state, phase: 'playing', roundStartedAt: action.now };

    case 'SOLVED': {
      if (state.phase !== 'playing' || state.roundStartedAt === null) return state;
      if (action.player < 0 || action.player >= state.config.players.length) return state;
      if (state.solveOrder.includes(action.player)) return state;
      const solveTimesMs = state.solveTimesMs.slice();
      solveTimesMs[action.player] = action.now - state.roundStartedAt;
      const next = { ...state, solveOrder: [...state.solveOrder, action.player], solveTimesMs };
      return next.solveOrder.length === state.config.players.length ? finishRound(next) : next;
    }

    case 'TIME_UP':
      return state.phase === 'playing' ? finishRound(state) : state;

    case 'NEXT_ROUND':
      if (state.phase !== 'roundResult') return state;
      if (state.round >= state.config.rounds) return { ...state, phase: 'final' };
      return {
        ...state,
        phase: 'countdown',
        round: state.round + 1,
        roundStartedAt: null,
        solveOrder: [],
        solveTimesMs: state.solveTimesMs.map(() => null),
        roundPoints: state.roundPoints.map(() => 0),
      };
  }
}

/** 남은 시간(ms). 플레이 중이 아니면 제한시간 전체, 0~제한시간 사이로 자른다 */
export function remainingMs(state: MatchState, now: number): number {
  const limit = state.config.timeLimitSec * 1000;
  if (state.phase !== 'playing' || state.roundStartedAt === null) return limit;
  return Math.min(limit, Math.max(0, limit - (now - state.roundStartedAt)));
}

export function playerSeed(state: MatchState, player: number): number {
  return deriveSeed(state.seed, state.round, player);
}

/** 최고점인 플레이어 번호들 (동점이면 공동 우승) */
export function winners(totals: readonly number[]): number[] {
  const best = Math.max(...totals);
  const out: number[] = [];
  totals.forEach((t, i) => {
    if (t === best) out.push(i);
  });
  return out;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/shell/logic/match.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/shell/logic/match.ts src/shell/logic/match.test.ts
git commit -m "feat: 라운드제 판 진행과 점수 계산" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 설정·최고기록 저장과 시간 표시

**Files:**
- Create: `src/lib/storage.ts`, `src/shell/logic/setup.ts`, `src/shell/logic/persistence.ts`, `src/shell/logic/format.ts`
- Test: `src/shell/logic/setup.test.ts`, `src/shell/logic/persistence.test.ts`, `src/shell/logic/format.test.ts`

**Interfaces:**
- Consumes: `PlayerConfig`, `MatchConfig`, `ROUND_OPTIONS`, `TIME_OPTIONS`(Task 11), `DIFFICULTIES`, `isDifficulty`(Task 4)
- Produces:
  - `lib/storage.ts`: `type KeyValueStore { getItem, setItem }`, `memoryStore()`, `browserStore()`(localStorage, 안 되면 메모리)
  - `setup.ts`: `type SavedSetup { players, rounds, timeLimitSec }`, `MAX_NAME_LENGTH = 8`, `defaultName(i)`, `defaultSetup()`(2명·보통·5판·90초), `resizePlayers(players, n)`, `finalizeSetup(setup)`, `toMatchConfig(gameId, setup)`
  - `persistence.ts`: `loadSetup(store) → SavedSetup | null`(형식 검사), `saveSetup(store, setup)`, `type BestTimes`, `loadBestTimes(store)`, `recordBestTime(store, difficulty, ms) → 새 기록이면 true`
  - `format.ts`: `formatClock(ms) → 'm:ss'`(올림), `formatSeconds(ms) → '12.3초'`

- [ ] **Step 1: setup 테스트 작성 → 실패 확인**

`src/shell/logic/setup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { defaultName, defaultSetup, finalizeSetup, MAX_NAME_LENGTH, resizePlayers, toMatchConfig } from './setup';

describe('defaultSetup', () => {
  it('2명, 보통, 5라운드, 90초', () => {
    expect(defaultSetup()).toEqual({
      players: [
        { name: '플레이어 1', difficulty: 'normal' },
        { name: '플레이어 2', difficulty: 'normal' },
      ],
      rounds: 5,
      timeLimitSec: 90,
    });
  });
});

describe('resizePlayers', () => {
  const two = defaultSetup().players.map((p, i) => (i === 0 ? { name: '민준', difficulty: 'easy' as const } : p));

  it('늘리면 기존 플레이어는 두고 기본값을 붙인다', () => {
    expect(resizePlayers(two, 3)).toEqual([...two, { name: defaultName(2), difficulty: 'normal' }]);
  });

  it('줄이면 앞에서부터 남긴다', () => {
    expect(resizePlayers(two, 1)).toEqual([two[0]]);
  });
});

describe('finalizeSetup', () => {
  it('빈 이름은 기본 이름으로, 앞뒤 공백은 지운다', () => {
    const out = finalizeSetup({
      players: [
        { name: '  ', difficulty: 'easy' },
        { name: ' 서연 ', difficulty: 'hard' },
      ],
      rounds: 3,
      timeLimitSec: 60,
    });
    expect(out.players).toEqual([
      { name: '플레이어 1', difficulty: 'easy' },
      { name: '서연', difficulty: 'hard' },
    ]);
  });

  it('긴 이름은 자른다', () => {
    const out = finalizeSetup({ players: [{ name: '가나다라마바사아자차카', difficulty: 'easy' }], rounds: 3, timeLimitSec: 60 });
    expect(out.players[0].name).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('toMatchConfig', () => {
  it('게임 id를 붙인다', () => {
    expect(toMatchConfig('blocks', defaultSetup())).toEqual({ gameId: 'blocks', ...defaultSetup() });
  });
});
```

Run: `npx vitest run src/shell/logic/setup.test.ts`
Expected: FAIL — `Failed to resolve import "./setup"`

- [ ] **Step 2: setup 구현 → 통과 확인**

`src/shell/logic/setup.ts`:

```ts
import type { MatchConfig, PlayerConfig } from './match';

/** 플레이어 설정 화면에서 고르는 값 (저장해 두고 다음에 다시 쓴다) */
export type SavedSetup = { players: PlayerConfig[]; rounds: number; timeLimitSec: number };

export const MAX_NAME_LENGTH = 8;

export function defaultName(index: number): string {
  return '플레이어 ' + (index + 1);
}

export function defaultSetup(): SavedSetup {
  return {
    players: [
      { name: defaultName(0), difficulty: 'normal' },
      { name: defaultName(1), difficulty: 'normal' },
    ],
    rounds: 5,
    timeLimitSec: 90,
  };
}

/** 인원 수를 바꾼다. 기존 플레이어는 그대로 두고 모자라면 기본값으로 채운다 */
export function resizePlayers(players: readonly PlayerConfig[], count: number): PlayerConfig[] {
  const out = players.slice(0, count);
  for (let i = out.length; i < count; i++) out.push({ name: defaultName(i), difficulty: 'normal' });
  return out;
}

/** 시작 직전 정리: 이름 공백 제거, 빈 이름은 기본 이름, 너무 길면 자르기 */
export function finalizeSetup(setup: SavedSetup): SavedSetup {
  return {
    ...setup,
    players: setup.players.map((p, i) => ({
      name: (p.name.trim() || defaultName(i)).slice(0, MAX_NAME_LENGTH),
      difficulty: p.difficulty,
    })),
  };
}

export function toMatchConfig(gameId: string, setup: SavedSetup): MatchConfig {
  return { gameId, players: setup.players, rounds: setup.rounds, timeLimitSec: setup.timeLimitSec };
}
```

Run: `npx vitest run src/shell/logic/setup.test.ts`
Expected: PASS

- [ ] **Step 3: 저장 테스트 작성 → 실패 확인**

`src/shell/logic/persistence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { browserStore, memoryStore } from '../../lib/storage';
import type { KeyValueStore } from '../../lib/storage';
import { loadBestTimes, loadSetup, recordBestTime, saveSetup } from './persistence';
import { defaultSetup } from './setup';

const SETUP_KEY = 'boardgame.setup.v1';

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('storage', () => {
  it('memoryStore는 넣은 값을 돌려준다', () => {
    const s = memoryStore();
    expect(s.getItem('a')).toBeNull();
    s.setItem('a', '1');
    expect(s.getItem('a')).toBe('1');
  });

  it('browserStore는 jsdom에서 localStorage를 쓴다', () => {
    const s = browserStore();
    s.setItem('x', 'y');
    expect(window.localStorage.getItem('x')).toBe('y');
  });
});

describe('setup 저장', () => {
  it('저장한 설정을 그대로 불러온다', () => {
    const store = memoryStore();
    const setup = { ...defaultSetup(), rounds: 9 };
    saveSetup(store, setup);
    expect(loadSetup(store)).toEqual(setup);
  });

  it('저장된 게 없으면 null', () => {
    expect(loadSetup(memoryStore())).toBeNull();
  });

  it.each([
    ['깨진 JSON', '{oops'],
    ['배열', '[]'],
    ['플레이어 0명', JSON.stringify({ players: [], rounds: 5, timeLimitSec: 90 })],
    ['플레이어 5명', JSON.stringify({ ...defaultSetup(), players: new Array(5).fill(defaultSetup().players[0]) })],
    ['모르는 난이도', JSON.stringify({ ...defaultSetup(), players: [{ name: 'a', difficulty: 'expert' }] })],
    ['이름이 문자열이 아님', JSON.stringify({ ...defaultSetup(), players: [{ name: 3, difficulty: 'easy' }] })],
    ['없는 라운드 수', JSON.stringify({ ...defaultSetup(), rounds: 4 })],
    ['없는 제한시간', JSON.stringify({ ...defaultSetup(), timeLimitSec: 30 })],
  ])('%s이면 null', (_name, raw) => {
    const store = memoryStore();
    store.setItem(SETUP_KEY, raw);
    expect(loadSetup(store)).toBeNull();
  });

  it('저장소가 막혀 있어도 에러 없이 null', () => {
    expect(() => saveSetup(throwingStore, defaultSetup())).not.toThrow();
    expect(loadSetup(throwingStore)).toBeNull();
  });
});

describe('최고기록', () => {
  it('처음 기록은 새 기록', () => {
    const store = memoryStore();
    expect(recordBestTime(store, 'easy', 12000)).toBe(true);
    expect(loadBestTimes(store)).toEqual({ easy: 12000 });
  });

  it('더 느리면 새 기록이 아니고, 더 빠르면 새 기록', () => {
    const store = memoryStore();
    recordBestTime(store, 'normal', 20000);
    expect(recordBestTime(store, 'normal', 25000)).toBe(false);
    expect(recordBestTime(store, 'normal', 15000)).toBe(true);
    expect(loadBestTimes(store).normal).toBe(15000);
  });

  it('난이도별로 따로 저장한다', () => {
    const store = memoryStore();
    recordBestTime(store, 'easy', 5000);
    recordBestTime(store, 'hard', 50000);
    expect(loadBestTimes(store)).toEqual({ easy: 5000, hard: 50000 });
  });

  it('0 이하나 숫자가 아닌 시간은 무시한다', () => {
    const store = memoryStore();
    expect(recordBestTime(store, 'easy', 0)).toBe(false);
    expect(recordBestTime(store, 'easy', Number.NaN)).toBe(false);
    expect(loadBestTimes(store)).toEqual({});
  });

  it('깨진 기록 데이터는 빈 기록으로 본다', () => {
    const store = memoryStore();
    store.setItem('boardgame.blocks.best.v1', '{"easy":"fast","normal":-1}');
    expect(loadBestTimes(store)).toEqual({});
  });

  it('저장소가 막혀 있어도 에러 없이 동작한다', () => {
    expect(() => recordBestTime(throwingStore, 'easy', 1000)).not.toThrow();
    expect(loadBestTimes(throwingStore)).toEqual({});
  });
});
```

Run: `npx vitest run src/shell/logic/persistence.test.ts`
Expected: FAIL — `Failed to resolve import "../../lib/storage"`

- [ ] **Step 4: 저장 구현 → 통과 확인**

`src/lib/storage.ts`:

```ts
export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

/** localStorage를 쓸 수 없으면(사생활 보호 모드 등) 메모리에만 저장한다 */
export function browserStore(): KeyValueStore {
  try {
    const ls = window.localStorage;
    ls.setItem('__probe__', '1');
    ls.removeItem('__probe__');
    return ls;
  } catch {
    return memoryStore();
  }
}
```

`src/shell/logic/persistence.ts`:

```ts
import { DIFFICULTIES, isDifficulty } from '../../lib/difficulty';
import type { Difficulty } from '../../lib/difficulty';
import type { KeyValueStore } from '../../lib/storage';
import type { PlayerConfig } from './match';
import { ROUND_OPTIONS, TIME_OPTIONS } from './match';
import { MAX_NAME_LENGTH } from './setup';
import type { SavedSetup } from './setup';

const SETUP_KEY = 'boardgame.setup.v1';
const BEST_KEY = 'boardgame.blocks.best.v1';

export type BestTimes = Partial<Record<Difficulty, number>>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 무시한다 (게임은 계속)
  }
}

/** 저장된 설정. 없거나 형식이 맞지 않으면 null */
export function loadSetup(store: KeyValueStore): SavedSetup | null {
  const data = readJson(store, SETUP_KEY);
  if (!isRecord(data)) return null;
  const { players, rounds, timeLimitSec } = data;
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) return null;
  const parsed: PlayerConfig[] = [];
  for (const p of players) {
    if (!isRecord(p) || typeof p.name !== 'string' || !isDifficulty(p.difficulty)) return null;
    parsed.push({ name: p.name.slice(0, MAX_NAME_LENGTH), difficulty: p.difficulty });
  }
  if (typeof rounds !== 'number' || !ROUND_OPTIONS.includes(rounds)) return null;
  if (typeof timeLimitSec !== 'number' || !TIME_OPTIONS.includes(timeLimitSec)) return null;
  return { players: parsed, rounds, timeLimitSec };
}

export function saveSetup(store: KeyValueStore, setup: SavedSetup): void {
  writeJson(store, SETUP_KEY, setup);
}

export function loadBestTimes(store: KeyValueStore): BestTimes {
  const data = readJson(store, BEST_KEY);
  const out: BestTimes = {};
  if (!isRecord(data)) return out;
  for (const d of DIFFICULTIES) {
    const v = data[d];
    if (typeof v === 'number' && isFinite(v) && v > 0) out[d] = v;
  }
  return out;
}

/** 1인 모드 한 문제 기록. 최고기록을 깼으면 저장하고 true */
export function recordBestTime(store: KeyValueStore, difficulty: Difficulty, ms: number): boolean {
  if (!isFinite(ms) || ms <= 0) return false;
  const best = loadBestTimes(store);
  const prev = best[difficulty];
  if (prev !== undefined && prev <= ms) return false;
  best[difficulty] = ms;
  writeJson(store, BEST_KEY, best);
  return true;
}
```

Run: `npx vitest run src/shell/logic/persistence.test.ts`
Expected: PASS

- [ ] **Step 5: 시간 표시 테스트 작성 → 실패 확인**

`src/shell/logic/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatClock, formatSeconds } from './format';

describe('formatClock', () => {
  it('남은 시간을 m:ss로, 초는 올림', () => {
    expect(formatClock(90000)).toBe('1:30');
    expect(formatClock(59001)).toBe('1:00');
    expect(formatClock(9000)).toBe('0:09');
    expect(formatClock(0)).toBe('0:00');
  });

  it('음수는 0:00', () => {
    expect(formatClock(-500)).toBe('0:00');
  });
});

describe('formatSeconds', () => {
  it('걸린 시간을 소수 첫째 자리 초로', () => {
    expect(formatSeconds(12345)).toBe('12.3초');
    expect(formatSeconds(5000)).toBe('5.0초');
  });
});
```

Run: `npx vitest run src/shell/logic/format.test.ts`
Expected: FAIL — `Failed to resolve import "./format"`

- [ ] **Step 6: 시간 표시 구현 → 통과 확인**

`src/shell/logic/format.ts`:

```ts
/** 남은 시간 표시: m:ss (초는 올림) */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

/** 걸린 시간 표시: 12.3초 */
export function formatSeconds(ms: number): string {
  return (Math.round(ms / 100) / 10).toFixed(1) + '초';
}
```

Run: `npx vitest run src/shell/logic`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add src/lib/storage.ts src/shell/logic
git commit -m "feat: 플레이어 설정·최고기록 저장과 시간 표시" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 효과음과 전체화면

**Files:**
- Create: `src/lib/sound.ts`, `src/lib/fullscreen.ts`
- Test: `src/lib/sound.test.ts`, `src/lib/fullscreen.test.ts`

**Interfaces:**
- Produces:
  - `sound.ts`: `unlockAudio()`(첫 터치 때), `setMuted(v)`, `isMuted()`, `sounds.{tick, go, solved, timeUp}()` — AudioContext가 없거나 실패해도 조용히 넘어간다
  - `fullscreen.ts`: `canFullscreen()`, `isFullscreen()`, `toggleFullscreen()` — 표준 API, 없으면 webkit 접두사

- [ ] **Step 1: 테스트 작성 → 실패 확인**

`src/lib/sound.test.ts`:

```ts
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
```

`src/lib/fullscreen.test.ts`:

```ts
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
```

Run: `npx vitest run src/lib/sound.test.ts src/lib/fullscreen.test.ts`
Expected: FAIL — `./sound`, `./fullscreen`을 찾지 못함

- [ ] **Step 2: 구현**

`src/lib/sound.ts`:

```ts
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
};
```

`src/lib/fullscreen.ts`:

```ts
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const ignore = () => undefined;

export function isFullscreen(): boolean {
  const d = document as FsDocument;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

/** 구형 Chrome은 webkit 접두사 버전만 있다 */
export function canFullscreen(): boolean {
  const el = document.documentElement as FsElement;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

export function toggleFullscreen(): void {
  const d = document as FsDocument;
  const el = document.documentElement as FsElement;
  try {
    if (isFullscreen()) {
      if (typeof d.exitFullscreen === 'function') d.exitFullscreen().catch(ignore);
      else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
    } else if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(ignore);
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch {
    // 지원하지 않으면 아무것도 하지 않는다
  }
}
```

- [ ] **Step 3: 통과 확인**

Run: `npx vitest run src/lib/sound.test.ts src/lib/fullscreen.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 4: 커밋**

```bash
git add src/lib/sound.ts src/lib/sound.test.ts src/lib/fullscreen.ts src/lib/fullscreen.test.ts
git commit -m "feat: WebAudio 합성 효과음과 전체화면 토글" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 게임 메뉴와 플레이어 설정 화면

**Files:**
- Create: `src/shell/ui/GameMenu.tsx`, `src/shell/ui/GameMenu.module.css`, `src/shell/ui/PlayerSetup.tsx`, `src/shell/ui/PlayerSetup.module.css`
- Test: `src/shell/ui/GameMenu.test.tsx`, `src/shell/ui/PlayerSetup.test.tsx`

**Interfaces:**
- Consumes: `GAMES`, `GameModule`, `blocksGame`(Task 10), `PLAYER_COLORS`(Task 10), `ROUND_OPTIONS`, `TIME_OPTIONS`(Task 11), `SavedSetup`, `finalizeSetup`, `resizePlayers`, `MAX_NAME_LENGTH`, `defaultSetup`(Task 12)
- Produces:
  - `GameMenu({ onSelect(game) })` — 제목 "우리집 보드게임", 게임 카드(아래쪽), "기기 확인" 링크(`BASE_URL + 'check.html'`)
  - `PlayerSetup({ game, initial, onStart(setup), onBack })` — 인원(게임 min~max), 플레이어별 이름·난이도, 라운드(3/5/9판), 시간(60/90/120초), "시작!"은 `finalizeSetup` 결과를 넘긴다

- [ ] **Step 1: 테스트 작성 → 실패 확인**

`src/shell/ui/GameMenu.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blocksGame } from '../../games/blocks';
import { GameMenu } from './GameMenu';

describe('GameMenu', () => {
  it('앱 제목과 게임 카드를 보여준다', () => {
    render(<GameMenu onSelect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /블록 퍼즐/ })).toHaveTextContent('1~4명');
  });

  it('게임 카드를 누르면 그 게임을 고른다', () => {
    const onSelect = vi.fn();
    render(<GameMenu onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /블록 퍼즐/ }));
    expect(onSelect).toHaveBeenCalledWith(blocksGame);
  });

  it('기기 확인 페이지로 가는 링크가 있다', () => {
    render(<GameMenu onSelect={vi.fn()} />);
    expect(screen.getByRole('link', { name: '기기 확인' }).getAttribute('href')).toMatch(/check\.html$/);
  });
});
```

`src/shell/ui/PlayerSetup.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blocksGame } from '../../games/blocks';
import { defaultSetup } from '../logic/setup';
import { PlayerSetup } from './PlayerSetup';

const renderSetup = (game = blocksGame, initial = defaultSetup()) => {
  const onStart = vi.fn();
  const onBack = vi.fn();
  render(<PlayerSetup game={game} initial={initial} onStart={onStart} onBack={onBack} />);
  return { onStart, onBack };
};

const nameInputs = () => screen.getAllByRole('textbox');

describe('PlayerSetup', () => {
  it('처음 설정값을 보여준다', () => {
    renderSetup();
    expect(nameInputs().map((el) => (el as HTMLInputElement).value)).toEqual(['플레이어 1', '플레이어 2']);
    expect(screen.getByRole('button', { name: '2명' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '5판' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '90초' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('인원을 바꾸면 이름 칸 수가 바뀐다', () => {
    renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '4명' }));
    expect(nameInputs()).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '1명' }));
    expect(nameInputs()).toHaveLength(1);
  });

  it('고른 이름·난이도·라운드·시간으로 시작한다', () => {
    const { onStart } = renderSetup();
    fireEvent.change(screen.getByRole('textbox', { name: '1번 이름' }), { target: { value: '민준' } });
    fireEvent.click(within(screen.getByRole('group', { name: '1번 플레이어' })).getByRole('button', { name: '쉬움' }));
    fireEvent.click(within(screen.getByRole('group', { name: '2번 플레이어' })).getByRole('button', { name: '어려움' }));
    fireEvent.click(screen.getByRole('button', { name: '3판' }));
    fireEvent.click(screen.getByRole('button', { name: '60초' }));
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(onStart).toHaveBeenCalledWith({
      players: [
        { name: '민준', difficulty: 'easy' },
        { name: '플레이어 2', difficulty: 'hard' },
      ],
      rounds: 3,
      timeLimitSec: 60,
    });
  });

  it('이름을 비우고 시작하면 기본 이름을 쓴다', () => {
    const { onStart } = renderSetup();
    fireEvent.change(screen.getByRole('textbox', { name: '2번 이름' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(onStart.mock.calls[0][0].players[1].name).toBe('플레이어 2');
  });

  it('게임 최대 인원까지만 고를 수 있고, 저장된 인원이 많으면 줄인다', () => {
    const initial = { ...defaultSetup(), players: [...defaultSetup().players, { name: 'C', difficulty: 'easy' as const }] };
    renderSetup({ ...blocksGame, maxPlayers: 2 }, initial);
    expect(screen.queryByRole('button', { name: '3명' })).toBeNull();
    expect(nameInputs()).toHaveLength(2);
  });

  it('메뉴 버튼은 onBack', () => {
    const { onBack } = renderSetup();
    fireEvent.click(screen.getByRole('button', { name: '← 메뉴' }));
    expect(onBack).toHaveBeenCalled();
  });
});
```

Run: `npx vitest run src/shell/ui/GameMenu.test.tsx src/shell/ui/PlayerSetup.test.tsx`
Expected: FAIL — `./GameMenu`, `./PlayerSetup`을 찾지 못함

- [ ] **Step 2: 구현**

`src/shell/ui/GameMenu.module.css`:

```css
/* 제목은 위, 게임 카드는 아이 손이 닿는 아래쪽에 */
.screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 2rem 2rem 1.5rem 2rem;
}

.title {
  font-size: 2.5rem;
  margin: 0 0 auto 0;
}

.list {
  display: flex;
  flex-wrap: wrap;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 22rem;
  min-height: 9rem;
  margin: 0 1rem 1rem 0;
  padding: 1.2rem 1.4rem;
  border: 4px solid var(--ink);
  border-radius: 18px;
  background: var(--panel);
  text-align: left;
}

.card:active {
  transform: translateY(2px);
}

.cardName {
  font-size: 1.8rem;
  font-weight: bold;
}

.cardDesc {
  margin-top: 0.4rem;
  color: var(--ink-soft);
}

.cardMeta {
  margin-top: auto;
  padding-top: 0.6rem;
  font-weight: bold;
}

.check {
  align-self: flex-start;
  margin-top: 0.5rem;
  color: var(--ink-soft);
}
```

`src/shell/ui/GameMenu.tsx`:

```tsx
import { GAMES } from '../../games/registry';
import type { GameModule } from '../../games/types';
import styles from './GameMenu.module.css';

type Props = { onSelect: (game: GameModule) => void };

export function GameMenu({ onSelect }: Props) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>우리집 보드게임</h1>
      <div className={styles.list}>
        {GAMES.map((g) => (
          <button key={g.id} type="button" className={styles.card} onClick={() => onSelect(g)}>
            <span className={styles.cardName}>{g.name}</span>
            <span className={styles.cardDesc}>{g.description}</span>
            <span className={styles.cardMeta}>{`${g.minPlayers}~${g.maxPlayers}명`}</span>
          </button>
        ))}
      </div>
      <a className={styles.check} href={import.meta.env.BASE_URL + 'check.html'}>
        기기 확인
      </a>
    </div>
  );
}
```

`src/shell/ui/PlayerSetup.module.css`:

```css
.screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 1.5rem 2rem;
  overflow-y: auto;
  touch-action: pan-y;
}

.title {
  font-size: 2rem;
  margin: 0 0 1rem 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.4rem;
}

.label {
  width: 5rem;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.swatch {
  width: 1.2rem;
  height: 3rem;
  margin: 0 0.6rem 0.5rem 0;
  border-radius: 6px;
}

.name {
  width: 10rem;
  min-height: 3rem;
  box-sizing: border-box;
  margin: 0 1rem 0.5rem 0;
  padding: 0 0.8rem;
  border: 3px solid var(--ink);
  border-radius: 12px;
  background: var(--panel);
}

/* 시작 버튼은 아래쪽에 */
.actions {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 1rem;
}

.start {
  min-width: 12rem;
  font-size: 1.6rem;
}
```

`src/shell/ui/PlayerSetup.tsx`:

```tsx
import { useState } from 'react';
import type { GameModule } from '../../games/types';
import { DIFFICULTIES, DIFFICULTY_LABEL } from '../../lib/difficulty';
import { ROUND_OPTIONS, TIME_OPTIONS } from '../logic/match';
import type { PlayerConfig } from '../logic/match';
import { finalizeSetup, MAX_NAME_LENGTH, resizePlayers } from '../logic/setup';
import type { SavedSetup } from '../logic/setup';
import { PLAYER_COLORS } from './colors';
import styles from './PlayerSetup.module.css';

type Props = {
  game: GameModule;
  initial: SavedSetup;
  onStart: (setup: SavedSetup) => void;
  onBack: () => void;
};

export function PlayerSetup({ game, initial, onStart, onBack }: Props) {
  const [players, setPlayers] = useState<PlayerConfig[]>(() => {
    const count = Math.min(game.maxPlayers, Math.max(game.minPlayers, initial.players.length));
    return resizePlayers(initial.players, count);
  });
  const [rounds, setRounds] = useState(initial.rounds);
  const [timeLimitSec, setTimeLimitSec] = useState(initial.timeLimitSec);

  const counts: number[] = [];
  for (let n = game.minPlayers; n <= game.maxPlayers; n++) counts.push(n);

  const update = (index: number, patch: Partial<PlayerConfig>) =>
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{`${game.name} · 누가 할까요?`}</h1>

      <div className={styles.row} role="group" aria-label="인원">
        <span className={styles.label}>인원</span>
        {counts.map((n) => (
          <button
            key={n}
            type="button"
            className="btn"
            aria-pressed={players.length === n}
            onClick={() => setPlayers((prev) => resizePlayers(prev, n))}
          >
            {`${n}명`}
          </button>
        ))}
      </div>

      {players.map((p, i) => (
        <div key={i} className={styles.row} role="group" aria-label={`${i + 1}번 플레이어`}>
          <span className={styles.swatch} style={{ background: PLAYER_COLORS[i] }} />
          <input
            className={styles.name}
            aria-label={`${i + 1}번 이름`}
            value={p.name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              className="btn"
              aria-pressed={p.difficulty === d}
              onClick={() => update(i, { difficulty: d })}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      ))}

      <div className={styles.row} role="group" aria-label="라운드">
        <span className={styles.label}>라운드</span>
        {ROUND_OPTIONS.map((r) => (
          <button key={r} type="button" className="btn" aria-pressed={rounds === r} onClick={() => setRounds(r)}>
            {`${r}판`}
          </button>
        ))}
      </div>

      <div className={styles.row} role="group" aria-label="제한시간">
        <span className={styles.label}>시간</span>
        {TIME_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            className="btn"
            aria-pressed={timeLimitSec === t}
            onClick={() => setTimeLimitSec(t)}
          >
            {`${t}초`}
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn" onClick={onBack}>
          ← 메뉴
        </button>
        <button
          type="button"
          className={'btn btn-primary ' + styles.start}
          onClick={() => onStart(finalizeSetup({ players, rounds, timeLimitSec }))}
        >
          시작!
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 통과 확인**

Run: `npx vitest run src/shell/ui/GameMenu.test.tsx src/shell/ui/PlayerSetup.test.tsx`
Expected: PASS (9 tests)

- [ ] **Step 4: 커밋**

```bash
git add src/shell/ui/GameMenu.tsx src/shell/ui/GameMenu.module.css src/shell/ui/GameMenu.test.tsx src/shell/ui/PlayerSetup.tsx src/shell/ui/PlayerSetup.module.css src/shell/ui/PlayerSetup.test.tsx
git commit -m "feat: 게임 메뉴와 플레이어 설정 화면" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: 대결 화면·최종 결과·앱 연결

**Files:**
- Create: `src/shell/ui/TopBar.tsx`, `src/shell/ui/Match.tsx`, `src/shell/ui/Match.module.css`, `src/shell/ui/FinalResult.tsx`, `src/shell/ui/FinalResult.module.css`
- Modify: `src/App.tsx`, `src/App.test.tsx` (임시 터치 시험 화면 → 실제 흐름), `src/styles.css` (임시 화면 스타일 삭제)
- Test: `src/shell/ui/Match.test.tsx`, `src/shell/ui/FinalResult.test.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: Task 10~14 전부, `sounds`, `unlockAudio`, `setMuted`, `isMuted`(Task 13), `canFullscreen`, `toggleFullscreen`(Task 13)
- Produces:
  - `TopBar({ round, rounds, clock, urgent, muted, onToggleMute, onExit })` — "그만하기"는 두 번 눌러야(3초 안에 "정말 그만?") 나간다
  - `Match({ game, config, seed, store, onExit, onReplay })` — 카운트다운(3,2,1) → 플레이(250ms마다 시간 갱신, 0이면 TIME_UP) → 라운드 결과 바("다음 라운드"/"결과 보기") → `FinalResult`. 혼자면 최고기록 저장·"새 기록!" 표시. 칸 머리: 이름·난이도·총점(+이번 점수)·상태(준비!/푸는 중/완성! n등 · 12.3초/시간 끝)
  - `FinalResult({ players, totals, onReplay, onExit })` — "○○ 우승!" / "공동 우승!" / 혼자면 "다 했어요!"
  - `App` — 메뉴 → 설정(마지막 설정 기억) → 대결. 루트에서 첫 터치 때 `unlockAudio`, 길게 누르기 메뉴 차단

- [ ] **Step 1: 테스트 작성 → 실패 확인**

`src/shell/ui/FinalResult.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FinalResult } from './FinalResult';

const players = [
  { name: '민준', difficulty: 'easy' as const },
  { name: '서연', difficulty: 'normal' as const },
  { name: '아빠', difficulty: 'hard' as const },
];

describe('FinalResult', () => {
  it('최고점이 한 명이면 그 사람이 우승, 점수 순으로 보여준다', () => {
    render(<FinalResult players={players} totals={[5, 9, 7]} onReplay={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '서연 우승!' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['서연9점우승', '아빠7점', '민준5점']);
  });

  it('동점이면 공동 우승', () => {
    render(<FinalResult players={players} totals={[9, 9, 1]} onReplay={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '공동 우승!' })).toBeInTheDocument();
    expect(screen.getAllByText('우승')).toHaveLength(2);
  });

  it('혼자 했으면 우승 대신 끝 인사', () => {
    render(<FinalResult players={[players[0]]} totals={[12]} onReplay={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '다 했어요!' })).toBeInTheDocument();
    expect(screen.queryByText('우승')).toBeNull();
  });

  it('다시 하기 / 메뉴로', () => {
    const onReplay = vi.fn();
    const onExit = vi.fn();
    render(<FinalResult players={players} totals={[1, 2, 3]} onReplay={onReplay} onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
```

`src/shell/ui/Match.test.tsx` ('풀기' 버튼만 있는 가짜 게임으로 셸만 시험, 가짜 타이머 사용):

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameModule, PlayerAreaProps } from '../../games/types';
import { memoryStore } from '../../lib/storage';
import type { MatchConfig } from '../logic/match';
import { loadBestTimes } from '../logic/persistence';
import { Match } from './Match';

// 셸만 시험하려고 '풀기' 버튼 하나뿐인 가짜 게임을 쓴다
function StubArea({ active, onSolved }: PlayerAreaProps) {
  return (
    <button type="button" disabled={!active} onClick={onSolved}>
      풀기
    </button>
  );
}

const stubGame: GameModule = {
  id: 'stub',
  name: '시험용',
  description: '',
  minPlayers: 1,
  maxPlayers: 4,
  PlayerArea: StubArea,
};

const NAMES = ['민준', '서연', '아빠', '엄마'];

const config = (players: number, rounds = 2, timeLimitSec = 60): MatchConfig => ({
  gameId: 'stub',
  players: NAMES.slice(0, players).map((name) => ({ name, difficulty: 'normal' as const })),
  rounds,
  timeLimitSec,
});

function renderMatch(c: MatchConfig) {
  const onExit = vi.fn();
  const onReplay = vi.fn();
  const store = memoryStore();
  render(<Match game={stubGame} config={c} seed={1} store={store} onExit={onExit} onReplay={onReplay} />);
  return { onExit, onReplay, store };
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const solveButtons = () => screen.getAllByRole('button', { name: '풀기' });
const columns = () => screen.getAllByTestId('player-column');

describe('Match', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('3, 2, 1 카운트다운 뒤 라운드가 시작된다', () => {
    renderMatch(config(2));
    expect(screen.getAllByTestId('countdown')[0]).toHaveTextContent('3');
    advance(1000);
    expect(screen.getAllByTestId('countdown')[0]).toHaveTextContent('2');
    advance(2000);
    expect(screen.queryByTestId('countdown')).toBeNull();
    expect(solveButtons()).toHaveLength(2);
    expect(screen.getByText('라운드 1/2')).toBeInTheDocument();
    expect(screen.getByTestId('clock')).toHaveTextContent('1:00');
  });

  it('남은 시간이 줄어든다', () => {
    renderMatch(config(2));
    advance(3000 + 15000);
    expect(screen.getByTestId('clock')).toHaveTextContent('0:45');
  });

  it('모두 풀면 라운드가 끝나고 푼 순서대로 점수를 얻는다', () => {
    renderMatch(config(2));
    advance(3000);
    fireEvent.click(solveButtons()[1]);
    fireEvent.click(solveButtons()[0]);
    expect(screen.getByText('라운드 1 끝!')).toBeInTheDocument();
    expect(columns()[1]).toHaveTextContent('3점 +3');
    expect(columns()[1]).toHaveTextContent('완성! 1등');
    expect(columns()[0]).toHaveTextContent('2점 +2');
  });

  it('시간이 다 되면 못 푼 사람은 0점으로 라운드가 끝난다', () => {
    renderMatch(config(2));
    advance(3000);
    fireEvent.click(solveButtons()[0]);
    advance(60000);
    expect(screen.getByText('라운드 1 끝!')).toBeInTheDocument();
    expect(columns()[1]).toHaveTextContent('0점 +0');
    expect(columns()[1]).toHaveTextContent('시간 끝');
  });

  it('다음 라운드를 거쳐 마지막 라운드 뒤 최종 결과를 보여준다', () => {
    const { onReplay, onExit } = renderMatch(config(2, 2));
    advance(3000);
    fireEvent.click(solveButtons()[1]);
    advance(60000);
    fireEvent.click(screen.getByRole('button', { name: '다음 라운드' }));
    expect(screen.getAllByTestId('countdown')[0]).toHaveTextContent('3');
    advance(3000);
    expect(screen.getByText('라운드 2/2')).toBeInTheDocument();
    fireEvent.click(solveButtons()[1]);
    fireEvent.click(solveButtons()[0]);
    fireEvent.click(screen.getByRole('button', { name: '결과 보기' }));
    expect(screen.getByRole('heading', { name: '서연 우승!' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '메뉴로' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('그만하기는 한 번 더 눌러야 나가고, 3초 지나면 확인이 풀린다', () => {
    const { onExit } = renderMatch(config(2));
    fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
    expect(onExit).not.toHaveBeenCalled();
    advance(3000);
    expect(screen.getByRole('button', { name: '그만하기' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
    fireEvent.click(screen.getByRole('button', { name: '정말 그만?' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('혼자 하면 걸린 시간과 새 기록을 보여주고 저장한다', () => {
    const { store } = renderMatch({ ...config(1), players: [{ name: '민준', difficulty: 'easy' }] });
    advance(3000);
    advance(12300);
    fireEvent.click(screen.getByRole('button', { name: '풀기' }));
    expect(screen.getByText('새 기록!')).toBeInTheDocument();
    expect(columns()[0]).toHaveTextContent('완성! 12.3초');
    expect(loadBestTimes(store)).toEqual({ easy: 12300 });
  });
});
```

`src/App.test.tsx`를 바꾼다:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const openSetup = () => fireEvent.click(screen.getByRole('button', { name: /블록 퍼즐/ }));

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('메뉴 → 설정 → 시작하면 카운트다운 뒤 칸마다 퍼즐이 나온다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
    openSetup();
    fireEvent.click(screen.getByRole('button', { name: '3명' }));
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    expect(screen.getAllByTestId('player-column')).toHaveLength(3);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getAllByTestId('puzzle-svg')).toHaveLength(3);
  });

  it('마지막 설정을 기억한다', () => {
    render(<App />);
    openSetup();
    fireEvent.click(screen.getByRole('button', { name: '4명' }));
    fireEvent.click(screen.getByRole('button', { name: '시작!' }));
    fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
    fireEvent.click(screen.getByRole('button', { name: '정말 그만?' }));
    openSetup();
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });

  it('설정에서 메뉴로 돌아갈 수 있다', () => {
    render(<App />);
    openSetup();
    fireEvent.click(screen.getByRole('button', { name: '← 메뉴' }));
    expect(screen.getByRole('heading', { name: '우리집 보드게임' })).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/shell/ui src/App.test.tsx`
Expected: FAIL — `./FinalResult`, `./Match`를 찾지 못함, App 제목 불일치

- [ ] **Step 2: 대결 화면 구현**

`src/shell/ui/Match.module.css`:

```css
.match {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.topBar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 0.5rem 1rem 0 1rem;
  border-bottom: 4px solid var(--ink);
  background: var(--bg);
}

.round {
  margin: 0 1.5rem 0.5rem 0;
  font-size: 1.4rem;
  font-weight: bold;
}

.clock {
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.clockUrgent {
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  color: var(--warn);
}

.spacer {
  flex: 1 1 auto;
}

.play {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.countdown {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 8rem;
  font-weight: bold;
}

.nameLine {
  display: flex;
  align-items: baseline;
}

.name {
  margin-right: 0.6rem;
  font-size: 1.6rem;
  font-weight: bold;
}

.difficulty {
  color: var(--ink-soft);
}

.score {
  margin-top: 0.3rem;
  font-size: 1.6rem;
  font-weight: bold;
}

.gain {
  color: var(--ok);
}

.status {
  margin-top: 0.3rem;
  font-size: 1.2rem;
}

.record {
  margin-top: 0.3rem;
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--warn);
}

/* 라운드가 끝나면 아래 가운데에 (아이 손이 닿는 곳) */
.resultBar {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  display: flex;
  align-items: center;
  padding: 0.8rem 1rem 0.3rem 1.4rem;
  border: 4px solid var(--ink);
  border-radius: 18px;
  background: var(--panel);
  transform: translateX(-50%);
}

.resultText {
  margin: 0 1.2rem 0.5rem 0;
  font-size: 1.6rem;
  font-weight: bold;
}
```

`src/shell/ui/TopBar.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { canFullscreen, toggleFullscreen } from '../../lib/fullscreen';
import styles from './Match.module.css';

type Props = {
  round: number;
  rounds: number;
  clock: string;
  urgent: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
};

const CONFIRM_MS = 3000;

/** 어른이 쓰는 위쪽 막대. 그만하기는 아이가 실수로 누르지 않게 두 번 눌러야 한다 */
export function TopBar({ round, rounds, clock, urgent, muted, onToggleMute, onExit }: Props) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [confirming]);

  return (
    <header className={styles.topBar}>
      <span className={styles.round}>{`라운드 ${round}/${rounds}`}</span>
      <span className={urgent ? styles.clockUrgent : styles.clock} data-testid="clock">
        {clock}
      </span>
      <span className={styles.spacer} />
      <button type="button" className="btn" onClick={onToggleMute}>
        {muted ? '소리 켜기' : '소리 끄기'}
      </button>
      {canFullscreen() && (
        <button type="button" className="btn" onClick={toggleFullscreen}>
          전체화면
        </button>
      )}
      <button type="button" className="btn" onClick={() => (confirming ? onExit() : setConfirming(true))}>
        {confirming ? '정말 그만?' : '그만하기'}
      </button>
    </header>
  );
}
```

`src/shell/ui/FinalResult.module.css`:

```css
.screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 2rem;
}

.title {
  margin: 0 0 1.5rem 0;
  font-size: 3rem;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  margin-bottom: 0.8rem;
  padding: 0.6rem 1rem;
  border-left: 1rem solid var(--ink);
  background: var(--panel);
  font-size: 1.8rem;
}

.name {
  margin-right: auto;
  font-weight: bold;
}

.total {
  margin-left: 1rem;
  font-weight: bold;
}

.crown {
  margin-left: 1rem;
  padding: 0.2rem 0.8rem;
  border-radius: 8px;
  background: var(--warn);
  color: #ffffff;
  font-size: 1.2rem;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
}
```

`src/shell/ui/FinalResult.tsx`:

```tsx
import type { PlayerConfig } from '../logic/match';
import { winners } from '../logic/match';
import { PLAYER_COLORS } from './colors';
import styles from './FinalResult.module.css';

type Props = {
  players: PlayerConfig[];
  totals: number[];
  onReplay: () => void;
  onExit: () => void;
};

export function FinalResult({ players, totals, onReplay, onExit }: Props) {
  const best = winners(totals);
  const ranking = players
    .map((p, index) => ({ name: p.name, index, total: totals[index] }))
    .sort((a, b) => b.total - a.total || a.index - b.index);

  let title = '공동 우승!';
  if (players.length === 1) title = '다 했어요!';
  else if (best.length === 1) title = `${players[best[0]].name} 우승!`;

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>{title}</h1>
      <ol className={styles.list}>
        {ranking.map((r) => (
          <li key={r.index} className={styles.item} style={{ borderLeftColor: PLAYER_COLORS[r.index] }}>
            <span className={styles.name}>{r.name}</span>
            <span className={styles.total}>{`${r.total}점`}</span>
            {players.length > 1 && best.includes(r.index) && <span className={styles.crown}>우승</span>}
          </li>
        ))}
      </ol>
      <div className={styles.actions}>
        <button type="button" className="btn" onClick={onExit}>
          메뉴로
        </button>
        <button type="button" className="btn btn-primary" onClick={onReplay}>
          다시 하기
        </button>
      </div>
    </div>
  );
}
```

`src/shell/ui/Match.tsx`:

```tsx
import { useEffect, useMemo, useReducer, useState } from 'react';
import type { GameModule } from '../../games/types';
import { DIFFICULTY_LABEL } from '../../lib/difficulty';
import { isMuted, setMuted, sounds } from '../../lib/sound';
import type { KeyValueStore } from '../../lib/storage';
import { formatClock, formatSeconds } from '../logic/format';
import { COUNTDOWN_SECONDS, createMatch, matchReducer, playerSeed, remainingMs } from '../logic/match';
import type { MatchConfig, MatchState } from '../logic/match';
import { recordBestTime } from '../logic/persistence';
import { PLAYER_COLORS } from './colors';
import { FinalResult } from './FinalResult';
import styles from './Match.module.css';
import { PlayLayout } from './PlayLayout';
import { TopBar } from './TopBar';

type Props = {
  game: GameModule;
  config: MatchConfig;
  seed: number;
  store: KeyValueStore;
  onExit: () => void;
  onReplay: () => void;
};

const URGENT_MS = 10000;
const TICK_MS = 250;

type HeaderProps = { state: MatchState; index: number; solo: boolean; newRecord: boolean };

function PlayerHeader({ state, index, solo, newRecord }: HeaderProps) {
  const player = state.config.players[index];
  const rank = state.solveOrder.indexOf(index);
  const time = state.solveTimesMs[index];
  let status = '시간 끝';
  if (state.phase === 'countdown') status = '준비!';
  else if (rank >= 0 && time !== null) status = solo ? `완성! ${formatSeconds(time)}` : `완성! ${rank + 1}등 · ${formatSeconds(time)}`;
  else if (state.phase === 'playing') status = '푸는 중';

  return (
    <div>
      <div className={styles.nameLine}>
        <span className={styles.name}>{player.name}</span>
        <span className={styles.difficulty}>{DIFFICULTY_LABEL[player.difficulty]}</span>
      </div>
      <div className={styles.score}>
        {`${state.totals[index]}점`}
        {state.phase === 'roundResult' && <span className={styles.gain}>{` +${state.roundPoints[index]}`}</span>}
      </div>
      <div className={styles.status}>{status}</div>
      {solo && newRecord && state.phase === 'roundResult' && <div className={styles.record}>새 기록!</div>}
    </div>
  );
}

export function Match({ game, config, seed, store, onExit, onReplay }: Props) {
  const [state, dispatch] = useReducer(matchReducer, undefined, () => createMatch(config, seed));
  const [now, setNow] = useState(() => Date.now());
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [newRecord, setNewRecord] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const solo = config.players.length === 1;

  // 카운트다운 3, 2, 1 → 시작
  useEffect(() => {
    if (state.phase !== 'countdown') return;
    setCountdown(COUNTDOWN_SECONDS);
    setNewRecord(false);
    sounds.tick();
    let left = COUNTDOWN_SECONDS;
    const id = window.setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCountdown(left);
        sounds.tick();
      } else {
        window.clearInterval(id);
        sounds.go();
        dispatch({ type: 'START_ROUND', now: Date.now() });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.phase, state.round]);

  // 플레이 중에는 남은 시간을 자주 갱신
  useEffect(() => {
    if (state.phase !== 'playing') return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [state.phase]);

  const remaining = remainingMs(state, now);

  useEffect(() => {
    if (state.phase === 'playing' && remaining <= 0) {
      sounds.timeUp();
      dispatch({ type: 'TIME_UP' });
    }
  }, [state.phase, remaining]);

  // PlayerArea는 memo라서 onSolved가 매번 바뀌지 않게 고정한다
  const onSolvedHandlers = useMemo(
    () =>
      config.players.map((_, i) => () => {
        sounds.solved();
        dispatch({ type: 'SOLVED', player: i, now: Date.now() });
      }),
    [config.players],
  );

  // 혼자 하기: 한 문제 최단 시간 기록
  const soloTime = solo ? state.solveTimesMs[0] : null;
  useEffect(() => {
    if (soloTime === null) return;
    setNewRecord(recordBestTime(store, config.players[0].difficulty, soloTime));
  }, [soloTime, store, config.players]);

  if (state.phase === 'final') {
    return <FinalResult players={config.players} totals={state.totals} onReplay={onReplay} onExit={onExit} />;
  }

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <div className={styles.match}>
      <TopBar
        round={state.round}
        rounds={config.rounds}
        clock={formatClock(remaining)}
        urgent={state.phase === 'playing' && remaining <= URGENT_MS}
        muted={muted}
        onToggleMute={toggleMute}
        onExit={onExit}
      />
      <div className={styles.play}>
        <PlayLayout
          columns={config.players.map((p, i) => ({
            key: String(i),
            color: PLAYER_COLORS[i],
            header: <PlayerHeader state={state} index={i} solo={solo} newRecord={newRecord} />,
            body:
              state.phase === 'countdown' ? (
                <div className={styles.countdown} data-testid="countdown">
                  {countdown}
                </div>
              ) : (
                <game.PlayerArea
                  key={state.round}
                  difficulty={p.difficulty}
                  seed={playerSeed(state, i)}
                  active={state.phase === 'playing' && !state.solveOrder.includes(i)}
                  onSolved={onSolvedHandlers[i]}
                />
              ),
          }))}
        />
      </div>
      {state.phase === 'roundResult' && (
        <div className={styles.resultBar}>
          <span className={styles.resultText}>{`라운드 ${state.round} 끝!`}</span>
          <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
            {state.round >= config.rounds ? '결과 보기' : '다음 라운드'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 앱 연결**

`src/App.tsx`를 바꾼다:

```tsx
import { useMemo, useState } from 'react';
import type { GameModule } from './games/types';
import { randomSeed } from './lib/random';
import { unlockAudio } from './lib/sound';
import { browserStore } from './lib/storage';
import type { MatchConfig } from './shell/logic/match';
import { loadSetup, saveSetup } from './shell/logic/persistence';
import { defaultSetup, toMatchConfig } from './shell/logic/setup';
import type { SavedSetup } from './shell/logic/setup';
import { GameMenu } from './shell/ui/GameMenu';
import { Match } from './shell/ui/Match';
import { PlayerSetup } from './shell/ui/PlayerSetup';

type Screen =
  | { kind: 'menu' }
  | { kind: 'setup'; game: GameModule }
  | { kind: 'match'; game: GameModule; config: MatchConfig; seed: number };

export default function App() {
  const store = useMemo(() => browserStore(), []);
  const [screen, setScreen] = useState<Screen>({ kind: 'menu' });

  const startMatch = (game: GameModule, setup: SavedSetup) => {
    saveSetup(store, setup);
    setScreen({ kind: 'match', game, config: toMatchConfig(game.id, setup), seed: randomSeed() });
  };

  return (
    // 첫 터치 때 소리를 깨우고, 길게 누르기 메뉴는 막는다
    <div className="app" onPointerDownCapture={unlockAudio} onContextMenu={(e) => e.preventDefault()}>
      {screen.kind === 'menu' && <GameMenu onSelect={(game) => setScreen({ kind: 'setup', game })} />}
      {screen.kind === 'setup' && (
        <PlayerSetup
          game={screen.game}
          initial={loadSetup(store) ?? defaultSetup()}
          onBack={() => setScreen({ kind: 'menu' })}
          onStart={(setup) => startMatch(screen.game, setup)}
        />
      )}
      {screen.kind === 'match' && (
        <Match
          key={screen.seed}
          game={screen.game}
          config={screen.config}
          seed={screen.seed}
          store={store}
          onExit={() => setScreen({ kind: 'menu' })}
          onReplay={() => setScreen({ ...screen, seed: randomSeed() })}
        />
      )}
    </div>
  );
}
```

`src/styles.css`에서 `/* 임시 터치 시험 화면 — 셸이 생기면 지운다 */`부터 파일 끝까지(`.touch-test`, `.touch-test-bar`, `.touch-test-bar h1`, `.touch-test-play`)를 지운다. 지운 뒤 파일은 `.btn:disabled { opacity: 0.4; }`로 끝나야 한다.

- [ ] **Step 4: 전체 검증**

Run: `npm run lint && npm test && npm run build`
Expected: lint 에러 없음, 테스트 25개 파일 265개 통과, 빌드 성공

Run: `grep -oE "(inset|[^-]gap|aspect-ratio|:is\(|:where\(|oklch|color-mix|@container|@layer)" dist/assets/*.css`
Expected: 출력 없음 (금지 CSS 없음)

- [ ] **Step 5: 커밋**

```bash
git add src
git commit -m "feat: 메뉴·설정·라운드 대결·최종 결과로 이어지는 셸 완성" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: 실기기 점검과 문서 마무리

**Files:**
- Modify: `docs/ARCHITECTURE.md` (실제 파일 구조 반영 — 이 계획의 "파일 구조" 절과 일치시키기)

- [ ] **Step 1: 배포**

```bash
git push
gh run watch
```

- [ ] **Step 2: 칠판 최종 점검 (사용자 작업)**

사용자에게 아래 체크리스트를 보내고 결과를 받는다:

1. 메뉴 → 블록 퍼즐 → 설정: 인원 1~4, 이름 입력(화면 키보드), 난이도·라운드·시간 선택 → 시작
2. 3, 2, 1 카운트다운과 소리 (소리 끄기 버튼도)
3. 4명이 동시에 조각 끌기·톡 치기 회전·돌리기·뒤집기
4. 쉬움 칸은 모양 밖에 안 놓이고, 보통·어려움 칸은 모양 밖으로 걸쳐 놓인다
5. 다 맞추면 "완성! n등", 시간이 끝나면 "시간 끝", 라운드 결과의 "+점수"
6. 마지막 라운드 → "결과 보기" → 우승자, "다시 하기"/"메뉴로"
7. 1명 모드에서 "새 기록!"
8. 전체화면 버튼, 길게 눌러도 메뉴가 안 뜨는지, 화면이 스크롤·새로고침되지 않는지
9. 다시 설정 화면에 들어가면 마지막 설정이 남아 있는지

문제가 있으면 superpowers:systematic-debugging으로 고친 뒤 이 단계를 다시 한다.

- [ ] **Step 3: 문서 갱신**

`docs/ARCHITECTURE.md`의 디렉토리 구조를 이 계획의 "파일 구조"로 바꾸고, 패턴 절의 `GameModule` 타입에 `description: string`을 넣는다.

- [ ] **Step 4: 커밋·배포**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: 실제 파일 구조와 게임 모듈 계약 반영" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```
