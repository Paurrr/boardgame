# 프로젝트: 우리집 보드게임

7~8년 된 LG 전자칠판(Android 8 내장 Chrome, 4K, 멀티터치) 브라우저에서 아이들과 함께 하는 보드게임 웹앱. 첫 게임은 "블록 퍼즐"(우봉고 스타일). 설계: `docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md`

## 기술 스택
- Vite + React + TypeScript (strict mode)
- 게임 화면은 SVG, 스타일은 일반 CSS (CSS Modules)
- `@vitejs/plugin-legacy`로 구형 Chrome 호환 번들 생성
- Vitest (+ React Testing Library), ESLint
- 배포: GitHub Pages (`base: '/boardgame/'`), GitHub Actions

## 아키텍처 규칙
- CRITICAL: 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM에 의존하지 않는 순수 TypeScript로 작성하고 Vitest로 검증할 것
- CRITICAL: 서버·외부 API 호출 금지. 완전한 정적 사이트로 유지할 것 (저장은 `localStorage`만)
- CRITICAL: 칠판의 구형 Chrome에서 동작해야 한다. Tailwind v4, flexbox `gap`, `aspect-ratio`, `inset`, CSS nesting, `:is()/:where()`, `oklch()/color-mix()`, container query 등 최신 CSS를 쓰지 말 것 (JS는 plugin-legacy가 변환하지만 CSS 기능은 폴리필되지 않음)
- CRITICAL: `public/check.html`은 빌드를 거치지 않으므로 ES5 문법만 쓸 것
- CRITICAL: "우봉고" 이름·원작 카드·그림을 쓰지 말 것 (KOSMOS 상표). 퍼즐은 생성기로 만든다
- 플레이어 칸은 가로로 나란히 배치하고 조작 영역은 칸의 아래쪽 2/3에 둘 것 (2×2 분할 금지 — 아이 손이 윗줄에 닿지 않음)
- 터치는 Pointer Events로 처리하고 드래그 중에는 React 상태 대신 `transform`을 직접 갱신, 놓을 때만 상태 커밋
- 새 게임은 `src/games/<id>/`에 `logic/`·`ui/`·`index.ts`(GameModule)로 추가하고 `src/games/registry.ts`에 등록

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (legacy 번들 포함)
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
npm run test     # 테스트
