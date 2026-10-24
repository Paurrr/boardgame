# Step 4: stack-generator

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 4)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- `/src/games/stack/logic/types.ts`
- `/src/games/stack/logic/pieces.ts`
- `/src/games/stack/logic/rotate.ts`
- `/src/games/stack/logic/board.ts`
- `/src/lib/random.ts`, `/src/lib/difficulty.ts`, `/src/games/blocks/logic/solver.ts`

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
- Create: `src/games/stack/logic/{solver,generator}.ts`
- Test: `src/games/stack/logic/{solver,generator}.test.ts`

**Interfaces:**
- Consumes: Task 3 전부. `Rng`·`createRng`(`src/lib/random.ts`), `Difficulty`(`src/lib/difficulty.ts`)
- Produces:
  - `solveStack(footprint: Cell2[], ids: StackPieceId[], rng?: Rng): Placed[] | null` — footprint × 2층을 정확히 덮는다
  - `buildable(solution: Placed[]): boolean` — 어떤 순서로든 `dropZ`로 지어진다
  - `permutations<T>(xs: T[]): T[][]`
  - `generatePuzzle(rng: Rng, difficulty: Difficulty): Puzzle`
  - 상수: `EASY_MAX_SIDE = 3`, `FULL_MAX_SIDE = 4`, `EASY_MIN_UPPER = 2`, `EASY_TRIES = 300`, `FULL_TRIES = 20000`

- [ ] **Step 1: 실패 테스트**
  - `solveStack`
    - 2×2 바닥 + `['O4','O4']`는 해가 있다.
    - 일자 3칸 + `['I3','L3']`는 null이다. ㄱ자 3칸 + `['I3','L3']`도 null이다.
    - `[(0,0),(1,0),(2,0),(2,1)]` + `['L4','R4']`는 해가 있고 `buildable`이다.
    - 2×3 + `['T4','Y4','R4']`는 해가 있다.
    - 정육면체 합이 2×바닥과 다르면 null이다.
  - `generatePuzzle` 속성 테스트: 난이도별 시드 1~200
    - 같은 시드면 `toEqual`이다.
    - `isSolved(area, solution)`이다.
    - 어떤 순서로든 `landing`으로 정답 자리(z 포함)에 차례로 놓인다.
    - 조각 id가 서로 다르다.
    - 개수: 쉬움 2, 보통 3, 어려움 4
    - 쉬움
      - `PLANAR_IDS`만 쓴다.
      - z = 1 칸이 2개 이상이다.
      - 떠 있는 칸이 없다(z = 1 칸의 아래가 target에 있다).
      - 바닥이 3×3 이내이고 이어져 있다.
      - `inside === true`다.
      - pieces[i].cells가 정답 cells의 zOnly 방향 중 하나다.
    - 보통·어려움
      - target이 바닥 × {0,1}이다.
      - 바닥이 4×4 이내다.
      - `inside === false`다.
      - pieces[i].cells가 `normalize(STACK_PIECES[id].cells)`다.
    - 200개 생성 합계가 5초 미만이다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack/logic` → FAIL
- [ ] **Step 3: 구현**
  - `solveStack`: 1탄 `src/games/blocks/logic/solver.ts`와 같은 "첫 빈칸" 백트래킹이다. 칸 순서는 (z, y, x)다. 각 방향의 기준점은 그 방향 정육면체 중 (z, y, x) 순 첫 칸이다. 높이 ≤ 2 방향만 쓴다. rng가 있으면 조각 순서와 방향 순서를 섞는다.
  - 보통·어려움 생성은 설계서 §3.4 그대로다.
    1. 정육면체 합이 짝수인 서로 다른 조합을 고른다.
    2. 칸을 하나씩 붙여 바닥을 키운다. 새 칸 가중치는 이웃 수²이고, 바운딩박스는 4×4 이내다.
    3. `solveStack(…, rng)`로 배치를 찾는다.
    4. `buildable`이 아니면 다시 한다.
  - 쉬움 생성은 설계서 §3.4 쉬움 절 그대로다.
    1. 평면 2개를 고르고, 각각 높이 ≤ 2 방향을 무작위로 정한다.
    2. 둘째 조각은 x, y를 각각 −3~+3 중 무작위로 정해 떨어뜨린다.
    3. 3층 이상, 떠 있는 칸, 2층 2개 미만, 3×3 초과, 끊김 중 하나라도 있으면 버린다.
    4. `EASY_TRIES`번 이상 시도한 것 중 바닥 채움률이 가장 높은 것을 고른다.
  - pieces 순서는 `rng.shuffle`이다. 쉬움 처음 방향은 정답 cells에 `rotZ`를 `rng.int(4)`번 적용한 것이다.
  - 결과 좌표는 바닥 최소 좌표가 (0,0)이 되게 옮긴다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 실패 시 무한 루프를 돌지 마라. 시도 상한을 넘으면 `throw new Error`한다. 이유: 칠판이 멈춘다.

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 4을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
