# Step 0: pairs-rules

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md, /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-memory-design.md
- /docs/superpowers/plans/2026-10-25-memory.md (전체 계획. 이 step은 Task 0)
- `/phases/4-memory/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/lib/random.ts
- /src/lib/difficulty.ts
- /src/games/bell/logic/game.ts (본보기: 순수 reducer)
- /src/games/bell/logic/level.ts

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 공통 제약 (모든 step)

- 칠판 Chrome 99. CSS nesting·container query·`:has()`·`oklch()/color-mix()` 금지. JS는 ES2022까지(`toSorted` 등 금지, 정렬은 `slice().sort()`). 폴리필 없음.
- 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM 의존 금지.
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits다(execute.py가 단계마다 커밋한다).
- 색은 `src/styles.css`의 `:root` 변수와 기존 상수만 쓴다. 그림 색은 `src/games/blocks/logic/pieces.ts`의 `PIECES[…].color`, 사람 색은 `src/shell/ui/colors.ts`의 `PLAYER_COLORS`. 새 16진수 색 금지. 그림자·글로우·그라데이션·필터 금지. 두께는 아래 테두리로 낸다. 애니메이션은 `transform`·`opacity`만.
- 공개 명칭은 "짝 맞추기", id는 `pairs`, 폴더는 `src/games/pairs/`. 원작 상표·그림을 쓰지 않는다. 그림에 이름 글자를 쓰지 않는다.
- 화면: 맨 위 `TopBar`, 그 아래 위쪽 1/3에 차례 표시, 아래쪽 2/3에 판. 판 아래 여백 1.5rem 이상. 칠판(1280×720) 어려움(6×8)에서 카드 한 변 56 CSS px 이상, 스크롤 없음.
- 터치는 Pointer Events. 카드는 탭(`src/lib/usePointerDrag.ts`의 `onTap`, 기준 `isTap` 300ms 미만·10px 미만)으로 뒤집는다. 멀티터치 판단에 `navigator.maxTouchPoints`를 쓰지 않는다.
- 숫자: 쉬움 4×4·3000ms, 보통 4×8·2000ms, 어려움 6×8·1000ms. 그림 24가지(`PICTURE_COUNT`). 뒤집기 애니메이션 `FLIP_MS` 250, 맞춘 두 장 보여 주기 `MATCH_SHOW_MS` 600, 배너 `BANNER_MS` 1000, 끝난 뒤 결과까지 `END_SHOW_MS` 1000. 틀린 두 장은 `FLIP_MS + showMs` 뒤에 엎는다. 인원 1~4명.

## 작업

**Files:**
- Create: `src/games/pairs/logic/types.ts`, `src/games/pairs/logic/level.ts`, `src/games/pairs/logic/game.ts`
- Test: `src/games/pairs/logic/level.test.ts`, `src/games/pairs/logic/game.test.ts`

**Interfaces:**
- Consumes: `createRng(seed)`(`src/lib/random.ts`: `shuffle`), `Difficulty`(`src/lib/difficulty.ts`)
- Produces (`types.ts`):
  ```ts
  /** takenBy: 이 카드를 가져간 사람. 판에 있으면 null */
  export type Slot = { picture: number; takenBy: number | null };
  export type PairsState = {
    playerCount: number;
    /** 줄 순서(row-major), 길이 rows×cols */
    slots: Slot[];
    /** 지금 앞면인(아직 안 가져간) 칸 번호, 뒤집은 순서. 0~2개 */
    open: number[];
    /** 두 장이 열려 CONTINUE를 기다리는 중. 그동안 FLIP은 무시 */
    pending: 'match' | 'miss' | null;
    turn: number;
    /** 사람별 가져간 짝 수 */
    pairs: number[];
    /** 두 장 뒤집기를 마친 횟수(모든 사람 합). 1인 기록 */
    tries: number;
  };
  export type PairsAction = { type: 'FLIP'; index: number } | { type: 'CONTINUE' };
  export type Standing = { player: number; pairs: number; place: number };
  ```
- Produces (`level.ts`): `type PairsLevel = { rows: number; cols: number; showMs: number }`, `PAIRS_LEVELS: Record<Difficulty, PairsLevel>`(Global Constraints 값), `PICTURE_COUNT = 24`, `cardCount(level: Difficulty): number`
- Produces (`game.ts`): `createPairsGame(playerCount: number, seed: number, level: Difficulty): PairsState`, `pairsReducer(state: PairsState, action: PairsAction): PairsState`, `isOver(state: PairsState): boolean`, `standings(state: PairsState): Standing[]`

규칙 (설계서 §4):
- `createPairsGame`: rng 하나로 `0..PICTURE_COUNT-1`을 섞어 앞에서 `cardCount/2`개를 고르고, 각각 두 장씩 만든 뒤 다시 섞는다. `turn` 0, `pairs` 모두 0, `tries` 0. 인원이 1~4가 아니면 `RangeError`.
- `FLIP(i)`: `pending`이 있거나, 끝났거나, i가 범위 밖이거나, 가져간 칸이거나, 이미 `open`에 있으면 **같은 객체**. `open`이 비면 `[i]`. 하나면 `[a, i]`, `tries + 1`, 그림이 같으면 `pending 'match'`, 다르면 `'miss'`.
- `CONTINUE`: `pending`이 null이면 같은 객체. `'match'`: 두 칸 `takenBy = turn`, `pairs[turn] + 1`, 차례 그대로(한 번 더). `'miss'`: 차례가 `(turn + 1) % playerCount`. 둘 다 `open = []`, `pending = null`.
- `isOver`: 모든 칸의 `takenBy`가 null이 아니다.
- `standings`: 짝 수 내림차순, 같으면 자리 순. `place` = 1 + 나보다 짝이 많은 사람 수.

- [ ] **Step 1: 실패 테스트** — 짝 위치는 테스트에서 `slots`를 훑어 찾는다(같은 `picture`의 두 칸).
  - `level.test.ts`: `cardCount`가 16·32·48이고 모두 짝수, `cardCount/2 ≤ PICTURE_COUNT`. `showMs` 3000·2000·1000.
  - `game.test.ts`
    - 세 난이도에서 칸 수가 `cardCount`, 그림마다 정확히 2장, 그림 번호는 0~23, 서로 다른 그림 수가 8·16·24.
    - 같은 seed면 `toEqual`, seed 1과 2는 배치가 다르다. `createPairsGame(0|5, 1, 'easy')`는 throw, 1명은 된다.
    - 첫 FLIP → `open [i]`. 같은 칸 다시 FLIP → 같은 객체.
    - 같은 그림 두 장 → `pending 'match'`, `tries 1`. CONTINUE → 두 칸 `takenBy 0`, `pairs [1, 0]`, `turn 0`.
    - 다른 그림 두 장 → `'miss'`. CONTINUE → `open []`, `turn 1`. 3명에서 2번 차례가 틀리면 0번으로.
    - 1명이 틀리면 CONTINUE 뒤에도 `turn 0`.
    - `두 장이 보이는 동안의 FLIP은 무시한다` (Review Focus 1): `pending`이 있을 때 셋째 칸 FLIP은 같은 객체.
    - 가져간 칸 FLIP, `pending` 없는 CONTINUE는 같은 객체.
    - 쉬움에서 짝을 모두 맞추면 `isOver` true, `tries 8`. 그 뒤 FLIP은 같은 객체.
    - `standings는 같은 짝 수를 공동 순위로 매긴다` (Review Focus 5): `pairs [3, 5, 3, 1]` → 순서 1·0·2·3, place 1·2·2·4. `pairs [4, 4, 0]` → place 1·1·3.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/pairs` → FAIL
- [ ] **Step 3: 구현** — 상태를 바꾸지 말고 새 객체를 만든다(reducer).
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 화면 문구와 화면 시간(`FLIP_MS` 등)을 logic에 넣지 마라. 이유: 표시는 ui의 몫이다. 난이도의 `showMs`는 규칙이라 logic에 둔다.

## Acceptance Criteria

```bash
npm run lint && npm run test && npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR(ADR-006 Chrome 99, ADR-009 own 게임)을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (순수 로직에 React/DOM import 없음, ES2023+ API 없음, 하드코딩 색·그림자·그라데이션 없음)
3. 결과에 따라 `phases/4-memory/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **250자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
