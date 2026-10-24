# Step 9: stack-motion

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 9)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- `/src/games/stack/ui/PlayerArea.tsx`
- `/src/games/stack/ui/PlayerArea.test.tsx`
- `/src/games/stack/ui/camera.ts`
- `/src/games/stack/ui/CubeScene.tsx`
- `/src/lib/devMode.ts`

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
- Modify: `src/games/stack/ui/PlayerArea.tsx`, `PlayerArea.module.css`
- Create: `src/games/stack/ui/FpsMeter.tsx` (dev 전용)
- Test: `src/games/stack/ui/PlayerArea.test.tsx`

**Interfaces:**
- Consumes: Task 8의 PlayerArea, Task 5(`rotMat`, `xrayCubes`, `EL_MIN/EL_MAX`), Task 2(`isDevMode`)
- Produces: svg에 `data-view="{az},{el}"`(정수 반올림) 시험 표식을 단다.
- 동작
  - **판 돌리기**
    - 조각·버튼이 아닌 곳을 누르면 시작한다. 들 수 없는 판 위 조각도 포함한다.
    - 그 포인터를 따로 캡처해 추적한다.
    - az += dx × 0.6을 [0, 360)으로 감싼다. el = clamp(el + dy × 0.35, 15, 85).
    - 갱신은 `requestAnimationFrame`으로 한 프레임에 한 번 한다.
    - `active`가 false면 시작하지 않는다.
  - **회전 애니메이션**
    - 톡·버튼 회전은 새 방향을 즉시 상태에 반영한다.
    - 화면에서만 220ms 동안 축 k 둘레 −90° → 0°로 되돌아오며 그린다. 이징은 1 − (1 − t)²이다.
    - 축은 조각 중심(`centerOf`)을 지난다. 돌리기의 k는 (0,0,1), 눕히기의 k는 `tipAxis(cam)`이다.
    - `CubeScene`의 `xf`로 넘긴다.
  - **가림**: 끄는 중 미리보기가 있으면, `xrayCubes`로 판 위 정육면체에 `xray`를 단다.
  - **fps**: `isDevMode(window.location.search)`일 때만 칸 오른쪽 위에 작은 글자로 초당 프레임 수를 보인다. `FpsMeter`는 rAF로 1초마다 센다.

- [ ] **Step 1: 실패 테스트**
  - 판 빈 곳을 오른쪽으로 끌면 `data-view`의 az가 늘어난다. 아래로 많이 끌면 el이 85에서 멈춘다.
  - `active=false`면 `data-view`가 그대로다.
  - **Review Focus 1** `두 손가락: 조각 끌기와 판 돌리기가 섞이지 않는다`
    - pointerId 1로 조각을 정답 자리로, pointerId 2로 판 빈 곳을 끈다.
    - 끝나면 조각은 `"board"`이고 az는 바뀌어 있다.
  - 들 수 없는(위에 얹힌) 판 위 조각을 끌면 그 조각은 그대로이고 `data-view`가 바뀐다.
  - `?dev`가 아니면 fps 글자가 없다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack` → FAIL
- [ ] **Step 3: 구현** — 위 동작대로 쓴다. 판 돌리기 포인터와 `usePointerDrag` 포인터는 pointerId로 구분한다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 판 돌리기를 45° 단위로 맞추지 마라. 이유: 사용자가 정한 "부드럽게 돌리기". 칠판에서 느리면 사용자와 정한다(설계서 §5.4).

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 9을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
