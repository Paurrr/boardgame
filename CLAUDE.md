# 프로젝트: 우리집 보드게임

집의 LG 전자칠판 55TR3DK(Android 11 내장 Chrome 99, CSS 1280×720 @ DPR 3 = 4K, 17점 멀티터치) 브라우저에서 아이들과 함께 하는 보드게임 웹앱. 첫 게임은 "블록 퍼즐"(우봉고 스타일). 설계: `docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md`

## 기술 스택
- Vite + React + TypeScript (strict mode)
- 게임 화면은 SVG, 스타일은 일반 CSS (CSS Modules)
- 빌드 대상은 칠판 실측 Chrome 99 (`build.target`·`cssTarget` = `chrome99`). 더 오래된 기기 대응은 `docs/ADR.md` ADR-006의 복구 절차
- Vitest (+ React Testing Library), ESLint
- 배포: GitHub Pages (`base: '/boardgame/'`), GitHub Actions

## 아키텍처 규칙
- CRITICAL: 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM에 의존하지 않는 순수 TypeScript로 작성하고 Vitest로 검증할 것
- CRITICAL: 서버·외부 API 호출 금지. 완전한 정적 사이트로 유지할 것 (저장은 `localStorage`만)
- CRITICAL: 칠판의 Chrome 99에서 동작해야 한다. 폴리필이 없으므로 CSS·JS 모두 Chrome 99가 지원하는 것만 쓸 것
  - CSS 허용: flexbox `gap`, `aspect-ratio`, `inset`, `:is()/:where()`, CSS 변수
  - CSS 금지: CSS nesting(112+), container query(105+), `:has()`(105+), `oklch()/color-mix()`(111+), Tailwind v4
  - JS: ES2022까지 (`tsconfig` lib이 막는다). `toSorted()` 같은 ES2023+ API 금지
  - 멀티터치를 `navigator.maxTouchPoints`로 판단하지 말 것 (칠판은 1로 보고하지만 실제 17점)
- CRITICAL: `public/check.html`은 빌드를 거치지 않으므로 ES5 문법만 쓸 것
- CRITICAL: "우봉고" 이름·원작 카드·그림을 쓰지 말 것 (KOSMOS 상표). 퍼즐은 생성기로 만든다
- 플레이어 칸은 가로로 나란히 배치하고 조작 영역은 칸의 아래쪽 2/3에 둘 것 (2×2 분할 금지 — 아이 손이 윗줄에 닿지 않음)
- 화면 디자인은 `docs/UI_GUIDE.md`(나무 장난감 톤)를 따를 것. 색은 `src/styles.css`의 `:root` 변수로 쓰고 새 색을 하드코딩하지 말 것 (플레이어 색 `colors.ts`·조각 색 `pieces.ts`는 가이드 값과 일치). 그림자·글로우·그라데이션 금지 — 두께는 아래 테두리로 낸다
- 터치는 Pointer Events로 처리하고 드래그 중에는 React 상태 대신 `transform`을 직접 갱신, 놓을 때만 상태 커밋
- 예외(쌓기 퍼즐, ADR-008): 판 돌리기·회전 애니메이션은 매 프레임 다시 그린다. 끄는 중 떨어질 자리 표시는 자리가 바뀔 때만 상태를 갱신한다
- 새 게임은 `src/games/<id>/`에 `logic/`·`ui/`·`index.ts`(GameModule)로 추가하고 `src/games/registry.ts`에 등록

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (Chrome 99 대상)
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
npm run test     # 테스트
