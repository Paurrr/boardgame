# Step 3: speed-score

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md`
- `/docs/ADR.md` (ADR-007: 빠르기 보너스, 동점 처리)
- `/docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (§3.5)
- `/src/shell/logic/match.ts` — step 1·2에서 `TimeMode`, `gameTimeSec`, `usedMs`, `totalTimesMs`, `solvedCounts`, `roundBudgetMs`, `isLastRound`가 추가됐다. `finishRound`가 점수를 계산하는 곳이다
- `/src/shell/logic/match.test.ts`
- `/src/shell/logic/format.ts`, `/src/shell/logic/format.test.ts`
- `/src/shell/ui/Match.test.tsx` (점수 문구 '3점 +3' 등을 확인하는 테스트가 있다)
- `/src/shell/ui/FinalResult.tsx` (지금 `winners()`를 쓴다 — 이 step에서는 건드리지 않는다)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

점수 = 순위 점수 + 빠르기 보너스.

- 순위 점수는 지금 그대로: 1등 3점, 2등 2점, 그 뒤로 푼 사람 1점, 못 풀면 0점(`roundPoints()` 함수).
- 빠르기 보너스: 기준 시간의 1/3 이내 +2, 2/3 이내 +1, 그 뒤 +0. 경계값은 포함한다(딱 1/3이면 +2).
- 기준 시간: 라운드마다 방식이면 `timeLimitSec * 1000`, 판 전체 방식이면 `gameTimeSec * 1000 / rounds`.
- 최종 순위: 총점 내림차순 → 총 걸린 시간(0.1초 단위로 반올림) 오름차순 → 플레이어 번호 순. 1등과 총점·시간이 모두 같으면 공동 우승.

## 작업

TDD로 진행한다: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다.

### 1. `src/shell/logic/match.ts`

```ts
/** 빠르기 보너스 기준 시간(ms): round → timeLimitSec*1000, game → gameTimeSec*1000/rounds */
export function speedBaseMs(config: MatchConfig): number;

/** 기준의 1/3 이내 2점, 2/3 이내 1점, 그 뒤 0점 (경계 포함). 3*t <= base, 3*t <= 2*base 처럼 곱셈으로 비교한다 */
export function speedBonus(timeMs: number, baseMs: number): number;

export type Standing = {
  player: number;   // 플레이어 번호
  total: number;    // 총점
  timeMs: number;   // 총 걸린 시간 (state.totalTimesMs)
  solved: number;   // 푼 라운드 수 (state.solvedCounts)
  winner: boolean;  // 1등과 총점·시간(0.1초 단위)이 모두 같으면 true
};
/** 최종 순위표. 총점 내림차순 → Math.round(timeMs/100) 오름차순 → 플레이어 번호 오름차순 */
export function standings(state: MatchState): Standing[];
```

- `MatchState`에 `roundBonus: number[]`(방금 끝난 라운드의 빠르기 보너스)를 추가한다. `createMatch`와 `NEXT_ROUND`에서 0으로 채운다.
- `finishRound`에서: `rank = roundPoints(solveOrder, n)`, `bonus[i] = solveTimesMs[i] === null ? 0 : speedBonus(solveTimesMs[i], speedBaseMs(config))`. 상태의 `roundPoints`는 `rank + bonus` 합계, `roundBonus`는 `bonus`, `totals`에는 합계를 더한다.
- `roundPoints()` **함수**는 순위 점수만 계산하는 지금 그대로 둔다(기존 테스트 유지).
- `winners()`는 지우지 않는다. `FinalResult.tsx`가 아직 쓴다(step 6에서 정리).
- 정렬은 배열을 복사한 뒤 `sort`한다(`toSorted` 금지).

### 2. `src/shell/logic/format.ts`

```ts
/** 총 걸린 시간 표시: 60초 미만 "45.2초", 이상 "1분 02.3초". 0.1초 단위로 먼저 반올림한 뒤 분·초로 나눈다 */
export function formatDuration(ms: number): string;
```

예: 0 → "0.0초", 45200 → "45.2초", 59940 → "59.9초", 59960 → "1분 00.0초", 62300 → "1분 02.3초", 600000 → "10분 00.0초".

### 3. 새 테스트

`match.test.ts`
- `speedBaseMs`: 라운드마다 90초 → 90000. 판 전체 50초·5라운드 → 10000.
- `speedBonus(t, 90000)`: 0→2, 30000→2, 30001→1, 60000→1, 60001→0, 90000→0.
- 라운드마다 90초 2인: P0 10초(1등), P1 70초(2등)에 풀면 `roundPoints` `[5, 2]`, `roundBonus` `[2, 0]`.
- 판 전체 방식에서는 기준이 `gameTimeSec*1000/rounds`로 바뀐다(예: 판 전체 60초·3라운드 → 기준 20초. 혼자 7초에 풀면 3+1=4점).
- `NEXT_ROUND` 뒤 `roundBonus`가 0으로 돌아간다.
- `standings`: 총점 순 정렬, 동점이면 시간 짧은 쪽이 앞이고 그 사람만 `winner`, 총점과 0.1초 단위 시간이 같으면(예: 12310ms와 12340ms → 둘 다 123) 둘 다 `winner`. `solved`가 `solvedCounts`와 같다. 상태를 만들 때는 reducer를 실제로 돌려도 되고 `{ ...createMatch(...), totals, totalTimesMs, solvedCounts }`처럼 덮어써도 된다.

`format.test.ts`
- 위 `formatDuration` 예시들.

### 4. 기존 테스트 기대값 고치기

보너스 때문에 아래 기존 테스트의 점수가 바뀐다. 테스트 이름과 의도는 그대로 두고 **기대값만** 새 규칙으로 고친다(모두 90초 또는 60초 제한에서 몇 초 안에 풀어 +2를 받는다).

- `match.test.ts` '모두 풀면 라운드가 끝나고 점수가 더해진다' → `roundPoints`·`totals` `[4, 3, 5]`
- `match.test.ts` 'TIME_UP: 못 푼 사람은 0점으로 라운드를 끝낸다' → `[0, 5, 0]`
- `match.test.ts` '혼자 하면 풀자마자 라운드가 끝난다' → `totals` `[5]`
- `match.test.ts` '점수는 라운드를 넘어 누적된다' → `[9, 5]`
- `src/shell/ui/Match.test.tsx` '모두 풀면 라운드가 끝나고 푼 순서대로 점수를 얻는다' → `'5점 +5'`, `'4점 +4'`

다른 테스트가 깨지면 위 규칙으로 기대값을 계산해 고치되, 고친 이유를 summary에 적는다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - `src/shell/logic`에 React/DOM import가 없는가?
   - `toSorted` 등 ES2023+ API를 쓰지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/1-time-scoring/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (새 함수·필드 이름을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `src/shell/ui/Match.tsx`, `src/shell/ui/FinalResult.tsx`, `TopBar.tsx`를 고치지 마라. 이유: 화면은 step 5·6에서 바꾼다. `Match.test.tsx`는 위에 적은 기대값만 고친다.
- `winners()`를 지우거나 시그니처를 바꾸지 마라. 이유: `FinalResult.tsx`가 아직 쓰고, step 6에서 `standings`로 바꾼 뒤 지운다.
- 보너스를 소수점 나눗셈(`t / base < 1/3`)으로 비교하지 마라. 이유: 경계값(딱 1/3)에서 부동소수점 오차로 결과가 흔들린다.
- 순위 점수 규칙(3/2/1/0)을 바꾸지 마라.
- 테스트를 지우거나 `skip`하지 마라. 테스트 이름이 말하는 의도를 바꾸지 마라.
