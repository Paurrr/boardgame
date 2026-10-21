# Step 4: setup-ui

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/CLAUDE.md`
- `/docs/UI_GUIDE.md` (버튼·레이아웃 규칙: 칠판 1280×720에서 최대 인원일 때도 스크롤 없이 들어가야 한다, 주요 버튼은 아래쪽, 아래 여백 1.5rem 이상)
- `/docs/ADR.md` (ADR-007)
- `/docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (§4.1 플레이어 설정)
- `/src/shell/logic/setup.ts` — step 1에서 `SavedSetup.timeMode`·`gameTimeSec`, `GAME_TIME_MIN_SEC`(30)·`GAME_TIME_MAX_SEC`(600)·`GAME_TIME_STEP_SEC`(10), `clampGameTime`, `stepGameTime`이 추가됐다
- `/src/shell/logic/match.ts` — `TimeMode`, `TIME_OPTIONS`
- `/src/shell/logic/format.ts` — `formatClock(ms)` ("m:ss")
- `/src/shell/ui/PlayerSetup.tsx`, `/src/shell/ui/PlayerSetup.module.css`, `/src/shell/ui/PlayerSetup.test.tsx`
- `/src/styles.css` (`.btn`, `aria-pressed` 스타일, `:root` 색 변수)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 배경

설정 화면에서 시간 방식을 고르게 한다.

- 라운드마다(기존): 라운드마다 60/90/120초 중 하나.
- 판 전체(새 타임어택): 모든 라운드를 합친 시간을 −10초 / +10초 버튼으로 정한다(30초~10분). 예: "5라운드를 0:50 안에".

설정 화면은 부모 한 명이 조작하므로 버튼은 지금처럼 `onClick`을 쓴다.

## 작업

TDD로 진행한다: `PlayerSetup.test.tsx`에 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다.

### `src/shell/ui/PlayerSetup.tsx`

- 상태 `timeMode`, `gameTimeSec`를 `initial`에서 복원한다.
- 오른쪽 열(`styles.how`)을 위에서부터 이렇게 둔다.
  1. 라운드 줄 (지금 그대로)
  2. 시간 방식 줄: `role="group"`, `aria-label="시간 방식"`, 라벨 `시간`, 버튼 `라운드마다` / `판 전체` (`aria-pressed`로 선택 표시)
  3. 방식에 따라 한 줄만 보여준다.
     - 라운드마다: 지금의 `aria-label="제한시간"` 줄(60초/90초/120초 버튼). 라벨은 `제한`으로 바꿔도 된다.
     - 판 전체: `role="group"`, `aria-label="판 전체 시간"` 줄. 라벨 `전체`, 버튼 `−10초`(`aria-label="10초 줄이기"`), 값 `<span data-testid="game-time">{formatClock(gameTimeSec * 1000)}</span>`, 버튼 `+10초`(`aria-label="10초 늘리기"`). 값이 `GAME_TIME_MIN_SEC`이면 줄이기, `GAME_TIME_MAX_SEC`이면 늘리기를 `disabled`로 한다. 값 변경은 `stepGameTime`으로 한다.
  4. 메뉴·시작 버튼 줄 (지금 그대로, 맨 아래)
- 시작: `onStart(finalizeSetup({ players, rounds, timeMode, timeLimitSec, gameTimeSec }))`. 방식을 바꿔도 다른 방식의 값은 버리지 않고 함께 넘긴다(다음에 설정 화면을 열면 복원된다).
- step 1에서 임시로 넣은 `...initial` 펼치기는 위 호출로 대체한다.

### `src/shell/ui/PlayerSetup.module.css`

- 필요하면 값 표시용 클래스(예: `.gameTime`: 굵게, `font-variant-numeric: tabular-nums`, 최소 너비 4rem, 가운데 정렬)를 추가한다.
- 색은 `:root` 변수(`var(--ink)` 등)만 쓴다.
- 줄이 하나만 늘어난다. 4명일 때 왼쪽 열(인원 + 4명 = 5줄)보다 오른쪽 열이 높아지지 않게 한다. 오른쪽 열의 행 간격·글자 크기를 키우지 마라.

### 테스트 (`PlayerSetup.test.tsx`에 추가)

- 처음(기본 설정)에는 `라운드마다`가 눌려 있고 `제한시간` 그룹이 보이며 `판 전체 시간` 그룹은 없다.
- `판 전체`를 누르면 `판 전체 시간` 그룹이 보이고 `game-time`이 `5:00`, `제한시간` 그룹은 사라진다.
- `10초 늘리기` → `5:10`, `10초 줄이기` 두 번 → `4:50`.
- `initial`이 `{ ...defaultSetup(), timeMode: 'game', gameTimeSec: 30 }`이면 `판 전체`가 눌려 있고 `0:30`이며 `10초 줄이기`가 `disabled`. `gameTimeSec: 600`이면 `10초 늘리기`가 `disabled`.
- 판 전체로 바꾸고 `10초 줄이기`를 25번 눌러 `0:50`으로 만든 뒤(300→50) `시작!` → `onStart` 인자의 `timeMode`가 `'game'`, `gameTimeSec`가 50, `timeLimitSec`는 90 그대로.
- 기존 테스트('고른 이름·난이도·라운드·시간으로 시작한다' 등)는 그대로 통과해야 한다.

## Acceptance Criteria

```bash
npm run lint && npm run build && npm run test
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - UI_GUIDE의 버튼 모양(`.btn`, `aria-pressed`)을 그대로 썼는가? 그림자·그라데이션·새 16진수 색이 없는가?
   - CSS nesting·`:has()`·container query 등 Chrome 99가 지원하지 않는 CSS를 쓰지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가?
3. 결과에 따라 `phases/1-time-scoring/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (aria-label·testid 이름을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 숫자 `<input type="number">`나 텍스트 입력으로 시간을 받지 마라. 이유: 칠판에서 화상 키보드가 올라와 화면 절반을 가리고, 아이가 잘못 누르기 쉽다.
- 슬라이더(`<input type="range">`)를 쓰지 마라. 이유: 칠판 IR 터치는 떨림이 있어 정확한 값을 맞추기 어렵다.
- `PlayerSetup.tsx`·`PlayerSetup.module.css`·`PlayerSetup.test.tsx` 밖의 파일을 고치지 마라. 이유: 이 step은 설정 화면만 다룬다. 로직 함수가 모자라면 새로 만들지 말고 step 1의 `stepGameTime`·`clampGameTime`을 써라.
- 라운드 수·제한시간 선택지(`ROUND_OPTIONS`, `TIME_OPTIONS`)를 바꾸지 마라.
- 기존 테스트를 지우거나 `skip`하지 마라.
