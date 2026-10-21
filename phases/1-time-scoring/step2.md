# Step 2: match-clock

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (상태 관리 절)
- `/docs/ADR.md` (ADR-007)
- `/docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (§3.5)
- `/src/shell/logic/match.ts` — step 1에서 `TimeMode`, `MatchConfig.timeMode`, `MatchConfig.gameTimeSec`가 추가됐다
- `/src/shell/logic/match.test.ts` — 테스트 스타일(팩토리 `config()`, `playing()`, 무시된 액션은 `toBe(s)`로 같은 객체 확인)
- `/src/shell/ui/Match.tsx` — 이 reducer를 어떻게 쓰는지(250ms마다 `now` 갱신, `remaining <= 0`이면 `TIME_UP`)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

"판 전체" 방식(`timeMode: 'game'`)은 모든 라운드가 시계 하나(`gameTimeSec`)를 같이 쓰는 타임어택이다.

- 라운드가 진행되는 동안(`playing`)만 시계가 줄어든다. 카운트다운·라운드 결과 동안에는 멈춘다.
- 판 시간이 다 되면 그 라운드는 `TIME_UP`으로 끝나고(라운드 결과를 보여준다), 다음 `NEXT_ROUND`에서 남은 라운드가 있어도 `final`로 간다.
- 결과 화면에 보여줄 "총 걸린 시간"을 플레이어별로 누적한다. 푼 라운드는 푼 시간, 못 푼 라운드는 그 라운드의 길이를 더한다.

이 step은 `src/shell/logic/match.ts`의 **시계·시간 누적만** 바꾼다. 점수 계산(빠르기 보너스)은 step 3에서 한다.

## 작업

TDD로 진행한다: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다.

### `MatchState`에 추가

```ts
/** 끝난 라운드 길이의 합(ms) — 판 전체 시계는 이것으로 계산한다 */
usedMs: number;
/** 끝난 라운드들에서 플레이어별로 쓴 시간의 합(ms): 푼 라운드는 푼 시간, 못 푼 라운드는 그 라운드 길이 */
totalTimesMs: number[];
/** 플레이어별로 푼 라운드 수 */
solvedCounts: number[];
```

`createMatch`에서 모두 0으로 시작한다. `NEXT_ROUND`에서 초기화하지 않는다(판 전체 누적).

### 새 함수

```ts
/** 이번 라운드에 쓸 수 있는 최대 시간(ms). round: timeLimitSec*1000, game: max(0, gameTimeSec*1000 - usedMs) */
export function roundBudgetMs(state: MatchState): number;

/** 이번이 마지막 라운드인가: round >= rounds 이거나, game 방식에서 남은 판 시간(roundBudgetMs)이 0 이하 */
export function isLastRound(state: MatchState): boolean;
```

### 바꿀 동작

1. `remainingMs(state, now)`를 예산 기준으로 통일한다. 플레이 중이면 `budget - (now - roundStartedAt)`을 `0~budget`으로 자르고, 플레이 중이 아니면 `budget`. 라운드마다 방식의 기존 결과(테스트)는 그대로여야 한다.
2. `SOLVED`: 기존 무시 조건에 더해, 경과 시간(`now - roundStartedAt`)이 `roundBudgetMs(state)` **이상**이면 무시하고 같은 객체를 돌려준다. 이유: 화면은 250ms마다 시간을 확인하므로 시간이 끝난 직후의 풀이가 `TIME_UP`보다 먼저 들어올 수 있다.
3. `finishRound(state, durationMs)`로 라운드 길이를 받는다.
   - 모두 풀어서 끝나면: `durationMs` = 가장 늦게 푼 사람의 시간(`solveTimesMs`의 최댓값).
   - `TIME_UP`이면: `durationMs` = `roundBudgetMs(state)` (라운드가 끝나기 전 `usedMs` 기준).
   - `totalTimesMs[i] += solveTimesMs[i] ?? durationMs`, 푼 사람은 `solvedCounts[i] += 1`, `usedMs += durationMs`.
   - 점수 계산(`roundPoints`, `totals`)은 지금 그대로 둔다.
4. `NEXT_ROUND`: `isLastRound(state)`이면 `final`, 아니면 지금처럼 다음 라운드 카운트다운.

reducer는 여전히 시계를 직접 읽지 않는다(`Date.now()` 금지). 시각은 액션의 `now`로만 받는다.

### 테스트 (`match.test.ts`에 추가)

판 전체 방식용 팩토리를 하나 더 만든다(예: `gameConfig(players, rounds, gameTimeSec)`).

- `roundBudgetMs`: 라운드마다 방식은 90000. 판 전체 50초에서 첫 라운드는 50000.
- 판 시계는 라운드 사이에 멈춘다: 판 전체 50초, 2인. 라운드 1을 시작(`now: 0`)해 둘 다 10초·12초에 풀면 `usedMs`가 12000. 라운드 결과·다음 카운트다운 상태에서 `remainingMs(s, 아주 큰 now)`가 38000.
- 판 시간이 끝나면 남은 라운드가 있어도 끝난다: 판 전체 50초, 5라운드. 한 명이 못 푼 채 `TIME_UP` → `usedMs` 50000, `isLastRound`가 참, `NEXT_ROUND` → `phase: 'final'`, `round`는 1.
- 판 전체에서 두 번째 라운드의 `remainingMs`는 남은 판 시간에서 줄어든다(예: 첫 라운드 12초 사용 → 두 번째 라운드 시작 후 5초 뒤 33000).
- 예산을 넘긴 `SOLVED`는 무시: 라운드마다 90초, `START_ROUND now: 0` 뒤 `SOLVED now: 90000` → `toBe(s)`. 판 전체에서도 남은 판 시간 이상이면 무시.
- 총 시간: 2인 라운드마다 90초. 라운드 1에서 P0만 20초에 풀고 `TIME_UP` → `totalTimesMs` `[20000, 90000]`, `solvedCounts` `[1, 0]`. 라운드 2에서 둘 다 5초·8초에 풀면 `[25000, 98000]`, `[2, 1]`.
- `isLastRound`: 라운드마다 방식 3라운드에서 1·2라운드는 거짓, 3라운드는 참.

기존 테스트(라운드마다 방식)는 고치지 않고 그대로 통과해야 한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `src/shell/logic/match.ts`에 React/DOM import, `Date.now()`가 없는가?
   - ES2023+ API를 쓰지 않았는가? (`Math.max(...arr)`, `reduce`는 괜찮다)
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/1-time-scoring/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (새 필드·함수 이름을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 점수 계산(`roundPoints` 함수, `finishRound`의 점수 부분)을 바꾸지 마라. 이유: 빠르기 보너스는 step 3에서 기대값 수정과 함께 한다.
- `src/shell/ui/` 아래 파일을 고치지 마라. 이유: 화면 변경은 step 5·6에서 한다. 이 step은 reducer가 바뀌어도 화면이 그대로 동작해야 한다.
- 사람마다 따로 시계를 두지 마라. 이유: ADR-007에서 모두가 시계 하나를 같이 쓰기로 정했다(아이가 혼자 탈락하지 않게).
- `NEXT_ROUND`에서 `usedMs`·`totalTimesMs`·`solvedCounts`를 0으로 되돌리지 마라. 이유: 판 전체 누적 값이다.
- 기존 테스트를 지우거나 `skip`하지 마라.
