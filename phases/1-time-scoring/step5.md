# Step 5: match-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md` (플레이어 칸 머리, 타이포그래피, 상태 색 `--ok`·`--warn`)
- `/docs/ADR.md` (ADR-007)
- `/docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (§3.5, §4.1 상단 바)
- `/src/shell/logic/match.ts` — step 1~3에서 추가된 것: `TimeMode`, `MatchConfig.timeMode`·`gameTimeSec`, `MatchState.usedMs`·`totalTimesMs`·`solvedCounts`·`roundBonus`, `roundBudgetMs`, `isLastRound`, `speedBaseMs`, `speedBonus`, `standings`. `remainingMs`는 이미 판 전체 시계를 반영한다
- `/src/shell/ui/Match.tsx`, `/src/shell/ui/Match.module.css`, `/src/shell/ui/Match.test.tsx`
- `/src/shell/ui/TopBar.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

로직은 이미 판 전체 시계와 빠르기 보너스를 계산한다. 이 step은 플레이 화면에 그것을 보여준다.

- 판 전체 방식이면 위쪽 막대의 시계가 판 전체 남은 시간이다(`remainingMs`가 이미 그렇게 계산한다). 라운드마다 방식과 구분되게 시계 앞에 `판 전체`라고 적는다.
- 라운드 결과에서 빠르기 보너스를 받은 사람은 칸 머리에 `빠르기 +2`처럼 보여준다.
- 판 시간이 다 되면 남은 라운드가 있어도 결과 막대 버튼이 `결과 보기`가 되고, 글자는 `시간이 다 됐어요!`가 된다.

## 작업

TDD로 진행한다: `Match.test.tsx`에 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다.

### 1. `src/shell/ui/TopBar.tsx`

- prop `clockLabel?: string`을 추가한다. 있으면 시계(`data-testid="clock"`) 바로 앞에 작은 글자(`<span>`)로 보여준다. 시계 글자 자체는 바꾸지 않는다(기존 테스트가 `toHaveTextContent('1:00')`로 확인한다).
- `Match.tsx`는 `config.timeMode === 'game'`일 때 `clockLabel="판 전체"`를 넘긴다.

### 2. `PlayerHeader` (`Match.tsx` 안)

- `state.phase === 'roundResult'`이고 `state.roundBonus[index] > 0`이면 상태 줄 아래에 `빠르기 +{N}` 한 줄을 보여준다.
- 스타일은 `Match.module.css`에 `.bonus` 클래스를 추가한다: 기존 `.status`와 같은 글자 크기, 색 `var(--ok)`.
- 칸 머리(`PlayLayout`의 `.head`)는 `overflow: hidden`이다. 줄을 늘리는 것은 이 한 줄뿐이고, 글자 크기를 키우지 마라.

### 3. 결과 막대 (`Match.tsx`)

- 버튼 라벨: `isLastRound(state)`면 `결과 보기`, 아니면 `다음 라운드`. 지금의 `state.round >= config.rounds` 비교를 대체한다.
- 글자: `config.timeMode === 'game' && roundBudgetMs(state) <= 0`이면 `시간이 다 됐어요!`, 아니면 지금처럼 `라운드 {N} 끝!`.

### 4. 테스트 (`Match.test.tsx`에 추가)

판 전체 방식 config 팩토리를 추가한다(예: `{ ...config(2, 3), timeMode: 'game', gameTimeSec: 50 }`). 가짜 타이머(`vi.useFakeTimers`, `advance`)는 기존 테스트처럼 쓴다. 카운트다운은 3초다.

- 판 전체 방식이면 시계 앞에 `판 전체`가 보이고, 첫 라운드 시작 때 시계가 `0:50`. 라운드마다 방식에는 `판 전체` 글자가 없다.
- 판 시계는 라운드 사이에 멈춘다: 시작 후 10초에 둘 다 풀기 → 라운드 결과에서 시계 `0:40`. 5초 더 기다려도 `0:40`. `다음 라운드` → 카운트다운 3초 동안에도 `0:40`. 시작 후 5초 → `0:35`.
- 판 시간이 다 되면: 3라운드 판 전체 50초에서 1라운드에 아무도 안 풀고 50초 → `시간이 다 됐어요!`와 `결과 보기` 버튼(남은 라운드가 있어도). 누르면 최종 결과 화면(제목 heading)이 나온다.
- 빠르기 보너스 표시: 라운드마다 60초에서 바로 풀면 그 칸에 `빠르기 +2`. 41초 뒤에 푼 사람(60초의 2/3 = 40초 초과)은 `빠르기` 글자가 없다.
- 기존 테스트는 모두 그대로 통과해야 한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 시간·점수 판단을 컴포넌트 안에서 새로 계산하지 않고 `shell/logic`의 함수(`isLastRound`, `roundBudgetMs`, `remainingMs`)를 썼는가?
   - 새 16진수 색·그림자·그라데이션이 없는가? Chrome 99가 지원하지 않는 CSS가 없는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/1-time-scoring/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `src/games/` 아래(`PlayerArea`, 드래그 코드)를 고치지 마라. 이유: 게임 모듈은 `onSolved()`만 알리고 시간·점수는 셸이 맡는다(ARCHITECTURE의 셸 + 게임 모듈 패턴).
- `TICK_MS`(250ms), 카운트다운 길이, `URGENT_MS`를 바꾸지 마라. 이유: 칠판에서 이미 확인한 주기다.
- 시계를 위해 `requestAnimationFrame`이나 새 `setInterval`을 추가하지 마라. 이유: 기존 250ms 갱신으로 충분하고, 칠판 SoC에서 렌더를 늘리지 않는다.
- `FinalResult.tsx`를 고치지 마라. 이유: 최종 결과 화면은 step 6에서 바꾼다(이 step에서는 `FinalResult`에 넘기는 props도 그대로 둔다).
- 기존 테스트를 지우거나 `skip`하지 마라.
