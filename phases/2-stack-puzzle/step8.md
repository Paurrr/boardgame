# Step 8: stack-play

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 8)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- `/src/games/types.ts`
- `/src/games/registry.ts`
- `/src/shell/logic/setup.ts`
- `/src/lib/devMode.ts`
- `/src/games/stack/logic/*`
- `/src/games/stack/ui/{camera,CubeScene,layout}.*`
- `/src/lib/rects.ts`
- `/src/games/blocks/ui/PlayerArea.tsx (참고용, 수정 금지)`

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
- Create: `src/games/stack/ui/PlayerArea.tsx`, `src/games/stack/ui/PlayerArea.module.css`, `src/games/stack/index.ts`
- Modify: `src/games/registry.ts` (`GAMES = [blocksGame, stackGame]`)
- Test: `src/games/stack/ui/PlayerArea.test.tsx`, `src/games/registry.test.ts`

**Interfaces:**
- Consumes:
  - Task 1(`timeOptions`·`defaultTimeSec`), Task 2(`hidden`), Task 3~7 전부
  - `usePointerDrag`(`src/lib/usePointerDrag.ts`), `useElementSize`, `createRng`
- Produces:
  - `stackGame: GameModule`
    - `{ id: 'stack', name: '쌓기 퍼즐', description: '조각을 쌓아 모양을 2층까지 채워요', minPlayers: 1, maxPlayers: 4, PlayerArea, timeOptions: [90, 120, 150], defaultTimeSec: 120, hidden: true }`
  - `PlayerArea`(memo, `PlayerAreaProps`)
  - 시험용 DOM 표식
    - 조각 그룹: `data-testid="stack-piece"`, `data-piece={id}`, `data-state="tray"|"loose"|"board"`, `data-cells={모양 key}`
    - 버튼: `aria-label="돌리기"`/`"눕히기"`
- 동작 (설계서 §4.1·§4.4·§4.5)
  - 시점은 상태 `{ az: AZ0, el: EL0 }`로 둔다. 판 돌리기 제스처는 Task 9.
  - 판 바닥을 그린다.
    - 바닥 모양 칸은 `--target`, 바운딩박스의 나머지 칸은 `--margin-cell`이고, 격자선은 `--grid-line`이다.
    - 실루엣은 `--target-edge`로 굵게, 풀면 `--ok`로 그린다.
  - 그 위에 빈칸(ghost, 항상 보임) + 판 위 조각 + 미리보기를 한 `CubeScene`으로 그린다.
  - 트레이·판 밖·끄는 조각은 조각마다 `<g transform>`으로 그린다. 끄는 조각이 맨 위고, 판 밖 조각끼리는 마지막에 끈 조각이 위다.
  - 판 밖 조각은 위치를 가운데 좌표로 기억한다. 톡·버튼으로 돌려도 그 자리에서 돈다. 돌린 뒤 빈 곳을 벗어나면 `looseSpot`으로 다시 맞춘다.
  - 버튼은 1탄 `ActionButton` 모양이다. 나무 블록 SVG이고 면 아래에 `--ink` 두께 블록을 깐다. `pointerdown`에 반응하고, 고른 조각이 없으면 눌리지 않는 모양이다. 높이는 `layout.buttonH`다.
  - 트레이·판 밖은 `TRAY_SCALE`로, 끄는 중은 1배로 그린다. 잡은 점은 손가락 아래에 둔다(`clientToSvg`로 누른 점을 SVG 좌표로 바꾼다).
  - 끄는 중 `landingNear`로 떨어질 자리를 구한다.
    - 놓을 수 있으면: 미리보기(kind 'preview')를 판에 그리고, 손에 든 그룹은 숨긴다.
    - 판에 걸쳤는데(`pointInPolygon(조각 화면 중심 − 판 원점, boardOutline)`) 놓을 수 없으면: 투명도 0.5
    - 판 밖이면: 보통 모습
  - 놓기
    - 자리 있음 → 판에 놓는다.
    - 판에 걸침 + 자리 없음 → 판 밖 마지막 자리, 없으면 트레이로 간다.
    - 판 밖 → `looseSpot`으로 그 자리에 둔다.
  - 톡 = `rotZ`다. 버튼은 마지막으로 만진 조각에 적용한다. 돌리기 = `rotZ`, 눕히기 = `rotateAbout(cells, tipAxis(cam))`이다. 쉬움은 눕히기 버튼이 없다.
  - 판 위 조각
    - `canLift`일 때만 들기·돌리기가 된다.
    - 돌리면 바닥 중심을 유지한 채 다시 `landing`한다.
    - 안 맞으면 판 밖 마지막 자리, 없으면 트레이로 간다.
  - 풀면 `onSolved()`를 한 번 부르고, "완성!"과 실루엣 `--ok`를 보인다.
  - `active`가 false면 입력을 무시한다. 끄는 중이었다면 놓을 때 원래 자리로 돌아간다.

- [ ] **Step 1: 실패 테스트** (`useElementSize`가 0을 주므로, 1탄 `PlayerArea.test.tsx`처럼 크기를 흉내 내거나 scale 1 기준으로 계산한다)
  - 렌더: `stack-piece`가 조각 수만큼 있고 모두 `data-state="tray"`다.
  - 쉬움에는 '눕히기' 버튼이 없고, 보통에는 있다.
  - 톡하면 `data-cells`가 `rotZ` 결과로 바뀐다.
  - 조각을 누른 뒤 '눕히기'를 누르면 `rotateAbout(·, tipAxis(makeCamera(30,50)))` 결과가 된다.
  - 끌기
    - 정답 자리로 끌어 놓으면 `data-state="board"`다.
    - 판에서 먼 빈 곳에 놓으면 `"loose"`다.
    - 판 위인데 놓을 수 없는 곳이면 `"tray"`로 돌아간다(처음 끌기라 판 밖 마지막 자리가 없음).
  - 쉬움 퍼즐을 정답대로 다 놓으면 `onSolved`가 1번 불린다.
  - **Review Focus 2** `끄는 중에 active가 false가 되면 놓지 않고 원래 자리로`
  - **Review Focus 3** `위에 얹힌 조각은 돌리기·들기가 안 된다`: 아래 조각을 톡하거나 버튼을 눌러도 `data-cells`가 그대로다.
  - **Review Focus 5** `판 위에서 돌려 안 맞으면 판 밖 마지막 자리로`
  - `registry.test.ts`: `findGame('stack')`이 있고, `menuGames(GAMES, '')`에는 없다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games` → FAIL
- [ ] **Step 3: 구현** — 위 동작대로 쓴다. 끄는 중 위치는 `transform`을 직접 바꾼다. React 상태는 떨어질 자리 key가 바뀔 때만 바꾼다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`
- [ ] **Step 5: 손으로 확인(자동 세션에서 브라우저를 못 쓰면 생략하고 summary에 "손 확인 보류"라고 적는다)** — `npm run dev` → `http://localhost:5173/boardgame/?dev`. 쌓기 퍼즐 카드가 있어야 한다. 난이도 3종을 한 판씩 풀어 본다. `?dev` 없이는 카드가 없어야 한다.

**금지:**
- `getScreenCTM` 대신 `clientToSvg`를 써라. 이유: jsdom 테스트에서 동작하고 레이아웃 계산과 일치한다.
- 1탄 `PlayerArea`를 고치지 마라. 이유: 버튼 공용화는 필요할 때 따로 한다.

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 8을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
