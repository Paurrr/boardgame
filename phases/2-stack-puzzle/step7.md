# Step 7: stack-layout

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 7)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- `/src/games/stack/logic/{types,rotate}.ts`
- `/src/games/stack/ui/camera.ts`
- `/src/games/blocks/ui/layout.ts`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 공통 제약 (모든 step)

- 칠판 Chrome 99. CSS nesting·container query·`:has()`·`oklch()/color-mix()` 금지. JS는 ES2022까지(`toSorted` 등 금지). 폴리필 없음.
- 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM 의존 금지. `src/games/stack/ui/camera.ts`·`ui/layout.ts`도 순수 TS로 쓴다.
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits다(execute.py가 단계마다 커밋한다).
- 색은 `src/styles.css`의 `:root` 변수만 쓴다. 조각 색은 1탄 `src/games/blocks/logic/pieces.ts` 값을 빌린다. 그림자·글로우·그라데이션·필터 금지. 두께는 아래 테두리로 낸다.
- 공개 명칭은 "쌓기 퍼즐", id는 `stack`이다. "우봉고" 이름·원작 카드·그림 금지.
- 플레이어 칸은 가로로 나란히 둔다. 조작 요소는 칸의 아래쪽 2/3에만 둔다. 누르는 요소는 56 CSS px 이상이다.
- 터치는 Pointer Events, 포인터별 캡처를 쓴다. 칸 안 버튼은 `pointerdown`에 반응한다. 멀티터치 판단에 `navigator.maxTouchPoints`를 쓰지 않는다.
- 끄는 중 조각 위치는 `transform` 직접 갱신이다. React 상태는 떨어질 자리가 바뀔 때만 바꾼다. 판 돌리기·회전 애니메이션은 매 프레임 다시 그린다(ADR-008 예외, Task 0이 문서화).
- 높이 제한 `MAX_H = 2`. 숫자 기본값: 처음 시점 az 30°·el 50°, 기울기 15~85°, 붙기 반경 0.9, 가림 판정 1.3, 회전 애니메이션 220ms, 트레이 배율 0.6, 판 돌리기 1px당 0.6°(좌우)·0.35°(위아래).

## 작업

**Files:**
- Create: `src/lib/rects.ts`, `src/games/stack/ui/layout.ts`
- Modify: `src/games/blocks/ui/layout.ts` (`Point`·`Rect`·`freeSpot`을 `src/lib/rects.ts`에서 import하고 재수출. 동작 변화 없음)
- Test: `src/lib/rects.test.ts`, `src/games/stack/ui/layout.test.ts`

**Interfaces:**
- Consumes: Task 3(`orientations`, `sizeOf`, `heightOf`), Task 5(`EL_MIN`, `EL_MAX`, `Pt`)
- Produces:
  - `src/lib/rects.ts`: `Point`, `Rect`, `freeSpot(free, p, w, h): Point` (1탄 것을 그대로 옮긴다)
  - `src/games/stack/ui/layout.ts`:
    ```ts
    export const TRAY_SCALE = 0.6, PAD = 0.4, GAP = 0.45, SLOT_PAD = 0.3;
    export const BTN_W = 3.6, BTN_H = 1.4, BTN_GAP = 0.6, BTN_DEPTH = 0.24, MIN_BUTTON_PX = 56;
    export type StackLayout = {
      vbW: number; vbH: number; scale: number;          // scale = px / 판 단위
      boardBox: Rect;                                   // 어느 시점에서도 판이 들어가는 고정 상자
      buttons: Rect;                                    // 버튼 줄 (높이에 BTN_DEPTH 포함)
      buttonH: number;                                  // 판 단위. buttonH × scale ≥ MIN_BUTTON_PX
      slots: Pt[];                                      // 트레이 슬롯 가운데 (pieces 순서)
      slotSize: number;
    };
    export function boardBoxSize(width: number, depth: number): { w: number; h: number };
    export function slotSizeFor(pieces: { cells: Vec3[] }[], zOnly: boolean): number;  // 3D 대각선 최대 × TRAY_SCALE + SLOT_PAD
    export function computeLayout(width: number, depth: number, slotSize: number, n: number, buttons: number, pxW: number, pxH: number): StackLayout;
    export function boardOrigin(layout: StackLayout, el: number): Pt;   // 판 중심 바닥이 오는 화면점 = boardBox 가운데 + (0, cos el)
    export function clientToSvg(layout: StackLayout, box: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number): Pt;
    export function looseAreas(layout: StackLayout, pxW: number, pxH: number): Rect[];  // 보이는 범위 − boardBox − buttons, 가장자리 PAD
    export function looseSpot(layout: StackLayout, pxW: number, pxH: number, center: Pt, w: number, h: number): Pt; // 가운데 좌표로 돌려준다
    ```
- 규칙
  - `boardBoxSize`
    - w = 바닥 대각선 hypot(W, D)
    - h = EL_MIN~EL_MAX(1° 간격)에서 max(diag·sin el + MAX_H·cos el)
  - `computeLayout`
    - 위에서부터 PAD, boardBox, GAP, 버튼 줄, GAP, 트레이(1줄 또는 2줄 중 scale이 큰 쪽), PAD 순이다.
    - 화면 맞춤은 `xMidYMax meet`다.
    - 버튼 높이는 buttonH × scale ≥ 56이 될 때까지 늘리며 다시 계산한다(최대 3회).
  - `clientToSvg`는 `xMidYMax meet`의 여백을 계산에 넣는다. 가로는 가운데, 세로는 아래 정렬이다.

- [ ] **Step 1: 실패 테스트**
  - `rects.test.ts`: 1탄 `freeSpot` 테스트가 있으면 옮기고, 없으면 "영역 안이면 그대로, 밖이면 가장 가까운 영역으로" 두 사례를 쓴다.
  - 4인 칸(316×440 px), 어려움(3×3 바닥, 슬롯 4개, 버튼 2개)에서 `buttonH * scale >= 56`이다.
  - 같은 입력이면 el과 무관하게 boardBox가 같다(시그니처에 el이 없음을 확인).
  - `clientToSvg`: 칸 왼쪽 위·오른쪽 아래 px가 보이는 범위의 모서리 SVG 좌표로 바뀐다.
  - **Review Focus 4** `looseSpot: 버튼 줄·칸 밖에 걸치면 가장 가까운 빈 곳으로`
    - 버튼 줄과 겹치는 가운데 → 겹치지 않는 가장 가까운 곳으로 간다.
    - 칸 밖 가운데 → 보이는 범위 안으로 들어온다.
    - 이미 빈 곳이면 그대로다.
  - 1탄 테스트(`src/games/blocks`)가 전부 그대로 통과한다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/lib src/games/stack/ui/layout.test.ts` → FAIL
- [ ] **Step 3: 구현** — 위 규칙대로 쓴다. 1탄 `visibleArea`/`freeAreas`의 원리를 따르되, stack 레이아웃 타입에 맞게 쓴다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 1탄 레이아웃의 동작을 바꾸지 마라. 이유: 이 단계는 함수를 옮기기만 한다.

## Acceptance Criteria

```bash
npm run lint && npm run test && npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR(특히 ADR-006 Chrome 99, ADR-008)을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (순수 로직에 React/DOM import 없음, ES2023+ API 없음, 하드코딩 색·그림자·그라데이션 없음)
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 7을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
