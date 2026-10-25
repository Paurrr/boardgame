# Step 2: pairs-board

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md, /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-memory-design.md
- /docs/superpowers/plans/2026-10-25-memory.md (전체 계획. 이 step은 Task 2)
- `/phases/4-memory/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/pairs/logic/types.ts
- /src/games/pairs/ui/Card.tsx
- /src/lib/usePointerDrag.ts
- /src/lib/gesture.ts
- /src/shell/ui/colors.ts
- /src/shell/ui/PlayLayout.module.css (위 1/3·아래 2/3 비율)

이전 step에서 만들어진 코드를 꼼꼼히 읽고, 설계 의도를 이해한 뒤 작업하라.

## 공통 제약 (모든 step)

- 칠판 Chrome 99. CSS nesting·container query·`:has()`·`oklch()/color-mix()` 금지. JS는 ES2022까지(`toSorted` 등 금지, 정렬은 `slice().sort()`). 폴리필 없음.
- 게임 규칙·진행 로직(`src/games/*/logic`, `src/shell/logic`)은 React/DOM 의존 금지.
- TDD: 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 커밋은 conventional commits다(execute.py가 단계마다 커밋한다).
- 색은 `src/styles.css`의 `:root` 변수와 기존 상수만 쓴다. 그림 색은 `src/games/blocks/logic/pieces.ts`의 `PIECES[…].color`, 사람 색은 `src/shell/ui/colors.ts`의 `PLAYER_COLORS`. 새 16진수 색 금지. 그림자·글로우·그라데이션·필터 금지. 두께는 아래 테두리로 낸다. 애니메이션은 `transform`·`opacity`만.
- 공개 명칭은 "짝 맞추기", id는 `pairs`, 폴더는 `src/games/pairs/`. 원작 상표·그림을 쓰지 않는다. 그림에 이름 글자를 쓰지 않는다.
- 화면: 맨 위 `TopBar`, 그 아래 위쪽 1/3에 차례 표시, 아래쪽 2/3에 판. 판 아래 여백 1.5rem 이상. 칠판(1280×720) 어려움(6×8)에서 카드 한 변 56 CSS px 이상, 스크롤 없음.
- 터치는 Pointer Events. 카드는 탭(`src/lib/usePointerDrag.ts`의 `onTap`, 기준 `isTap` 300ms 미만·10px 미만)으로 뒤집는다. 멀티터치 판단에 `navigator.maxTouchPoints`를 쓰지 않는다.
- 숫자: 쉬움 4×4·3000ms, 보통 4×8·2000ms, 어려움 6×8·1000ms. 그림 24가지(`PICTURE_COUNT`). 뒤집기 애니메이션 `FLIP_MS` 250, 맞춘 두 장 보여 주기 `MATCH_SHOW_MS` 600, 배너 `BANNER_MS` 1000, 끝난 뒤 결과까지 `END_SHOW_MS` 1000. 틀린 두 장은 `FLIP_MS + showMs` 뒤에 엎는다. 인원 1~4명.

## 작업

**Files:**
- Create: `src/games/pairs/ui/Board.tsx`, `src/games/pairs/ui/Board.module.css`, `src/games/pairs/ui/TurnHeader.tsx`, `src/games/pairs/ui/TurnHeader.module.css`
- Test: `src/games/pairs/ui/Board.test.tsx`, `src/games/pairs/ui/TurnHeader.test.tsx`

**Interfaces:**
- Consumes: `Slot`(Task 0), `Card`(Task 1), `usePointerDrag`(`src/lib/usePointerDrag.ts`), `PLAYER_COLORS`
- Produces:
  ```ts
  export type BoardProps = {
    rows: number; cols: number; slots: readonly Slot[]; open: readonly number[];
    /** 판 테두리 색 = 지금 차례인 사람 색 */
    color: string;
    /** 칸을 탭하면 그 칸 번호. 뒤집을 수 있는지는 부르는 쪽(reducer)이 판단한다 */
    onTap: (index: number) => void;
  };
  export function Board(props: BoardProps);
  export type TurnHeaderProps = {
    names: readonly string[]; pairs: readonly number[]; turn: number;
    /** 1인일 때만 쓴다 */
    tries: number; totalPairs: number;
  };
  export function TurnHeader(props: TurnHeaderProps);
  ```
- `Board`: `<svg data-testid="board">`, viewBox는 칸 크기 100·간격 8·안쪽 여백 16으로 계산하고 `preserveAspectRatio="xMidYMid meet"`, 크기 100%로 부모를 채운다(카드는 정사각형). 칸마다 `<g data-testid="slot" data-index={i}>` 안에 중첩 svg로 `Card`(`faceUp = open.includes(i)`, `taken = takenBy !== null`). 테두리 `<rect data-testid="board-frame" stroke={color} fill="none">`(굵게, 아래쪽을 더 두껍게).
  - 탭: 칸 `pointerdown`에서 `begin(e, i, svg)`, svg의 `pointermove`/`pointerup`/`pointercancel`에서 `move`/`end`/`cancel`. `onTap(i)`만 쓰고 끌기 콜백은 아무것도 하지 않는다.
- `TurnHeader`
  - 2명 이상: 왼쪽에 색 칩 + `` `${names[turn]} 차례` ``(글자색 `PLAYER_COLORS[turn]`, 2.4rem 이상). 오른쪽에 사람마다 색 칩·이름·`` `${pairs[i]}쌍` ``. 차례인 사람의 항목은 `aria-current="true"`이고 아래 테두리를 그 사람 색으로 두껍게.
  - 1명: `` `찾은 짝 ${pairs[0]}/${totalPairs}` ``와 `` `${tries}번` ``. '차례' 글자는 없다.

- [ ] **Step 1: 실패 테스트** — `vi.useFakeTimers()`(usePointerDrag가 `Date.now()`를 쓴다). 탭은 같은 `pointerId`·좌표로 `pointerDown` 뒤 바로 `pointerUp`.
  - 4×4 → `slot` 16개. `open [2, 5]`면 `card-face` 2개, `takenBy`가 있는 칸은 `empty-slot`.
  - 5번 칸 탭 → `onTap(5)` 1번.
  - `오래 누르거나 끌면 뒤집지 않는다` (Review Focus 2): `pointerDown` → 400ms 진행 → `pointerUp`은 0번. 20px 움직인 뒤 떼도 0번.
  - `board-frame`의 `stroke`가 `color`.
  - `TurnHeader`: 이름 `['민수', '지우']`, `turn 1` → '지우 차례'의 글자색이 `PLAYER_COLORS[1]`, 항목 2개 중 지우 항목만 `aria-current`, '3쌍'(pairs `[3, 0]`). 1명 → '찾은 짝 3/8', '5번', '차례' 없음.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/pairs/ui` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** Board·TurnHeader에 규칙 판단(뒤집어도 되는지, 누가 차례인지)을 넣지 마라. 이유: 받은 값을 그리기만 하고 판단은 reducer와 PairsMatch가 한다.

## Acceptance Criteria

```bash
npm run lint && npm run test && npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR(ADR-006 Chrome 99, ADR-009 own 게임)을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (순수 로직에 React/DOM import 없음, ES2023+ API 없음, 하드코딩 색·그림자·그라데이션 없음)
3. 결과에 따라 `phases/4-memory/index.json`의 step 2을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **250자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
