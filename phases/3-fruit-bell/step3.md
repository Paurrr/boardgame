# Step 3: shell-own-match

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md (ADR-009), /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-fruit-bell-design.md
- /docs/superpowers/plans/2026-10-25-fruit-bell.md (전체 계획. 이 step은 Task 3)
- `/phases/3-fruit-bell/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/types.ts
- /src/App.tsx
- /src/App.test.tsx
- /src/shell/logic/setup.ts
- /src/shell/ui/PlayerSetup.tsx
- /src/shell/ui/PlayerSetup.test.tsx
- /src/shell/ui/TopBar.tsx
- /src/shell/ui/Match.tsx
- /src/shell/ui/Match.test.tsx

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 공통 제약 (모든 step)

- 칠판 Chrome 99. CSS nesting·container query·`:has()`·`oklch()/color-mix()` 금지. JS는 ES2022까지(`toSorted` 등 금지, 정렬은 `slice().sort()`). 폴리필 없음.
- 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM 의존 금지. `src/games/bell/ui/notice.ts`도 순수 TS로 쓴다.
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits다(execute.py가 단계마다 커밋한다).
- 색은 `src/styles.css`의 `:root` 변수만 쓴다. 과일 색은 1탄 `src/games/blocks/logic/pieces.ts`의 `PIECES`에서 가져온다: 딸기←`I3`(#D9442E), 바나나←`L3`(#F2B53A), 라임←`L5`(#8DBB2E), 블루베리←`U5`(#22507C), 잎·꼭지←`T4`(#2E9E55). 그림자·글로우·그라데이션·필터 금지. 두께는 아래 테두리로 낸다.
- 공개 명칭은 "과일 종치기", id는 `bell`이다. 원작 이름("할리갈리")·원작 그림은 화면 글자·파일·식별자에 쓰지 않는다.
- 플레이어 칸은 가로로 나란히 둔다. 조작 요소(뒤집기·종)는 칸의 아래쪽 2/3에만 둔다. 누르는 요소는 56 CSS px 이상, 주요 버튼은 72 CSS px 이상. 칸 아래 여백 1.5rem 이상. 칠판(1280×720) 4명에서 스크롤 없이 들어가야 한다.
- 터치는 Pointer Events. 칸 안 버튼은 `pointerdown`에 반응한다. 멀티터치 판단에 `navigator.maxTouchPoints`를 쓰지 않는다.
- 숫자: 카드 56장 = 과일 4가지 × (1개 5장, 2개 3장, 3개 3장, 4개 2장, 5개 1장). 인원 2~4명. 톡 기준은 `src/lib/gesture.ts`의 `isTap`(300ms 미만·10px 미만). 결과 표시 1500ms, 끝난 뒤 결과 화면까지 1500ms.

## 작업

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

## Acceptance Criteria

```bash
npm run lint && npm run test && npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR(특히 ADR-006 Chrome 99, ADR-009)을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (순수 로직에 React/DOM import 없음, ES2023+ API 없음, 하드코딩 색·그림자·그라데이션 없음)
3. 결과에 따라 `phases/3-fruit-bell/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **300자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
