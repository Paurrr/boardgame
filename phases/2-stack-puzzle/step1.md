# Step 1: shell-time-options

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 1)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- `/docs/ADR.md (Task 0에서 추가한 ADR-008)`

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
