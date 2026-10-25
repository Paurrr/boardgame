# Step 2: bell-press

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md (ADR-009), /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-fruit-bell-design.md
- /docs/superpowers/plans/2026-10-25-fruit-bell.md (전체 계획. 이 step은 Task 2)
- `/phases/3-fruit-bell/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/lib/gesture.ts
- /src/games/bell/logic/types.ts

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 공통 제약 (모든 step)

- 칠판 Chrome 99. CSS nesting·container query·`:has()`·`oklch()/color-mix()` 금지. JS는 ES2022까지(`toSorted` 등 금지, 정렬은 `slice().sort()`). 폴리필 없음.
- 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM 의존 금지. `src/games/bell/ui/notice.ts`도 순수 TS로 쓴다.
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits다(execute.py가 단계마다 커밋한다).
- 색은 `src/styles.css`의 `:root` 변수만 쓴다. 과일 색은 1탄 `src/games/blocks/logic/pieces.ts`의 `PIECES`에서 가져온다: 딸기←`I3`(#D9442E), 바나나←`L3`(#F2B53A), 라임←`L5`(#8DBB2E), 블루베리←`U5`(#22507C), 잎·꼭지←`T4`(#2E9E55). 그림자·글로우·그라데이션·필터 금지. 두께는 아래 테두리로 낸다.
- 공개 명칭은 "과일 종치기", id는 `bell`이다. 원작 이름("할리갈리")·원작 그림은 화면 글자·파일·식별자에 쓰지 않는다.
- 플레이어 칸은 가로로 나란히 둔다. 조작 요소(뒤집기·종)는 칸의 아래쪽 2/3에만 둔다. 누르는 요소는 56 CSS px 이상, 주요 버튼은 72 CSS px 이상. 칸 아래 여백 1.5rem 이상. 칠판(1280×720) 4명에서 스크롤 없이 들어가야 한다.
- 터치는 Pointer Events. 칸 안 버튼은 `pointerdown`에 반응한다. 멀티터치 판단에 `navigator.maxTouchPoints`를 쓰지 않는다.
- 숫자: 카드 56장 = 과일 4가지 × (1개 5장, 2개 3장, 3개 3장, 4개 2장, 5개 1장). 인원 2~4명. 톡 기준은 `src/lib/gesture.ts`의 `isTap`(300ms 미만·10px 미만). 결과 표시 1500ms, 끝난 뒤 결과 화면까지 1500ms.

## 작업

**Files:**
- Create: `src/games/bell/logic/press.ts`
- Test: `src/games/bell/logic/press.test.ts`

**Interfaces:**
- Consumes: `isTap`, `TAP_MAX_DURATION_MS`(`src/lib/gesture.ts`)
- Produces:
  ```ts
  export type Press = { pointerId: number; player: number; downAt: number; upAt: number | null; distance: number };
  export type PressDecision = { kind: 'wait' } | { kind: 'none' } | { kind: 'ring'; player: number };
  export function pressDown(book: readonly Press[], pointerId: number, player: number, at: number): Press[];
  /** 없는 pointerId면 그대로 돌려준다 */
  export function pressUp(book: readonly Press[], pointerId: number, at: number, distance: number): Press[];
  export function decide(book: readonly Press[], now: number): PressDecision;
  /** 아직 톡인지 모르는 누름이 있나 (있으면 화면이 뒤집기를 막는다) */
  export function isWaiting(book: readonly Press[], now: number): boolean;
  ```

판정 규칙 (설계서 §5.1):
- 톡 = `upAt !== null && isTap(distance, upAt - downAt)`.
- 대기 = `upAt === null && now - downAt < TAP_MAX_DURATION_MS`.
- 그 밖(오래 누름·움직임·300ms 넘게 계속 누름)은 판정에서 빠진다.
- `decide`: `downAt` 오름차순(같으면 book에 먼저 들어온 것 먼저, 안정 정렬)으로 훑어, 처음 만나는 것이 대기면 `wait`, 톡이면 `ring`. 다 빠지면 `none`.
- `pressDown`에 이미 있는 `pointerId`가 오면 새 누름으로 바꾼다.

- [ ] **Step 1: 실패 테스트**
  - 톡 하나: down 0 → up 100(거리 0) → `decide(_, 100)`은 `ring`.
  - 계속 누름: down 0 → `decide(_, 299)` `wait`, `decide(_, 300)` `none`.
  - 300ms 넘게 누르고 뗌, 10px 넘게 움직이고 뗌 → `none`.
  - 더 이른 톡이 늦게 떼도 이긴다: A down 0·up 200, B down 50·up 100 → `decide(_, 100)` `wait`, `decide(_, 200)` A.
  - `계속 누르는 손바닥은 300ms 뒤 빠지고 다른 사람의 톡이 이긴다` (Review Focus 1): A down 0 계속, B down 50·up 120 → `decide(_, 120)` `wait`, `decide(_, 300)` B.
  - `downAt`이 같으면 book에 먼저 들어온 사람이 이긴다.
  - 없는 `pointerId`의 `pressUp`은 내용이 같다. `isWaiting`은 299에 true, 300에 false, 뗀 뒤 false.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/bell/logic/press.test.ts` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** `Date.now()`·`performance.now()`를 이 파일에서 부르지 마라. 이유: 시각은 화면이 이벤트의 `timeStamp`로 넘긴다. 시계를 섞으면 순서가 틀어진다.

## Acceptance Criteria

```bash
npm run lint && npm run test && npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR(특히 ADR-006 Chrome 99, ADR-009)을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (순수 로직에 React/DOM import 없음, ES2023+ API 없음, 하드코딩 색·그림자·그라데이션 없음)
3. 결과에 따라 `phases/3-fruit-bell/index.json`의 step 2을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **300자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
