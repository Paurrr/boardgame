# Step 6: bell-match

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md (ADR-009), /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-fruit-bell-design.md
- /docs/superpowers/plans/2026-10-25-fruit-bell.md (전체 계획. 이 step은 Task 6)
- `/phases/3-fruit-bell/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/bell/logic/game.ts
- /src/games/bell/logic/press.ts
- /src/games/bell/ui/Lane.tsx
- /src/games/bell/ui/notice.ts
- /src/games/types.ts
- /src/shell/ui/Match.tsx
- /src/shell/ui/FinalResult.tsx
- /src/lib/sound.ts
- /src/lib/sound.test.ts
- /src/games/registry.ts
- /src/games/registry.test.ts

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
3. 결과에 따라 `phases/3-fruit-bell/index.json`의 step 6을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **300자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
