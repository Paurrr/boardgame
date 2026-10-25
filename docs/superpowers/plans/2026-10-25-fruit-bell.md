# 과일 종치기 구현 계획

> **For agentic workers:** 이 프로젝트는 Harness로 실행한다. 이 문서의 Task N은 그대로 `phases/3-fruit-bell/stepN.md`가 된다. 각 Task는 독립된 Claude 세션에서 실행되므로, 그 Task 안의 정보와 "읽어야 할 파일"만으로 작업할 수 있게 썼다. 실행 명령: `python -X utf8 scripts/execute.py 3-fruit-bell` (Windows 기본 인코딩 cp949 문제로 `-X utf8`). Steps use checkbox (`- [ ]`) syntax.

**Goal:** 3탄 "과일 종치기"를 숨긴 게임으로 추가한다. 칠판에서 `?dev` 주소로 열어 종 판정과 화면을 확인할 수 있는 상태까지 만든다.

**Architecture:**
- 규칙(덱·차례·종·벌칙·탈락)과 종 누르기 순서 판정은 `src/games/bell/logic`의 순수 함수로 만들고 Vitest로 TDD 한다.
- 셸에 "게임이 경기 화면 전체를 맡는" 종류(`kind: 'own'`)를 더한다. 이 게임은 셸의 라운드·시계·점수를 쓰지 않고, 메뉴·설정(인원·이름)·`PlayLayout`·`TopBar`만 빌린다.
- 화면은 칸마다 위에 펼친 카드(SVG), 아래에 뒤집기 버튼과 종이다.

**Tech Stack:** Vite 7 + React 19 + TypeScript(strict), SVG, CSS Modules, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-25-fruit-bell-design.md` (모든 Task가 먼저 읽는다)

## Global Constraints
- 칠판 Chrome 99. CSS nesting·container query·`:has()`·`oklch()/color-mix()` 금지. JS는 ES2022까지(`toSorted` 등 금지, 정렬은 `slice().sort()`). 폴리필 없음.
- 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM 의존 금지. `src/games/bell/ui/notice.ts`도 순수 TS로 쓴다.
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits다(execute.py가 단계마다 커밋한다).
- 색은 `src/styles.css`의 `:root` 변수만 쓴다. 과일 색은 1탄 `src/games/blocks/logic/pieces.ts`의 `PIECES`에서 가져온다: 딸기←`I3`(#D9442E), 바나나←`L3`(#F2B53A), 라임←`L5`(#8DBB2E), 블루베리←`U5`(#22507C), 잎·꼭지←`T4`(#2E9E55). 그림자·글로우·그라데이션·필터 금지. 두께는 아래 테두리로 낸다.
- 공개 명칭은 "과일 종치기", id는 `bell`이다. 원작 이름("할리갈리")·원작 그림은 화면 글자·파일·식별자에 쓰지 않는다.
- 플레이어 칸은 가로로 나란히 둔다. 조작 요소(뒤집기·종)는 칸의 아래쪽 2/3에만 둔다. 누르는 요소는 56 CSS px 이상, 주요 버튼은 72 CSS px 이상. 칸 아래 여백 1.5rem 이상. 칠판(1280×720) 4명에서 스크롤 없이 들어가야 한다.
- 터치는 Pointer Events. 칸 안 버튼은 `pointerdown`에 반응한다. 멀티터치 판단에 `navigator.maxTouchPoints`를 쓰지 않는다.
- 숫자: 카드 56장 = 과일 4가지 × (1개 5장, 2개 3장, 3개 3장, 4개 2장, 5개 1장). 인원 2~4명. 톡 기준은 `src/lib/gesture.ts`의 `isTap`(300ms 미만·10px 미만). 결과 표시 1500ms, 끝난 뒤 결과 화면까지 1500ms.

## Review Focus
1. **손바닥을 종에 짚은 채로 다른 사람이 톡**: 손바닥은 300ms가 지나면 판정에서 빠지고, 다른 사람의 톡이 이긴다. 손바닥 주인은 벌칙을 받지 않는다. → Task 2 테스트 `계속 누르는 손바닥은 300ms 뒤 빠지고 다른 사람의 톡이 이긴다`
2. **판정이 난 뒤 늦게 뗀 손가락, 결과 표시 중에 친 종**: 둘 다 무시한다. 두 번째 판정이나 벌칙이 생기면 안 된다. → Task 6 테스트 `판정 뒤 늦게 뗀 손가락과 결과 표시 중의 종은 무시한다`
3. **탈락한 사람**: 그 사람의 펼친 카드는 다음 맞는 종까지 5 합에 들어가고, 그 사람의 뒤집기·종은 무시한다. → Task 1 테스트 `탈락한 사람의 펼친 카드도 합에 들어가고 그 사람의 입력은 무시한다`
4. **설정을 오가도 다른 게임 설정이 그대로**: 과일 종치기에서 시작해도 저장된 라운드·시간 값은 바뀌지 않는다. 저장된 인원이 1명이면 2명으로 맞춘다. → Task 3 테스트 `own 게임은 라운드·시간을 건드리지 않고 넘기고 최소 인원으로 맞춘다`
5. **판정 대기·결과 표시 중에 그만하기**: 남은 타이머가 나간 뒤에 상태를 바꾸거나 에러를 내면 안 된다. → Task 6 테스트 `판정 대기·결과 표시 중에 나가도 에러가 없다`

---

## Phase 3-fruit-bell (칠판 확인 전)

### Task 0: docs-rules — 규칙 문서

**Files:**
- Modify: `docs/ADR.md` (ADR-009 추가), `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/UI_GUIDE.md`

**Interfaces:** 없음. 이후 Task는 이 문서들을 지침으로 받는다. execute.py가 CLAUDE.md와 docs/*.md를 매 단계 프롬프트에 넣는다.

- [ ] **Step 1: ADR-009를 쓴다** — 기존 형식(결정/이유/트레이드오프). 설계서 §2·§4·§5.1·§6의 결정을 담는다.
  - 원작 규칙 그대로(맞게 친 사람이 다음에 뒤집음, 엎은 더미가 비면 즉시 탈락, 마지막 한 명까지), 핸디캡 없음
  - 종은 칸마다 하나
  - 종 판정: 톡(`isTap`)만 인정, 닿은 시각(`pointerdown`의 `timeStamp`) 순서, 더 이른 누름이 남아 있으면 기다림, 기다리는 동안 뒤집기 막음, 첫 톡 하나만 판정·늦은 사람 벌칙 없음
  - 셸 확장: `GameModule`을 `PuzzleGame | OwnMatchGame` 합집합으로 바꾸고, own 게임은 설정에서 인원·이름만 고른다
  - 과일 색은 1탄 조각 색에서 빌림, 칠판 확인 전 `hidden`
  - 트레이드오프: 톡 인정이라 종소리가 손을 뗄 때 난다. 같은 프레임 안 터치는 구별 못 함.
- [ ] **Step 2: 나머지 문서를 고친다**
  - ARCHITECTURE: 트리에 `src/games/bell/`(logic: `types.ts`·`cards.ts`·`game.ts`·`press.ts`, ui: `FruitIcon.tsx`·`FruitCard.tsx`·`MenuIcon.tsx`·`notice.ts`·`Lane.tsx`·`BellMatch.tsx`·`BellResult.tsx`)를 넣는다. "셸 + 게임 모듈" 절의 계약을 합집합으로 고치고(퍼즐 게임은 `PlayerArea`, own 게임은 `Match`), 데이터 흐름에 own 게임 줄(`PlayerSetup → App → game.Match(playerNames, seed)`)을 더한다. TopBar 설명을 "라운드·시간(있을 때)·소리·전체화면·그만하기"로.
  - PRD: 핵심 기능에 7번 "3탄 과일 종치기"(2~4인, 원작 규칙, 칸마다 종, 설계·계획·ADR-009 링크)를 더한다. MVP 제외의 "블록 퍼즐 외 다른 게임 (구조만 대비)"를 지운다.
  - UI_GUIDE: "과일 종치기 (3탄, ADR-009)" 절을 추가한다.
    - 과일 색 표(Global Constraints의 다섯 줄)
    - 카드: 크림(`--panel`) 면, `--ink` 굵은 테두리, 과일 1~5개를 주사위 눈처럼. 빈 자리는 `--off-edge` 점선
    - 뒤집기 버튼: 차례면 `--accent`, 아니면 `--off`/`--off-edge`. 종: `--pressed` 면 + `--ink` 테두리 + 아래 두께, 라벨 "종"
    - 결과 글자: 맞음 `--ok`, 틀림 `--warn`
    - 애니메이션 예외: 새 카드 등장 180ms(scale 0.85→1 + opacity), 카드를 가져간 사람의 장수 300ms 확대·축소. `transform`·`opacity`만
- [ ] **Step 3: 검증** — `npm run lint && npm run test && npm run build` 통과.

**금지:**
- 코드를 바꾸지 마라. 이유: 이 단계는 이후 단계의 지침 문서만 맞춘다.
- 네 문서에 더하는 글은 모두 합쳐 2,500자를 넘기지 마라(설계서를 옮겨 적지 말고 링크하라). 이유: CLAUDE.md와 docs/*.md 전체가 매 step 프롬프트에 들어가는데, Windows 명령줄 제한이 약 32k자이고 지금 이미 약 19k자다.

### Task 1: bell-rules — 카드·차례·종·탈락 규칙 (순수)

**Files:**
- Create: `src/games/bell/logic/types.ts`, `src/games/bell/logic/cards.ts`, `src/games/bell/logic/game.ts`
- Test: `src/games/bell/logic/cards.test.ts`, `src/games/bell/logic/game.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Fruit = 'strawberry' | 'banana' | 'lime' | 'blueberry';
  export type FruitCount = 1 | 2 | 3 | 4 | 5;
  export type Card = { fruit: Fruit; count: FruitCount };
  /** down[0]이 다음에 뒤집을 카드, up의 마지막이 보이는 카드 */
  export type Pile = { down: Card[]; up: Card[] };
  export type RingResult =
    | { kind: 'correct'; player: number; gained: number }
    | { kind: 'wrong'; player: number; paidTo: number[] };
  export type BellState = {
    piles: Pile[];
    turn: number;
    /** 탈락한 순서 */
    outOrder: number[];
    /** 마지막 한 명. 끝나기 전에는 null */
    winner: number | null;
    /** 결과를 보여 주는 동안 null이 아니고, 그동안 FLIP·RING을 무시한다 */
    lastRing: RingResult | null;
  };
  export type BellAction = { type: 'FLIP'; player: number } | { type: 'RING'; player: number } | { type: 'CONTINUE' };
  ```
- Produces (`cards.ts`): `FRUITS: readonly Fruit[]`(위 순서), `COPIES: Record<FruitCount, number>` = `{1: 5, 2: 3, 3: 3, 4: 2, 5: 1}`, `makeDeck(): Card[]`, `deal(cards: readonly Card[], playerCount: number): Card[][]`, `fruitTotals(tops: readonly (Card | null)[]): Record<Fruit, number>`, `hasFive(tops: readonly (Card | null)[]): boolean`
- Produces (`game.ts`): `createBellGame(playerCount: number, seed: number): BellState`, `topCards(state: BellState): (Card | null)[]`, `isOut(state: BellState, player: number): boolean`, `bellReducer(state: BellState, action: BellAction): BellState`, `ranking(state: BellState): number[]`
- Consumes: `createRng(seed).shuffle`(`src/lib/random.ts`)

규칙 (설계서 §4):
- `deal`: i번째 카드는 `i % playerCount`번 플레이어에게 간다. 받은 순서가 그대로 `down` 순서다(3명이면 19·19·18장).
- `createBellGame`: `deal(createRng(seed).shuffle(makeDeck()), n)`, `up`은 빈 배열, `turn` 0. n이 2~4가 아니면 `RangeError`.
- `FLIP(p)`: `lastRing`·`winner`가 null이고 `p === turn`일 때만. `down[0]`을 `up` 끝으로 옮긴다. `down`이 비면 p는 즉시 탈락(`outOrder`에 추가). `turn`은 p 다음 자리부터 돌며 탈락하지 않은 첫 사람.
- `RING(p)`: `lastRing`·`winner`가 null이고 p가 탈락하지 않았을 때만.
  - `hasFive(topCards)`면 맞음: 모든 자리(0번부터, 탈락자 포함)의 `up`을 순서대로 이어 p의 `down` 끝에 붙이고 `up`을 모두 비운다. `turn = p`. `lastRing = { kind: 'correct', player: p, gained }`.
  - 아니면 틀림: p+1번 자리부터 돌며 탈락하지 않은 다른 사람마다 p의 `down[0]`을 그 사람 `down` 끝으로 준다(p의 카드가 떨어지면 멈춤). 받은 사람을 `paidTo`에 순서대로. p의 `down`이 비면 즉시 탈락하고, 그때 `turn === p`였으면 다음 사람으로 넘긴다.
- 탈락하지 않은 사람이 한 명이 되면 `winner`를 그 사람으로 한다.
- `CONTINUE`: `lastRing = null`. 그 밖의 무시되는 동작은 **같은 객체**를 돌려준다(`toBe`로 검사).
- `ranking`: `winner`(있으면) → 아직 남은 사람(자리 순) → `outOrder`를 거꾸로.

- [ ] **Step 1: 실패 테스트** — 상태는 테스트 안에서 `BellState` 객체를 직접 만들어 쓴다.
  - `cards.test.ts`
    - `makeDeck()`은 56장, 과일마다 14장, 과일마다 개수별 장수가 `COPIES`와 같고 과일 수 합은 33이다.
    - `deal(makeDeck(), 2|3|4)`의 장수는 `[28, 28]`·`[19, 19, 18]`·`[14, 14, 14, 14]`이고 모두 합치면 원래 카드와 같다.
    - `hasFive`: `[바나나2, 바나나3, null]` true, `[바나나2, 바나나4]` false(6), `[라임5]` true, `[라임2, 딸기3]` false, `[]` false.
  - `game.test.ts`
    - `createBellGame(3, 42)`: `down` 장수 `[19, 19, 18]`, `turn` 0, 같은 시드면 `toEqual`. `createBellGame(1, 1)`·`(5, 1)`은 throw.
    - 차례 아닌 사람의 FLIP은 같은 객체. FLIP하면 그 사람 `down`이 1장 줄고 `up` 끝이 이전 `down[0]`, `turn`이 다음 사람.
    - `turn`은 탈락자를 건너뛴다.
    - 맞는 RING: 펼친 카드 수만큼 `gained`, 모든 `up`이 비고 친 사람 `down` 끝에 붙고, `turn`이 친 사람.
    - 틀린 RING(3명, 1번이 침): 1번 `down` −2, 2번·0번 끝에 한 장씩, `paidTo` `[2, 0]`.
    - 카드가 1장인 사람이 3명 앞에서 틀리면 한 명에게만 주고 즉시 탈락한다.
    - 마지막 카드를 뒤집으면 즉시 탈락하고, 그 카드는 `topCards`에 남는다.
    - `탈락한 사람의 펼친 카드도 합에 들어가고 그 사람의 입력은 무시한다` (Review Focus 3): 탈락자 카드 바나나2 + 남은 사람 바나나3이면 맞는 RING이 되고 탈락자 `up`도 가져간다. 탈락자의 RING·FLIP은 같은 객체.
    - `lastRing`이 있으면 FLIP·RING은 같은 객체, CONTINUE 뒤에는 다시 된다.
    - 2명에서 한 명이 마지막 카드를 뒤집으면 `winner`가 다른 사람. `winner`가 있으면 FLIP·RING은 같은 객체.
    - `ranking`: `outOrder [2, 0]`, `winner 1` → `[1, 0, 2]`.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/bell` → FAIL
- [ ] **Step 3: 구현** — 위 규칙대로. 상태는 바꾸지 말고 새 객체를 만든다(reducer).
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 화면 문구·시간(1500ms 등)을 logic에 넣지 마라. 이유: 표시는 ui의 몫이고 logic은 규칙만 다룬다.

### Task 2: bell-press — 종 누르기 순서 판정 (순수)

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

### Task 3: shell-own-match — 경기 화면 전체를 맡는 게임

**Files:**
- Modify: `src/games/types.ts`, `src/App.tsx`, `src/shell/ui/PlayerSetup.tsx`, `src/shell/ui/TopBar.tsx`, `src/shell/ui/Match.tsx`(prop 타입만), `src/shell/ui/Match.test.tsx`(stub 타입 표기만)
- Test: `src/shell/ui/PlayerSetup.test.tsx`, `src/shell/ui/TopBar.test.tsx`(새로), `src/AppOwnMatch.test.tsx`(새로)

**Interfaces:**
- Produces (`src/games/types.ts`):
  ```ts
  type GameInfo = { id: string; name: string; description: string; minPlayers: number; maxPlayers: number; Icon?: ComponentType; hidden?: boolean };
  export type PuzzleGame = GameInfo & { kind?: 'puzzle'; PlayerArea: ComponentType<PlayerAreaProps>; timeOptions?: readonly number[]; defaultTimeSec?: number };
  export type OwnMatchProps = { playerNames: readonly string[]; seed: number; onExit: () => void; onReplay: () => void };
  export type OwnMatchGame = GameInfo & { kind: 'own'; Match: ComponentType<OwnMatchProps> };
  export type GameModule = PuzzleGame | OwnMatchGame;
  ```
  `PlayerAreaProps`는 그대로. 블록·쌓기 퍼즐 모듈은 `kind`가 없어도 `PuzzleGame`이라 고치지 않는다.
- `TopBar`: `round?`, `rounds?`, `clock?`, `urgent?`로 바꾼다. 라운드 글자는 `round`·`rounds`가 둘 다 있을 때만, 시계는 `clock`이 있을 때만 그린다. 기존 `Match`는 지금처럼 다 넘긴다.
- `Match`의 `game` prop 타입은 `PuzzleGame`.
- `App`: `screen.game.kind === 'own'`이면 `<screen.game.Match key={seed} playerNames={config.players의 name} seed onExit onReplay />`, 아니면 기존 `Match`. 저장(`saveSetup`)은 지금처럼 한다.
- `PlayerSetup`: own 게임이면 플레이어 줄의 난이도 버튼과 라운드·시간 줄을 그리지 않는다. 인원·이름·← 메뉴·시작!은 그대로. 시작하면 라운드·시간 방식·제한시간·판 전체 시간을 `initial` 값 그대로 넘긴다(제한시간도 `fitTimeLimit`로 맞추지 않는다).
- 주의: `TimeRules`를 받는 함수(`fitTimeLimit`·`timeOptionsOf`·`defaultSetup`)에는 puzzle 게임만 넘긴다. 모든 속성이 선택인 타입이라 own 게임을 넘기면 tsc가 "공통 속성 없음" 에러를 낸다.

- [ ] **Step 1: 실패 테스트**
  - `PlayerSetup.test.tsx`: `{ kind: 'own', minPlayers: 2, maxPlayers: 4, Match: () => null, … }` 가짜 게임으로
    - '보통' 버튼과 '라운드' 그룹이 없다.
    - `own 게임은 라운드·시간을 건드리지 않고 넘기고 최소 인원으로 맞춘다` (Review Focus 4): `initial`이 1명·라운드 9·판 전체·`timeLimitSec` 150·`gameTimeSec` 200이면 이름 칸이 2개이고, 시작! 때 `onStart` 값의 라운드·시간 네 값이 initial과 같다.
  - `TopBar.test.tsx`: `round`·`clock` 없이 그리면 '라운드' 글자와 `clock` testid가 없고 '소리 끄기'·'그만하기'는 있다. 넘기면 `라운드 2/5`와 시계가 있다.
  - `AppOwnMatch.test.tsx`: `vi.mock('./games/registry', …)`로 `GAMES`에 '시험 경기' own 가짜 게임을 더한다(`vi.hoisted` 사용). 가짜 `Match`는 `playerNames.join(',')`를 적은 `own-match` testid와 '나가기'(onExit)·'또'(onReplay) 버튼을 그린다.
    - 메뉴 → '시험 경기' → 시작! → `own-match`에 '플레이어 1,플레이어 2'
    - '또' → 다시 마운트돼도 `own-match`가 있다. '나가기' → 메뉴 제목 '우리집 보드게임'.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/shell src/AppOwnMatch.test.tsx` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build` (기존 App·Match·PlayerSetup 테스트도 그대로 통과)

**금지:**
- 저장 형식(`SavedSetup`, 키 `boardgame.setup.v1`)을 바꾸지 마라. 이유: 기존 설정을 잃고 다른 게임 설정이 섞인다.
- 블록·쌓기 퍼즐 모듈 파일을 고치지 마라. 이유: `kind`가 없어도 퍼즐 게임으로 읽힌다.

### Task 4: bell-cards — 과일·카드·메뉴 그림

**Files:**
- Create: `src/games/bell/ui/FruitIcon.tsx`, `src/games/bell/ui/FruitCard.tsx`, `src/games/bell/ui/FruitCard.module.css`, `src/games/bell/ui/MenuIcon.tsx`
- Test: `src/games/bell/ui/FruitCard.test.tsx`, `src/games/bell/ui/MenuIcon.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Fruit`, `FruitCount`(Task 1), `PIECES`(`src/games/blocks/logic/pieces.ts`)
- Produces:
  - `FRUIT_COLOR: Record<Fruit, string>` — `PIECES`에서 가져온다(Global Constraints). `LEAF_COLOR = PIECES.T4.color`.
  - `FruitIcon({ fruit, x, y, size }: { fruit: Fruit; x: number; y: number; size: number })` — 가운데가 (x, y)인 `<g data-testid="fruit" data-fruit={fruit}>`. 모양은 빌더 몫이되 멀리서 구별되게: 딸기(아래가 뾰족, 위 초록 꼭지, 크림 씨), 바나나(초승달), 라임(원 + 안쪽 단면 테두리), 블루베리(원 + 위 작은 꽃받침). `--ink` 테두리.
  - `CARD_W = 100`, `CARD_H = 140`, `ICON_SIZE = 32`
  - `PIP_LAYOUT: Record<FruitCount, { x: number; y: number }[]>` = 1 `[(50,70)]`, 2 `[(30,40),(70,100)]`, 3 `[(28,36),(50,70),(72,104)]`, 4 `[(30,40),(70,40),(30,100),(70,100)]`, 5 `[(30,36),(70,36),(50,70),(30,104),(70,104)]`
  - `FruitCard({ card }: { card: Card | null })` — `<svg viewBox="0 0 100 140" data-testid="fruit-card">`. 크림 면·`--ink` 테두리 카드 위에 `PIP_LAYOUT[count]` 자리마다 `FruitIcon`. `null`이면 `--off-edge` 점선 빈 자리(`data-testid="empty-card"`). 크기는 부모를 채운다(`width/height 100%`, 비율 유지).
  - `MenuIcon()` — 바나나 2 카드와 바나나 3 카드를 살짝 겹쳐 놓은 그림(합이 5). `aria-hidden`.

- [ ] **Step 1: 실패 테스트**
  - 과일 4가지 × 개수 1~5마다 `fruit`이 개수만큼, 모두 `data-fruit`가 그 과일.
  - `null`이면 `empty-card`가 있고 `fruit`은 0개.
  - `PIP_LAYOUT`: 개수마다 점 수가 개수와 같고, 모든 점이 카드 안쪽 여백 6 이상(`ICON_SIZE/2 + 6 ≤ x ≤ CARD_W − ICON_SIZE/2 − 6`, y도 같게), 같은 카드의 두 점 거리는 `ICON_SIZE` 이상.
  - `FRUIT_COLOR.strawberry === PIECES.I3.color` 등 네 가지.
  - `MenuIcon`은 `fruit` 5개를 그린다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/bell/ui` → FAIL
- [ ] **Step 3: 구현** — CSS 색은 클래스로(`fill: var(--panel)` 등). 과일 색만 `fill` 속성에 `FRUIT_COLOR` 값을 쓴다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 새 16진수 색을 쓰지 마라. 이유: CLAUDE.md 색 규칙. 과일·잎 색은 `PIECES`에서, 나머지는 `:root` 변수로.

### Task 5: bell-lane — 플레이어 칸 하나

**Files:**
- Create: `src/games/bell/ui/notice.ts`, `src/games/bell/ui/Lane.tsx`, `src/games/bell/ui/Lane.module.css`
- Test: `src/games/bell/ui/notice.test.ts`, `src/games/bell/ui/Lane.test.tsx`

**Interfaces:**
- Consumes: `Card`, `RingResult`(Task 1), `FruitCard`(Task 4)
- Produces:
  ```ts
  // notice.ts (순수)
  export type Notice = { text: string; tone: 'ok' | 'warn' | 'plain' };
  export function noticeFor(ring: RingResult, player: number, names: readonly string[]): Notice | null;
  // Lane.tsx
  export type LaneProps = {
    name: string; color: string; top: Card | null; downCount: number;
    isTurn: boolean; canFlip: boolean; out: boolean; notice: Notice | null; gained: boolean;
    onFlip: (e: React.PointerEvent) => void;
    onBellDown: (e: React.PointerEvent) => void; onBellUp: (e: React.PointerEvent) => void; onBellCancel: (e: React.PointerEvent) => void;
  };
  export function LaneHead(props: LaneProps);  // PlayLayout의 header
  export function LaneBody(props: LaneProps);  // PlayLayout의 body
  ```
- `noticeFor` 문구(정확히):
  - 맞음, 친 사람 칸: `` `${이름} 먼저! +${gained}장` `` tone `ok` / 다른 칸: `` `${이름} 먼저!` `` tone `plain`
  - 틀림, 친 사람 칸: `` `${이름} 틀렸어요 −${paidTo.length}장` ``(U+2212) tone `warn` / `paidTo`에 든 칸: `'+1장'` tone `plain` / 그 밖: `null`
- `LaneHead`: 색 블록 + 이름 줄, 상태 글자(탈락이면 '탈락', 차례면 '차례!'), 그 아래 `FruitCard card={top}`가 남은 높이를 채운다. 새 카드는 등장 애니메이션(180ms, 키는 빌더 몫).
- `LaneBody`: 위에서부터 알림 줄(`notice`, 없으면 같은 높이 빈 줄 — 칸이 흔들리지 않게), 뒤집기 버튼, 종. 아래 여백 1.5rem 이상.
  - 뒤집기: `<button>` 이름에 '뒤집기'와 `` `${downCount}장` ``. `canFlip`이면 `--accent` 면, 아니면 `--off` 면·`aria-disabled="true"`. `pointerdown`에서 `canFlip`일 때만 `onFlip(e)`. `gained`면 장수가 300ms 확대·축소. 높이 72px 이상.
  - 종: `<button aria-label="종">` 안에 종 SVG(`--pressed` 면, `--ink` 테두리)와 글자 '종'. `pointerdown`/`pointerup`/`pointercancel`을 각각 넘긴다. `out`이면 `disabled`이고 아무것도 넘기지 않는다. 지름 120px 이상.

- [ ] **Step 1: 실패 테스트**
  - `noticeFor`: 위 다섯 경우 문구·tone 그대로.
  - `Lane`: `canFlip`이면 뒤집기 `pointerdown` → `onFlip` 1번, 아니면 `aria-disabled="true"`이고 안 부른다. 뒤집기 이름에 '14장'.
  - 종 `pointerdown`·`pointerup`·`pointercancel` → 각 콜백 1번. `out`이면 종이 `disabled`, 콜백 0번, 머리에 '탈락'.
  - `top`이 있으면 머리에 `fruit-card`, `null`이면 `empty-card`. `isTurn`이면 '차례!'.
  - `notice` tone `ok`/`warn`이면 각각 다른 클래스.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/bell/ui` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** Lane에 규칙 판단(누가 차례인지, 5인지)을 넣지 마라. 이유: Lane은 받은 값을 그리기만 하고, 판단은 logic과 BellMatch가 한다.

### Task 6: bell-match — 경기 화면·결과·등록

**Files:**
- Create: `src/games/bell/ui/BellMatch.tsx`, `src/games/bell/ui/BellMatch.module.css`, `src/games/bell/ui/BellResult.tsx`, `src/games/bell/index.ts`
- Modify: `src/lib/sound.ts`, `src/games/registry.ts`
- Test: `src/games/bell/ui/BellMatch.test.tsx`, `src/games/bell/ui/BellResult.test.tsx`, `src/lib/sound.test.ts`, `src/games/registry.test.ts`

**Interfaces:**
- Consumes: Task 1(`createBellGame`·`bellReducer`·`topCards`·`isOut`·`ranking`), Task 2(`pressDown`·`pressUp`·`decide`·`isWaiting`), Task 3(`OwnMatchProps`·`OwnMatchGame`·`TopBar`), Task 4(`MenuIcon`), Task 5(`LaneHead`·`LaneBody`·`noticeFor`), `PlayLayout`·`PLAYER_COLORS`, `isMuted`·`setMuted`·`sounds`
- Produces:
  - `sounds.ding()` = `tone(1568, 0, 0.6)` + `tone(2093, 0, 0.35, 'sine', 0.08)`, `sounds.buzz()` = `tone(147, 0, 0.45, 'square', 0.12)`
  - `RING_SHOW_MS = 1500`, `END_SHOW_MS = 1500` (BellMatch.tsx export)
  - `BellMatch(props: OwnMatchProps)`
  - `BellResult({ playerNames, ranking, onReplay, onExit })` — 제목 `` `${1등 이름} 우승!` ``, `ranking` 순서로 `n등 이름`(왼쪽 테두리 플레이어 색), 1등 줄에 '우승', 버튼 '메뉴로'·'다시 하기'. 스타일은 `src/shell/ui/FinalResult.module.css`를 import해 같은 모양으로.
  - `bellGame: OwnMatchGame` = `{ kind: 'own', id: 'bell', name: '과일 종치기', description: '같은 과일이 딱 5개면 종을 쳐요', minPlayers: 2, maxPlayers: 4, Match: BellMatch, Icon: MenuIcon, hidden: true }`. `GAMES = [blocksGame, stackGame, bellGame]`.

BellMatch 동작:
- 상태는 `useReducer(bellReducer, …, () => createBellGame(playerNames.length, seed))`. 누름 목록(`Press[]`)·누른 점·타이머는 `useRef`(React 상태로 올리지 않는다).
- 위에 `TopBar`(라운드·시계 없이, 소리 켜기/끄기는 `Match`와 같게, 그만하기 → `onExit`). 아래 `PlayLayout` 칸마다 `LaneHead`/`LaneBody`. `canFlip = turn === i && lastRing === null && winner === null`. `notice = lastRing ? noticeFor(lastRing, i, playerNames) : null`. `gained = lastRing?.kind === 'correct' && lastRing.player === i`.
- 종 `pointerdown`: 결과 표시 중·끝남·탈락이면 무시. `setPointerCapture`(있을 때만, try/catch), 누른 점 기억, `pressDown(book, e.pointerId, i, e.timeStamp)`, `setTimeout(TAP_MAX_DURATION_MS)` 뒤 `settle(downAt + TAP_MAX_DURATION_MS)`.
- 종 `pointerup`: `pressUp(book, id, e.timeStamp, 누른 점과의 거리)` 뒤 `settle(e.timeStamp)`. `pointercancel`은 거리 `Infinity`로 같은 처리.
- `settle(now)`: `decide` → `ring`이면 누름 목록을 비우고 `RING` dispatch, `none`이면 비우고, `wait`이면 그대로.
- 뒤집기: `isWaiting(book, e.timeStamp)`면 무시, 아니면 `FLIP`.
- `lastRing`이 새로 생기면 맞음 `sounds.ding()`, 틀림 `sounds.buzz()`, `RING_SHOW_MS` 뒤 `CONTINUE`.
- `winner`가 정해지면 `END_SHOW_MS` 뒤 `BellResult`를 그린다(`ranking(state)`).
- 언마운트 때 타이머를 모두 지운다.

- [ ] **Step 1: 실패 테스트** — `vi.useFakeTimers()`. 칸은 `getAllByTestId('player-column')[i]` 안에서 찾는다. 톡은 같은 `pointerId`·좌표로 `pointerDown` 뒤 `pointerUp`.
  - 3명이면 칸 3개, 처음에는 0번 칸 뒤집기만 `aria-disabled`가 아니다. 0번이 뒤집으면 0번 머리에 `fruit-card`, 차례가 1번으로.
  - 맞는 종: 같은 seed로 `createBellGame`·`bellReducer`를 테스트 안에서 따로 돌려 5가 될 때까지 차례대로 뒤집는다(50번 안에 5가 되는 seed를 골라 단언). 2번 칸 톡 → 2번 칸에 `` `${이름} 먼저! +N장` ``(N = 그때 펼친 카드 수), 1500ms 뒤 알림이 사라진다.
  - 틀린 종: 시작하자마자 1번 칸 톡 → 1번 칸 알림에 '틀렸어요 −2장', 0번·2번 칸 알림 '+1장', 뒤집기 장수 20·17·19장(처음 19·19·18).
  - 길게 누름: `pointerDown` → 300ms 진행 → `pointerUp` → 알림 없음.
  - 종을 누르고 있는 동안(뗀 적 없음, 300ms 전) 차례인 칸의 뒤집기는 무시된다.
  - `판정 뒤 늦게 뗀 손가락과 결과 표시 중의 종은 무시한다` (Review Focus 2): 0번 down, 1번 down, 0번 up → 판정. 그 뒤 1번 up, 2번 톡 → 알림은 처음 판정 그대로이고 장수도 그대로.
  - 끝까지: `playerNames ['민준', '서연']`에서 0번이 틀린 종을 28번 친다(매번 1500ms 진행, 펼친 카드가 없으니 늘 틀림) → 0번 탈락 → 1500ms 뒤 '서연 우승!'.
  - `판정 대기·결과 표시 중에 나가도 에러가 없다` (Review Focus 5): 종 down 상태와 결과 표시 상태에서 각각 그만하기를 두 번 눌러 `onExit` 1번, 언마운트 뒤 타이머를 다 돌려도 에러·경고 없음.
  - `BellResult`: `ranking [1, 0, 2]` → 제목 '서연 우승!', 줄 순서 1등 서연·2등 민준·3등 아빠, 버튼 두 개가 콜백을 부른다.
  - `sound.test.ts`: 가짜 AudioContext에서 `ding`은 오실레이터 2개, `buzz`는 1개. AudioContext가 없어도 에러 없음.
  - `registry.test.ts`: `findGame('bell')`이 `kind 'own'`·`hidden true`·2~4명. `menuGames(GAMES, '')`에 없고 `'?dev'`면 있다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games src/lib/sound.test.ts` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`
- [ ] **Step 5: 손 확인(가능하면)** — `npm run dev` 뒤 `?dev`로 2·3·4명 한 판씩. 브라우저가 없는 자동 세션이면 summary에 "손 확인 보류"라고 적는다.

**금지:**
- 종 판정 순서에 이벤트 처리 시각(`Date.now()`·`performance.now()`)을 쓰지 마라. 이유: 판정은 `e.timeStamp`로만 한다(설계서 §5.1). 300ms 타이머에서는 `downAt + TAP_MAX_DURATION_MS`를 넘긴다.
- `hidden`을 빼지 마라. 이유: 칠판 확인 뒤 사람이 공개한다.

## 칠판 확인 (사람이 하는 단계, 하네스 밖)
- `?dev`로 열어 2·3·4명. 1280×720 4명에서 스크롤 없음, 카드 과일 개수가 1~3m에서 읽힘, 종소리.
- 손바닥을 종에 짚고 있으면 무시되는지, 두 사람이 거의 동시에 쳤을 때 "○○ 먼저!"가 납득되는지, 톡 인정(손 뗄 때 소리)이 늦게 느껴지지 않는지.
- 문제 없으면 `hidden`을 빼고 메뉴에 공개한다(쌓기 퍼즐 `c3eabde`처럼 한 커밋). 문제가 있으면 내용을 적어 다음 단계로 정한다.
