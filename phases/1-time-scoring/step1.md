# Step 1: time-config

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` (특히 step 0에서 추가된 ADR-007: 빠르기 보너스·판 전체 타임어택)
- `/docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (§3.5, §5.2)
- `/src/shell/logic/match.ts` — `MatchConfig`, `TIME_OPTIONS`
- `/src/shell/logic/setup.ts` — `SavedSetup`, `defaultSetup`, `finalizeSetup`, `toMatchConfig`
- `/src/shell/logic/persistence.ts` — `loadSetup` (저장값을 엄격하게 검사한다)
- 테스트: `/src/shell/logic/setup.test.ts`, `/src/shell/logic/persistence.test.ts`, `/src/shell/logic/match.test.ts`, `/src/shell/ui/Match.test.tsx`, `/src/shell/ui/PlayerSetup.test.tsx`
- `/src/shell/ui/PlayerSetup.tsx` (111번째 줄 근처 `finalizeSetup` 호출)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

시간 방식이 두 가지가 된다. "라운드마다"(기존: 라운드마다 60/90/120초)와 "판 전체"(새 타임어택: 모든 라운드를 합쳐 T초, T는 30~600초를 10초 단위로 고른다). 이 step은 **설정 값의 타입·기본값·저장만** 만든다. 판 시계 동작(reducer)과 화면은 이후 step에서 한다.

## 작업

TDD로 진행한다: 아래 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다.

### 1. `src/shell/logic/match.ts` (타입만)

```ts
/** round: 라운드마다 제한시간, game: 판 전체 제한시간(타임어택) */
export type TimeMode = 'round' | 'game';

export type MatchConfig = {
  gameId: string;
  players: PlayerConfig[];
  rounds: number;
  timeMode: TimeMode;
  /** 라운드마다 방식의 라운드 제한시간(초) — 뜻은 기존 그대로 */
  timeLimitSec: number;
  /** 판 전체 방식의 전체 제한시간(초) */
  gameTimeSec: number;
};
```

reducer·`remainingMs` 등 동작은 바꾸지 않는다.

### 2. `src/shell/logic/setup.ts`

```ts
export type SavedSetup = {
  players: PlayerConfig[]; rounds: number;
  timeMode: TimeMode; timeLimitSec: number; gameTimeSec: number;
};
export const GAME_TIME_MIN_SEC = 30;
export const GAME_TIME_MAX_SEC = 600;
export const GAME_TIME_STEP_SEC = 10;
export const DEFAULT_GAME_TIME_SEC = 300;

/** 10초 단위로 반올림하고 30~600으로 자른다. 숫자가 아니거나 유한하지 않으면 기본값 */
export function clampGameTime(sec: number): number;
/** 10초 늘리거나 줄인다 (범위 밖으로 나가지 않는다) */
export function stepGameTime(sec: number, dir: 1 | -1): number;
```

- `defaultSetup()`은 `timeMode: 'round'`, `gameTimeSec: DEFAULT_GAME_TIME_SEC`를 더한다(나머지 기본값은 그대로).
- `toMatchConfig`는 `timeMode`, `gameTimeSec`도 넘긴다.
- `finalizeSetup`은 지금처럼 `...setup`을 펼치므로 새 필드가 그대로 지나가야 한다(테스트로 확인).

### 3. `src/shell/logic/persistence.ts` — `loadSetup`

저장 키 `boardgame.setup.v1`은 그대로 쓴다. 이번 변경 전에 저장된 값에는 `timeMode`·`gameTimeSec`가 없다.

- `timeMode`: 없으면(`undefined`) `'round'`. 있는데 `'round' | 'game'`이 아니면 `null`.
- `gameTimeSec`: 없으면 `DEFAULT_GAME_TIME_SEC`. 있는데 `number`가 아니면 `null`. 숫자면 `clampGameTime`으로 정리.
- 나머지 검사(인원 1~4, `ROUND_OPTIONS`, `TIME_OPTIONS`)는 그대로.

### 4. 컴파일 맞추기

`npm run build`는 `tsc --noEmit`으로 테스트 파일까지 검사한다. `MatchConfig`·`SavedSetup` 리터럴을 만드는 곳에 새 필드를 넣어라.

- `src/shell/logic/match.test.ts`의 `config()` 팩토리 → `timeMode: 'round', gameTimeSec: 300`
- `src/shell/ui/Match.test.tsx`의 `config()` 팩토리 → 같은 값
- `src/shell/logic/setup.test.ts`의 `finalizeSetup(...)` 리터럴들
- `src/shell/ui/PlayerSetup.test.tsx` '고른 이름·난이도·라운드·시간으로 시작한다'의 기대 객체 → `timeMode: 'round', gameTimeSec: 300` 추가
- `src/shell/ui/PlayerSetup.tsx`: 111번째 줄 근처 호출을 `finalizeSetup({ ...initial, players, rounds, timeLimitSec })`로 바꾼다. **이 한 곳만** 고친다(시간 방식 UI는 step 4).

빠뜨린 곳은 `grep -rn "timeLimitSec" src`와 `npm run build`의 타입 에러로 찾는다.

### 5. 새 테스트 (최소)

`setup.test.ts`
- `defaultSetup()`은 `timeMode: 'round'`, `gameTimeSec: 300`.
- `clampGameTime`: 25→30, 47→50, 601→600, 9999→600, `NaN`→300, `Infinity`→300, 120→120.
- `stepGameTime`: 300,+1→310 / 300,-1→290 / 30,-1→30 / 600,+1→600.
- `toMatchConfig`가 `timeMode`·`gameTimeSec`를 넘긴다.

`persistence.test.ts`
- 새 필드가 없는 예전 저장값(`{ players, rounds: 5, timeLimitSec: 90 }`)을 불러오면 `timeMode: 'round'`, `gameTimeSec: 300`이 채워진다.
- `{ ...defaultSetup(), timeMode: 'game', gameTimeSec: 50 }`를 저장하고 불러오면 그대로 나온다.
- `timeMode: 'fast'`이면 `null`, `gameTimeSec: '50'`(문자열)이면 `null`.
- `gameTimeSec: 47`이면 50으로 정리돼 나온다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `src/shell/logic`에 React/DOM import가 없는가?
   - ES2023+ API(`toSorted`, `findLast` 등)를 쓰지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/1-time-scoring/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (새 타입·상수·함수 이름을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `matchReducer`, `remainingMs`, `finishRound`의 동작을 바꾸지 마라. 이유: 판 시계 동작은 step 2에서 테스트와 함께 바꾼다.
- 저장 키를 `boardgame.setup.v2`로 올리거나 예전 저장값을 거부하지 마라. 이유: 집 칠판에 저장된 마지막 설정을 잃는다.
- `TIME_OPTIONS`·`ROUND_OPTIONS` 값을 바꾸지 마라. 이유: 라운드마다 방식은 기존 그대로 유지한다.
- `PlayerSetup.tsx`에 버튼이나 상태를 추가하지 마라. 이유: 설정 화면 UI는 step 4에서 한다.
- 기존 테스트를 지우거나 `skip`하지 마라. 리터럴에 필드를 더하는 것만 허용한다.
