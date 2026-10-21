# Step 6: final-result

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md` (최종 결과 줄 모양, 색 변수, 레이아웃: 1280×720에서 4명이어도 스크롤 없이)
- `/docs/ADR.md` (ADR-007: 총 걸린 시간, 동점이면 시간이 짧은 쪽이 앞)
- `/src/shell/logic/match.ts` — step 3의 `Standing` 타입과 `standings(state)` (정렬·`winner` 판정이 이미 들어 있다), step 2의 `totalTimesMs`·`solvedCounts`, 아직 남아 있는 `winners()`
- `/src/shell/logic/format.ts` — step 3의 `formatDuration(ms)` ("45.2초" / "1분 02.3초")
- `/src/shell/ui/FinalResult.tsx`, `/src/shell/ui/FinalResult.module.css`, `/src/shell/ui/FinalResult.test.tsx`
- `/src/shell/ui/Match.tsx` (`phase === 'final'`일 때 `FinalResult`를 그린다), `/src/shell/ui/Match.test.tsx`

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

최종 결과에 플레이어별 총 걸린 시간과 푼 라운드 수를 보여주고, 순위는 `standings`(총점 → 총 시간 → 번호)를 따른다. 판 전체 방식에서 시간이 다 돼 일찍 끝났으면 몇 라운드까지 했는지 알려준다.

## 작업

TDD로 진행한다: `FinalResult.test.tsx`를 새 props로 먼저 고치고 실패를 확인한 뒤 구현한다.

### 1. `src/shell/ui/FinalResult.tsx`

```ts
type Props = {
  players: PlayerConfig[];
  standings: Standing[];   // 이미 순위대로 정렬돼 있다 — 컴포넌트에서 다시 정렬하지 않는다
  roundsPlayed: number;    // 실제로 한 라운드 수 (state.round)
  rounds: number;          // 설정한 라운드 수 (config.rounds)
  onReplay: () => void;
  onExit: () => void;
};
```

- 제목: 혼자면 `다 했어요!`. 여럿이면 `winner`가 한 명일 때 `{이름} 우승!`, 여러 명이면 `공동 우승!`.
- 부제: `roundsPlayed < rounds`이면 제목 아래에 `시간이 다 됐어요 · {roundsPlayed}/{rounds} 라운드`. 아니면 부제를 그리지 않는다.
- 각 줄(`<li>`, 순서는 `standings` 그대로): 이름, `{total}점`, `총 {formatDuration(timeMs)}`, `{solved}/{roundsPlayed} 완성`, 여럿이고 `winner`면 `우승` 표시(지금의 `.crown`).
- 줄 왼쪽 테두리 색은 지금처럼 `PLAYER_COLORS[player]`.

### 2. `src/shell/ui/FinalResult.module.css`

- 시간·완성 수는 이름·점수보다 작은 글자(예: 1.2rem), 색 `var(--ink-soft)`, 같은 줄 안에 둔다. 줄 높이가 늘지 않게 한다(4명 + 부제 + 버튼이 1280×720에 스크롤 없이 들어가야 한다).
- 부제 클래스는 제목 아래 `var(--ink-soft)`. 새 16진수 색을 쓰지 않는다.

### 3. `src/shell/ui/Match.tsx`

- `phase === 'final'`일 때 `<FinalResult players={config.players} standings={standings(state)} roundsPlayed={state.round} rounds={config.rounds} … />`로 넘긴다.

### 4. `winners()` 정리

- `grep -rn "winners" src`로 다른 사용처가 없음을 확인한 뒤 `src/shell/logic/match.ts`의 `winners()`와 `match.test.ts`의 `winners` 테스트를 지운다. 같은 뜻(최고점이 여럿이면 공동)은 step 3의 `standings` 테스트가 이미 검증한다.

### 5. 테스트 (`FinalResult.test.tsx` 다시 쓰기)

`Standing` 배열을 직접 만들어 넘긴다. 기존 테스트 4개의 의도(우승자 한 명·점수 순 표시, 동점이면 공동 우승, 혼자면 끝 인사, 다시 하기/메뉴로)는 새 props로 그대로 옮긴다. 줄 내용은 `textContent`의 정확한 문자열 대신 `toHaveTextContent`로 부분 확인해도 된다.

추가할 테스트:
- 각 줄에 `총 1분 02.3초`처럼 총 시간과 `4/5 완성`이 보인다.
- 점수가 같고 시간이 다르면(`standings`가 그렇게 판정한 `winner` 한 명) 제목이 그 사람 `우승!`이고 `우승` 표시가 하나다.
- `roundsPlayed` 3, `rounds` 5이면 `시간이 다 됐어요 · 3/5 라운드`가 보인다. 둘이 같으면 그 글자가 없다.
- 혼자면 `우승` 표시가 없다.

`Match.test.tsx`의 '다음 라운드를 거쳐 마지막 라운드 뒤 최종 결과를 보여준다'는 그대로 통과해야 한다(`서연 우승!`).

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - 순위·우승 판정을 컴포넌트에서 하지 않고 `standings`의 결과만 그리는가?
   - `src/shell/logic`에 React/DOM import가 없는가? 새 16진수 색·그림자·그라데이션이 없는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/1-time-scoring/index.json`의 step 6을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"`
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- `FinalResult` 안에서 `sort`하거나 우승자를 계산하지 마라. 이유: 규칙은 `shell/logic`의 순수 함수에 두고 Vitest로 검증한다(CLAUDE.md 아키텍처 규칙).
- `standings`·`speedBonus` 등 step 3의 로직 규칙을 바꾸지 마라. 이유: 이미 테스트로 확정됐다. 모자란 것이 있으면 summary에 적어라.
- 최종 결과를 `localStorage`에 저장하지 마라. 이유: 이번 범위가 아니고, 저장 항목은 설정·1인 최고기록뿐이다(ARCHITECTURE).
- `winners()` 사용처가 남아 있으면 지우지 마라.
- 테스트를 `skip`하지 마라. 기존 FinalResult 테스트의 의도를 빠뜨리지 마라.
