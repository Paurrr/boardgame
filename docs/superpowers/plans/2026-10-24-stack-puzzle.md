# 쌓기 퍼즐(3D) 구현 계획

> **For agentic workers:** 이 프로젝트는 Harness로 실행한다. 이 문서의 Task N은 그대로 `phases/2-stack-puzzle/stepN.md`가 된다. 각 Task는 독립된 Claude 세션에서 실행되므로, 그 Task 안의 정보와 "읽어야 할 파일"만으로 작업할 수 있게 썼다. 실행 명령: `python -X utf8 scripts/execute.py 2-stack-puzzle` (Windows 기본 인코딩 cp949 문제로 `-X utf8`). Steps use checkbox (`- [ ]`) syntax.

**Goal:** 2탄 "쌓기 퍼즐"을 숨긴 게임으로 추가한다. 칠판에서 `?dev` 주소로 열어 성능과 조작을 확인할 수 있는 상태까지 만든다.

**Architecture:**
- 규칙·생성·투영 계산은 `src/games/stack/logic`과 `src/games/stack/ui/camera.ts`, `ui/layout.ts`의 순수 함수로 만들고 Vitest로 TDD 한다.
- 화면은 SVG 정사영이다. 정육면체의 보이는 면만 다각형으로, 깊이 순서대로 그린다.
- 공통 셸은 세 가지만 바꾼다: 게임별 제한시간 선택지, 게임별 최고기록, 숨긴 게임.

**Tech Stack:** Vite 7 + React 19 + TypeScript(strict), SVG, CSS Modules, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-24-stack-puzzle-design.md` (모든 Task가 먼저 읽는다)

**참고(로컬 전용):** `spike.local/stack3d/`. git에 없는 실험 코드라 이 PC에서만 있다. `cubes.ts`·`Column.tsx`에 같은 알고리즘이 동작하는 형태로 들어 있다. 있으면 참고하되 그대로 복사하지 말고 이 계획의 이름·시그니처를 따른다.

## Global Constraints
- 칠판 Chrome 99. CSS nesting·container query·`:has()`·`oklch()/color-mix()` 금지. JS는 ES2022까지(`toSorted` 등 금지). 폴리필 없음.
- 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM 의존 금지. `src/games/stack/ui/camera.ts`·`ui/layout.ts`도 순수 TS로 쓴다.
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits다(execute.py가 단계마다 커밋한다).
- 색은 `src/styles.css`의 `:root` 변수만 쓴다. 조각 색은 1탄 `src/games/blocks/logic/pieces.ts` 값을 빌린다. 그림자·글로우·그라데이션·필터 금지. 두께는 아래 테두리로 낸다.
- 공개 명칭은 "쌓기 퍼즐", id는 `stack`이다. "우봉고" 이름·원작 카드·그림 금지.
- 플레이어 칸은 가로로 나란히 둔다. 조작 요소는 칸의 아래쪽 2/3에만 둔다. 누르는 요소는 56 CSS px 이상이다.
- 터치는 Pointer Events, 포인터별 캡처를 쓴다. 칸 안 버튼은 `pointerdown`에 반응한다. 멀티터치 판단에 `navigator.maxTouchPoints`를 쓰지 않는다.
- 끄는 중 조각 위치는 `transform` 직접 갱신이다. React 상태는 떨어질 자리가 바뀔 때만 바꾼다. 판 돌리기·회전 애니메이션은 매 프레임 다시 그린다(ADR-008 예외, Task 0이 문서화).
- 높이 제한 `MAX_H = 2`. 숫자 기본값: 처음 시점 az 30°·el 50°, 기울기 15~85°, 붙기 반경 0.9, 가림 판정 1.3, 회전 애니메이션 220ms, 트레이 배율 0.6, 판 돌리기 1px당 0.6°(좌우)·0.35°(위아래).

## Review Focus
1. **같은 칸에서 두 손가락**: 한 손가락은 조각을 끌고 다른 손가락은 판 빈 곳을 끌 때, 서로 섞이지 않아야 한다. 조각은 제자리에 놓이고 시점만 바뀐다. → Task 9 테스트 `두 손가락: 조각 끌기와 판 돌리기가 섞이지 않는다`
2. **끄는 도중 라운드 끝(`active`가 false)**: 조각이 공중에 남거나 놓이면 안 된다. 원래 자리로 돌아간다. → Task 8 테스트 `끄는 중에 active가 false가 되면 놓지 않고 원래 자리로`
3. **위에 얹힌 조각**: 톡·버튼·끌기 모두 그 조각을 움직이지 않는다. 끌기는 판 돌리기가 된다(Task 9). → Task 8 테스트 `위에 얹힌 조각은 돌리기·들기가 안 된다`
4. **판 밖에 둘 때 가장자리·버튼 줄에 걸침**: 칸 안 빈 곳으로 밀려야 한다. 칸 밖이나 버튼 위에 남으면 안 된다. → Task 7 테스트 `looseSpot: 버튼 줄·칸 밖에 걸치면 가장 가까운 빈 곳으로`
5. **판 위 조각을 돌렸더니 그 자리에 안 맞을 때**: 사라지지 않고 판 밖에 마지막으로 둔 자리, 없으면 트레이로 간다. → Task 8 테스트 `판 위에서 돌려 안 맞으면 판 밖 마지막 자리로`

---

## Phase 2-stack-puzzle (칠판 확인 전)

### Task 0: docs-rules — 규칙 문서와 CLAUDE.md 예외

**Files:**
- Modify: `docs/ADR.md` (ADR-008 추가), `CLAUDE.md` (예외 한 줄), `docs/PRD.md`, `docs/UI_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (§9 한 줄)

**Interfaces:** 없음. 이후 Task는 이 문서들을 지침으로 받는다. execute.py가 CLAUDE.md와 docs/*.md를 매 단계 프롬프트에 넣는다.

- [ ] **Step 1: ADR-008을 쓴다** — 기존 ADR 형식(결정/이유/트레이드오프)을 따르고, 설계서 §9 첫 항목의 내용을 담는다.
  - SVG 정사영과 자유로운 판 돌리기(WebGL 미사용)
  - 바깥 여유 칸 없음과 가까운 자리로 붙기(`SNAP_RADIUS` 0.9)
  - 쉬움의 높이가 섞인 목표(원안 0개 → 변경)
  - 트레이 0.6배와 판 밖 조각 0.6배
  - 회전 애니메이션·판 돌리기를 매 프레임 다시 그림
  - 게임별 제한시간(쌓기 퍼즐 90/120/150, 기본 120)과 게임별 최고기록
  - 칠판 확인용 숨긴 게임(`?dev`)
- [ ] **Step 2: CLAUDE.md 아키텍처 규칙의 드래그 줄 바로 아래에 한 줄을 더한다** (사용자 허락받음):
  `- 예외(쌓기 퍼즐, ADR-008): 판 돌리기·회전 애니메이션은 매 프레임 다시 그린다. 끄는 중 떨어질 자리 표시는 자리가 바뀔 때만 상태를 갱신한다`
- [ ] **Step 3: 나머지 문서를 고친다**
  - PRD: 핵심 기능에 2탄을 추가한다. "MVP 제외: 3D 우봉고"를 이 계획 링크로 바꾼다. 쌓기 퍼즐 제한시간 90/120/150초와 게임별 최고기록을 적는다.
  - UI_GUIDE: 쌓기 퍼즐 절을 추가한다.
    - 트레이·판 밖 0.6배
    - 회전 220ms(다시 투영)
    - 정육면체 음영 = 면 색 위에 `--ink`를 반투명으로 덮는다. 진하기는 (1 − n.z)(0.24 + 0.14·(n·r))
    - 빈칸은 `--target` 반투명 점선, 미리보기는 진하게, 못 놓는 끌기는 투명도 0.5, 가림은 0.25
    - 조각 색 대응 Y4←P5, R4←L5, Q4←U5
  - ARCHITECTURE: `src/games/stack/` 트리(설계서 §5.1)와 `src/lib/rects.ts`, `src/lib/devMode.ts`를 추가한다.
  - 1탄 설계서 §9의 "3D 우봉고" 줄 끝에 "→ 2탄 설계서(2026-10-24-stack-puzzle-design.md)"를 붙인다.
- [ ] **Step 4: 검증** — `npm run lint && npm run test && npm run build` 통과(문서만 바꿔 깨질 것이 없어야 한다).

**금지:** 코드를 바꾸지 마라. 이유: 이 단계는 이후 단계의 지침 문서만 맞춘다.

### Task 1: shell-time-options — 게임별 제한시간 선택지

**Files:**
- Modify: `src/games/types.ts`, `src/shell/logic/setup.ts`, `src/shell/logic/persistence.ts`, `src/shell/ui/PlayerSetup.tsx`, `src/App.tsx`
- Test: `src/shell/logic/setup.test.ts`, `src/shell/logic/persistence.test.ts`, `src/shell/ui/PlayerSetup.test.tsx`

**Interfaces:**
- Produces:
  - `GameModule`에 선택 속성 `timeOptions?: readonly number[]`, `defaultTimeSec?: number`를 더한다.
  - `setup.ts`:
    - `type TimeRules = { timeOptions?: readonly number[]; defaultTimeSec?: number }`
    - `timeOptionsOf(rules: TimeRules): readonly number[]` — 없으면 `TIME_OPTIONS`(60/90/120)
    - `defaultTimeOf(rules: TimeRules): number` — 없으면 90
    - `fitTimeLimit(rules: TimeRules, sec: number): number` — 선택지에 있으면 sec, 없으면 기본값
    - `defaultSetup(rules?: TimeRules)` — `timeLimitSec = defaultTimeOf(rules ?? {})`

- [ ] **Step 1: 실패 테스트**
  - `setup.test.ts`:
    - `timeOptionsOf({})`가 `[60, 90, 120]`이다.
    - `fitTimeLimit({ timeOptions: [90, 120, 150], defaultTimeSec: 120 }, 60) === 120`이다.
    - `fitTimeLimit({}, 150) === 90`이다.
    - `defaultSetup({ timeOptions: [90, 120, 150], defaultTimeSec: 120 }).timeLimitSec === 120`이다.
  - `persistence.test.ts`:
    - 기존 `'없는 제한시간'`(30초 → null) 사례를 고친다. `timeLimitSec: 150` 저장값을 `loadSetup`이 **그대로** 돌려준다(이름·인원·난이도·라운드 유지).
    - 0·음수·NaN·문자열은 여전히 null이다.
  - `PlayerSetup.test.tsx`:
    - `timeOptions: [90, 120, 150]`인 가짜 게임이면 제한 버튼이 '90초'·'120초'·'150초'다.
    - `initial.timeLimitSec = 150`으로 블록 퍼즐을 열면 '90초'가 눌려 있고 이름은 initial 그대로다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/shell` → 새 테스트 FAIL
- [ ] **Step 3: 구현**
  - `loadSetup`의 `TIME_OPTIONS.includes` 검사를 "양의 유한 정수"로 바꾼다. 게임에 맞추는 일은 PlayerSetup이 한다.
  - PlayerSetup은 `timeOptionsOf(game)`으로 버튼을 만들고, 처음 값은 `fitTimeLimit(game, initial.timeLimitSec)`로 정한다.
  - App은 저장값이 없을 때 `defaultSetup(screen.game)`을 쓴다.
  - 빠르기 보너스(`speedBaseMs`)는 `config.timeLimitSec`에서 나오므로 손대지 않는다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:**
- 블록 퍼즐 모듈(`src/games/blocks/index.ts`)에 시간 속성을 넣지 마라. 이유: 없으면 기존 60/90/120이 기본이다.
- 저장 키 이름(`boardgame.setup.v1`)을 바꾸지 마라. 이유: 기존 설정을 잃는다.

### Task 2: shell-records-hidden — 게임별 최고기록, 숨긴 게임

**Files:**
- Modify: `src/games/types.ts`, `src/games/registry.ts`, `src/shell/logic/persistence.ts`, `src/shell/ui/Match.tsx`, `src/shell/ui/GameMenu.tsx`
- Create: `src/lib/devMode.ts`
- Test: `src/shell/logic/persistence.test.ts`, `src/games/registry.test.ts`, `src/lib/devMode.test.ts`, `src/shell/ui/GameMenu.test.tsx`

**Interfaces:**
- Produces:
  - `GameModule.hidden?: boolean`
  - `isDevMode(search: string): boolean` — `new URLSearchParams(search).has('dev')`
  - `menuGames(games: readonly GameModule[], search: string): GameModule[]` — `hidden`인 게임은 dev일 때만
  - `loadBestTimes(store, gameId: string)`, `recordBestTime(store, gameId: string, difficulty, ms): boolean` — 키는 `` `boardgame.${gameId}.best.v1` ``. 그래서 블록 퍼즐 키는 기존 그대로다.

- [ ] **Step 1: 실패 테스트**
  - `recordBestTime(store, 'stack', 'easy', 9000)`이 `boardgame.blocks.best.v1`을 건드리지 않는다.
  - 기존 `boardgame.blocks.best.v1` 값을 `loadBestTimes(store, 'blocks')`가 그대로 읽는다.
  - `isDevMode('?dev')`·`isDevMode('?a=1&dev')`는 true, `isDevMode('')`는 false다.
  - `menuGames([visible, hiddenGame], '')`는 길이 1, `'?dev'`이면 길이 2다.
  - GameMenu는 `window.location.search`가 비면 숨긴 게임 카드를 안 그린다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/shell src/games src/lib` → FAIL
- [ ] **Step 3: 구현** — 기존 persistence 함수에 `gameId`를 더하고, Match는 `game.id`를 넘긴다. GameMenu는 `menuGames(GAMES, window.location.search)`를 그린다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 기존 블록 퍼즐 최고기록 데이터를 옮기거나 지우는 코드를 넣지 마라. 이유: 키가 그대로라 옮길 것이 없다.

### Task 3: stack-logic — 타입·조각·회전·판 규칙

**Files:**
- Create: `src/games/stack/logic/{types,pieces,rotate,board}.ts`
- Test: `src/games/stack/logic/{pieces,rotate,board}.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Vec3 = { x: number; y: number; z: number };
  export type Cell2 = { x: number; y: number };
  export type StackPieceId = 'I3' | 'L3' | 'I4' | 'O4' | 'T4' | 'L4' | 'S4' | 'Y4' | 'R4' | 'Q4';
  /** width×depth = 바닥 바운딩박스(여유 칸 없음). target = 채워야 할 3D 칸. inside = 쉬움 놓기 방식 */
  export type Area = { width: number; depth: number; target: Vec3[]; inside: boolean };
  export type Placed = { id: StackPieceId; cells: Vec3[]; at: Vec3 };
  export type Puzzle = { area: Area; pieces: { id: StackPieceId; cells: Vec3[] }[]; solution: Placed[] };
  export const MAX_H = 2;
  ```
- `pieces.ts`:
  - `STACK_PIECES: Record<StackPieceId, { cells: Vec3[]; color: string }>`
    - I3~S4는 1탄 `PIECES`의 cells에 z = 0을 붙인 것이다.
    - Y4 `(0,0,0)(1,0,0)(0,1,0)(0,0,1)`
    - R4 `(0,0,0)(1,0,0)(1,1,0)(1,1,1)`
    - Q4 `(0,1,0)(1,1,0)(1,0,0)(1,0,1)`
    - 색은 1탄에서 import한다. Y4←P5, R4←L5, Q4←U5.
  - `STACK_IDS`, `PLANAR_IDS = ['I3','L3','I4','O4','T4','L4','S4']`
- `rotate.ts`:
  - `key3(c): string`
  - `normalize(cells): Vec3[]` — 최소 좌표를 0으로 하고, (z, y, x) 순으로 정렬
  - `rotZ(cells)` — (x, y, z) → (−y, x, z) 후 정규화
  - `rotateAbout(cells, axis: Vec3)` — 정수 단위 축 둘레 +90°(오른손). v' = k × v + (k·v)k 후 정규화
  - `orientations(cells, zOnly = false): Vec3[][]` — 서로 다른 방향만
  - `heightOf(cells)`, `sizeOf(cells): { w; d }`
  - `centerOf(cells): Vec3` — (w/2, d/2, h/2)
- `board.ts`:
  - `dropZ(cells, ax, ay, others: Placed[]): number` — 기둥별 최고 높이 기준. 위에서 떨어져 처음 닿는 곳
  - `landing(area, others, cells, ax, ay): Vec3 | null`
    - z + 높이 > MAX_H면 null
    - inside면 모든 정육면체가 target 안이어야 한다
    - 아니면 0 ≤ x < width, 0 ≤ y < depth
  - `canLift(placed, id): boolean` — 같은 기둥에서 더 높은 곳에 다른 조각이 있으면 false
  - `isSolved(area, placed): boolean` — 놓인 정육면체 집합 == target 집합
  - `footprintOf(target): Cell2[]`

- [ ] **Step 1: 실패 테스트**
  - `orientations` 개수: 전체 / 높이 ≤ 2 / zOnly

    | 조각 | 전체 | 높이 ≤ 2 | zOnly |
    |---|---|---|---|
    | I3 | 3 | 2 | 2 |
    | L3 | 12 | 12 | 4 |
    | I4 | 3 | 2 | 2 |
    | O4 | 3 | 3 | 1 |
    | T4 | 12 | 8 | 4 |
    | L4 | 24 | 16 | 4 |
    | S4 | 12 | 8 | 2 |
    | Y4 | 8 | 8 | 4 |
    | R4 | 12 | 12 | 4 |
    | Q4 | 12 | 12 | 4 |

  - `rotZ` 4번 = 정규화한 원래 모양이다. `rotateAbout(c, {x:1,y:0,z:0})` 4번 = 원래 모양이다. `rotateAbout(c, {x:0,y:0,z:1})` = `rotZ(c)`이다.
  - Q4는 `orientations(R4)`에 없다.
  - `dropZ`
    - 빈 판이면 0이다.
    - O4 위에 I3를 떨어뜨리면 1이다.
    - 떠 있는 정육면체 밑으로는 못 들어간다. (0,0)에 z = 1 정육면체가 있으면 그 기둥에 떨어지는 조각은 2다.
  - `landing`: 높이 2짜리 조각이 z = 1에 떨어지면 null이다. inside에서 target 밖이면 null이다. free에서 바운딩박스 밖이면 null이다.
  - `canLift`: 아래 조각은 false, 위 조각은 true다.
  - `isSolved`: target 밖 정육면체가 하나라도 있으면 false다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack/logic` → FAIL
- [ ] **Step 3: 구현** — 시그니처대로 쓴다. `orientations`는 `rotZ`와 `rotateAbout(·, x축)`으로 BFS를 돌며 `normalize`한 key로 중복을 거른다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** React·DOM import 금지. 이유: CLAUDE.md CRITICAL(로직 순수 TS).

### Task 4: stack-generator — 솔버·생성기

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

### Task 5: stack-camera — 투영·놓을 자리·가림 (순수)

**Files:**
- Create: `src/games/stack/ui/camera.ts`
- Test: `src/games/stack/ui/camera.test.ts`

**Interfaces:**
- Consumes: Task 3(`landing`, 타입), Task 4(`generatePuzzle`, `permutations`. 테스트에서만 쓴다)
- Produces:
  ```ts
  export type Pt = { x: number; y: number };
  /** r: 화면 오른쪽, u: 화면 위, d: 보는 사람 쪽 (월드 단위 벡터). az·el은 도 */
  export type Camera = { az: number; el: number; r: Vec3; u: Vec3; d: Vec3 };
  export const AZ0 = 30, EL0 = 50, EL_MIN = 15, EL_MAX = 85, SNAP_RADIUS = 0.9, XRAY_RADIUS = 1.3;
  export function makeCamera(az: number, el: number): Camera;
  export function project(cam: Camera, p: Vec3): Pt;            // { x: p·r, y: −(p·u) }
  export function depth(cam: Camera, p: Vec3): number;          // p·d
  export function unproject(cam: Camera, s: Pt, z: number): { x: number; y: number }; // 연속값
  export function tipAxis(cam: Camera): Vec3;                   // 눕히기 축 (설계서 §4.5)
  export function landingNear(cam: Camera, area: Area, others: Placed[], cells: Vec3[], rel: Pt, pivot: Vec3): Vec3 | null;
  export function boardOutline(cam: Camera, width: number, depth: number): Pt[];  // pivot (W/2, D/2, 0) 기준, 0~2층 상자의 화면 볼록 윤곽
  export function pointInPolygon(p: Pt, poly: Pt[]): boolean;
  export function xrayCubes(cam: Camera, toScreen: (p: Vec3) => Pt, targets: Vec3[], cubes: Vec3[]): Set<string>; // 가리는 칸의 key3
  export type Mat = number[];                                   // 3×3 행 우선
  export function rotMat(axis: Vec3, rad: number): Mat;         // 로드리게스
  export function applyMat(m: Mat, v: Vec3): Vec3;
  ```
- 식(실험에서 검증됨). a = az, t = el(라디안):
  - `r = (sin a, −cos a, 0)`
  - `u = (−sin t·cos a, −sin t·sin a, cos t)`
  - `d = (cos t·cos a, cos t·sin a, sin t)`
  - `unproject`: A = s.x, B = (s.y + z·cos t)/sin t → x = A·sin a + B·cos a, y = −A·cos a + B·sin a
  - `tipAxis`: v = 보는 방향 (cos a, sin a)에 가까운 축(|cos| ≥ |sin|이면 (sign cos a, 0, 0), 아니면 (0, sign sin a, 0)), 축 = z × v = (−v.y, v.x, 0)
  - `landingNear`
    1. z = 1, 0 순으로 그 높이 평면의 칸(`round(unproject + pivot)`)에 `landing`했을 때 l.z === z면 반환한다.
    2. 아니면 z = 0 평면 칸의 `landing`을 반환한다(null이 아니면).
    3. 아니면 각 z 평면 칸의 주변 3×3에서 놓을 수 있는 자리 중, 화면 거리 |project(l − pivot) − rel|이 가장 작고 `SNAP_RADIUS` 미만인 것을 고른다.
    4. 없으면 null이다.
  - `xrayCubes`: cubes 중 어떤 target보다 깊이가 0.01 넘게 크고(앞), 정육면체 중심의 화면 거리가 `XRAY_RADIUS` 미만인 것

- [ ] **Step 1: 실패 테스트**
  - az ∈ {0, 30, 100, 200, 300}, el 50에서 z ∈ {0,1}, x·y ∈ [−3, 3]의 격자점을 `unproject(project(p), p.z)`하면 원래 좌표다(오차 1e-9).
  - az 0~330(30° 간격)에서 `applyMat(rotMat(tipAxis(cam), π/2), {0,0,1})`과 `cam.d`의 내적이 0보다 크다(윗부분이 보는 사람 쪽으로 간다).
  - `makeCamera(30, 50).d`의 세 성분이 모두 양수다.
  - `landingNear` 통계(실험 drop-test와 같은 방식)
    - 난이도별 시드 1~60, 각 퍼즐마다 무작위 시점 6개(az 0~360, el 25~85, rng 시드 7)를 쓴다.
    - 정답을 놓을 수 있는 순서대로 하나씩 둔다. 정답 자리 화면점에 반지름 r 원 안의 무작위 오차를 더한다.
    - r = 0.2이면 맞는 자리가 99% 이상이다.
    - r = 0.5이면 null이 2% 이하이고 맞는 자리가 84% 이상이다.
    - 거리 3~4이면 null이 95% 이상이다.
  - `pointInPolygon`: `boardOutline(cam, 3, 3)` 안에 원점(판 중심)이 있고, (20, 20)은 밖이다.
  - `xrayCubes`
    - target (0,0,0)을 앞쪽 (1,1,1) 칸이 가리면 그 key가 들어 있다.
    - 뒤쪽 (−1,−1,0) 칸은 들어 있지 않다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack/ui/camera.test.ts` → FAIL
- [ ] **Step 3: 구현** — 위 식대로 쓴다. `boardOutline`은 상자 8꼭짓점을 투영한 점들의 볼록 껍질이다(점 8개라 간단한 gift wrapping으로 충분).
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** React import 금지. 이유: 순수 함수로 두어야 TDD로 검증된다.

### Task 6: stack-scene — 정육면체 그리기 컴포넌트

**Files:**
- Create: `src/games/stack/ui/CubeScene.tsx`, `src/games/stack/ui/CubeScene.module.css`
- Test: `src/games/stack/ui/CubeScene.test.tsx`

**Interfaces:**
- Consumes: Task 5(`Camera`, `Pt`, `depth`, `Mat`, `applyMat`), Task 3(`Vec3`, `StackPieceId`, `key3`)
- Produces:
  ```ts
  export type CubeKind = 'piece' | 'preview' | 'ghost';
  export type Xf = { M: Mat; pivot: Vec3 };   // 그릴 때만: world = pivot + M(p − pivot)
  export type SceneCube = {
    pos: Vec3; kind: CubeKind;
    group: string;            // 같은 group 안에서만 맞닿은 면을 생략
    color?: string; pieceId?: StackPieceId; selected?: boolean; xray?: boolean; xf?: Xf;
  };
  export function CubeScene(props: { cam: Camera; toScreen: (p: Vec3) => Pt; cubes: SceneCube[] }): JSX.Element;
  ```
- 규칙
  - 면 6개 중 (xf가 있으면 M을 적용한) 법선 n이 `n·cam.d > 1e-6`인 것만 그린다.
  - 같은 group에 (pos + 면 법선) 칸이 있으면 그 면을 생략한다. ghost는 xf 없는 모든 칸에 대해 생략한다.
  - 정육면체 중심(xf 적용)의 `depth` 오름차순으로 그린다.
  - 면마다 색 다각형 하나를 그리고, 음영 s = max(0, (1 − n.z)(0.24 + 0.14·(n·cam.r)))가 0.01보다 크면 `--ink` 다각형을 하나 더 겹친다(fill-opacity = s, ghost는 s × 0.4).
  - 정육면체 하나 = `<g data-piece={pieceId} class={xray ? 가림 : ''}>`
  - 클래스(CSS Modules)
    - face: 테두리 `--ink`
    - selected: 테두리를 굵게
    - preview: 진하게 붙은 미리보기, pointer-events 없음
    - ghost: `--target` 반투명 점선, pointer-events 없음, fill 속성 없음
    - xray: opacity 0.25
    - 음영 다각형: pointer-events 없음

- [ ] **Step 1: 실패 테스트** (`makeCamera(30, 50)`, `toScreen = p => project(cam, p)`)
  - 정육면체 하나 → 색 면 3개(+x, +y, +z)와 음영 다각형 2개다(윗면은 n.z = 1이라 음영 없음).
  - 같은 group으로 (0,0,0), (1,0,0)이면 색 면이 5개다.
  - group이 다르면 색 면이 6개다.
  - DOM 순서에서 (1,0,0) 정육면체의 `<g>`가 (0,0,0)보다 뒤다(앞이 나중).
  - ghost는 fill 속성이 없고 ghost 클래스가 있다.
  - `pieceId: 'L4'`이면 `data-piece="L4"`다.
  - `xray: true`이면 가림 클래스가 있다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack/ui/CubeScene.test.tsx` → FAIL
- [ ] **Step 3: 구현** — 위 규칙대로 쓴다. 꼭짓점 좌표는 소수 3자리로 자른다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** `filter`·`box-shadow`·그라데이션 금지. 색 하드코딩 금지. 이유: UI_GUIDE·CLAUDE.md.

### Task 7: stack-layout — 칸 배치·좌표 변환·판 밖 자리 (순수)

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

### Task 8: stack-play — 플레이어 칸 (끌기·놓기·돌리기·판 밖) + 등록

**Files:**
- Create: `src/games/stack/ui/PlayerArea.tsx`, `src/games/stack/ui/PlayerArea.module.css`, `src/games/stack/index.ts`
- Modify: `src/games/registry.ts` (`GAMES = [blocksGame, stackGame]`)
- Test: `src/games/stack/ui/PlayerArea.test.tsx`, `src/games/registry.test.ts`

**Interfaces:**
- Consumes:
  - Task 1(`timeOptions`·`defaultTimeSec`), Task 2(`hidden`), Task 3~7 전부
  - `usePointerDrag`(`src/lib/usePointerDrag.ts`), `useElementSize`, `createRng`
- Produces:
  - `stackGame: GameModule`
    - `{ id: 'stack', name: '쌓기 퍼즐', description: '조각을 쌓아 모양을 2층까지 채워요', minPlayers: 1, maxPlayers: 4, PlayerArea, timeOptions: [90, 120, 150], defaultTimeSec: 120, hidden: true }`
  - `PlayerArea`(memo, `PlayerAreaProps`)
  - 시험용 DOM 표식
    - 조각 그룹: `data-testid="stack-piece"`, `data-piece={id}`, `data-state="tray"|"loose"|"board"`, `data-cells={모양 key}`
    - 버튼: `aria-label="돌리기"`/`"눕히기"`
- 동작 (설계서 §4.1·§4.4·§4.5)
  - 시점은 상태 `{ az: AZ0, el: EL0 }`로 둔다. 판 돌리기 제스처는 Task 9.
  - 판 바닥을 그린다.
    - 바닥 모양 칸은 `--target`, 바운딩박스의 나머지 칸은 `--margin-cell`이고, 격자선은 `--grid-line`이다.
    - 실루엣은 `--target-edge`로 굵게, 풀면 `--ok`로 그린다.
  - 그 위에 빈칸(ghost, 항상 보임) + 판 위 조각 + 미리보기를 한 `CubeScene`으로 그린다.
  - 트레이·판 밖·끄는 조각은 조각마다 `<g transform>`으로 그린다. 끄는 조각이 맨 위고, 판 밖 조각끼리는 마지막에 끈 조각이 위다.
  - 판 밖 조각은 위치를 가운데 좌표로 기억한다. 톡·버튼으로 돌려도 그 자리에서 돈다. 돌린 뒤 빈 곳을 벗어나면 `looseSpot`으로 다시 맞춘다.
  - 버튼은 1탄 `ActionButton` 모양이다. 나무 블록 SVG이고 면 아래에 `--ink` 두께 블록을 깐다. `pointerdown`에 반응하고, 고른 조각이 없으면 눌리지 않는 모양이다. 높이는 `layout.buttonH`다.
  - 트레이·판 밖은 `TRAY_SCALE`로, 끄는 중은 1배로 그린다. 잡은 점은 손가락 아래에 둔다(`clientToSvg`로 누른 점을 SVG 좌표로 바꾼다).
  - 끄는 중 `landingNear`로 떨어질 자리를 구한다.
    - 놓을 수 있으면: 미리보기(kind 'preview')를 판에 그리고, 손에 든 그룹은 숨긴다.
    - 판에 걸쳤는데(`pointInPolygon(조각 화면 중심 − 판 원점, boardOutline)`) 놓을 수 없으면: 투명도 0.5
    - 판 밖이면: 보통 모습
  - 놓기
    - 자리 있음 → 판에 놓는다.
    - 판에 걸침 + 자리 없음 → 판 밖 마지막 자리, 없으면 트레이로 간다.
    - 판 밖 → `looseSpot`으로 그 자리에 둔다.
  - 톡 = `rotZ`다. 버튼은 마지막으로 만진 조각에 적용한다. 돌리기 = `rotZ`, 눕히기 = `rotateAbout(cells, tipAxis(cam))`이다. 쉬움은 눕히기 버튼이 없다.
  - 판 위 조각
    - `canLift`일 때만 들기·돌리기가 된다.
    - 돌리면 바닥 중심을 유지한 채 다시 `landing`한다.
    - 안 맞으면 판 밖 마지막 자리, 없으면 트레이로 간다.
  - 풀면 `onSolved()`를 한 번 부르고, "완성!"과 실루엣 `--ok`를 보인다.
  - `active`가 false면 입력을 무시한다. 끄는 중이었다면 놓을 때 원래 자리로 돌아간다.

- [ ] **Step 1: 실패 테스트** (`useElementSize`가 0을 주므로, 1탄 `PlayerArea.test.tsx`처럼 크기를 흉내 내거나 scale 1 기준으로 계산한다)
  - 렌더: `stack-piece`가 조각 수만큼 있고 모두 `data-state="tray"`다.
  - 쉬움에는 '눕히기' 버튼이 없고, 보통에는 있다.
  - 톡하면 `data-cells`가 `rotZ` 결과로 바뀐다.
  - 조각을 누른 뒤 '눕히기'를 누르면 `rotateAbout(·, tipAxis(makeCamera(30,50)))` 결과가 된다.
  - 끌기
    - 정답 자리로 끌어 놓으면 `data-state="board"`다.
    - 판에서 먼 빈 곳에 놓으면 `"loose"`다.
    - 판 위인데 놓을 수 없는 곳이면 `"tray"`로 돌아간다(처음 끌기라 판 밖 마지막 자리가 없음).
  - 쉬움 퍼즐을 정답대로 다 놓으면 `onSolved`가 1번 불린다.
  - **Review Focus 2** `끄는 중에 active가 false가 되면 놓지 않고 원래 자리로`
  - **Review Focus 3** `위에 얹힌 조각은 돌리기·들기가 안 된다`: 아래 조각을 톡하거나 버튼을 눌러도 `data-cells`가 그대로다.
  - **Review Focus 5** `판 위에서 돌려 안 맞으면 판 밖 마지막 자리로`
  - `registry.test.ts`: `findGame('stack')`이 있고, `menuGames(GAMES, '')`에는 없다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games` → FAIL
- [ ] **Step 3: 구현** — 위 동작대로 쓴다. 끄는 중 위치는 `transform`을 직접 바꾼다. React 상태는 떨어질 자리 key가 바뀔 때만 바꾼다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`
- [ ] **Step 5: 손으로 확인** — `npm run dev` → `http://localhost:5173/boardgame/?dev`. 쌓기 퍼즐 카드가 있어야 한다. 난이도 3종을 한 판씩 풀어 본다. `?dev` 없이는 카드가 없어야 한다.

**금지:**
- `getScreenCTM` 대신 `clientToSvg`를 써라. 이유: jsdom 테스트에서 동작하고 레이아웃 계산과 일치한다.
- 1탄 `PlayerArea`를 고치지 마라. 이유: 버튼 공용화는 필요할 때 따로 한다.

### Task 9: stack-motion — 판 돌리기·회전 애니메이션·가림·fps

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

---

## 칠판 확인 (사람이 하는 단계, 하네스 밖)
1. Phase 2-stack-puzzle이 끝나면 `feat-2-stack-puzzle`을 main에 합치고 push한다. 외부에 영향을 주는 작업이라 실행 직전에 사용자 확인을 받는다. 그러면 GitHub Actions가 Pages로 배포한다.
2. 칠판에서 `https://paurrr.github.io/boardgame/?dev`를 연다. 쌓기 퍼즐 4인 어려움으로 판 돌리기·회전·끌기를 해 보고, fps와 손 느낌을 기록한다. 4인 칸 크기, 쉬움 목표 알아보기, 판 밖에 두기도 본다.
3. 결과에 따라 Phase 3를 확정한다.

## Phase 3-stack-finish (칠판 확인 뒤 확정, 지금은 초안)
- **Task A: perf-tune** (필요할 때만)
  - 설계서 §5.4 대안 1(돌리는 동안 빈칸·테두리 생략), 대안 2(다각형 `points` 직접 갱신)를 적용한다.
  - 칠판 의견에 따라 상수를 조정한다(트레이 배율, 버튼 크기, 기울기 범위).
  - 대안 3 이상은 사용자 결정 뒤에만 한다.
- **Task B: release**
  - `stackGame.hidden`을 없앤다.
  - 메뉴 아이콘(`ui/MenuIcon.tsx`, 대표 조각 몇 개를 비스듬히 그린 SVG)을 만든다.
  - PRD·UI_GUIDE·ADR-008에 칠판 결과를 반영한다.
  - 2탄 설계서 상태를 "구현 완료"로 바꾼다.
  - 끝나면 `spike.local/`을 지운다(git 밖이라 수동).
