# Step 3: stack-logic

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 3)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인

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
- Create: `src/games/stack/logic/{types,pieces,rotate,board}.ts`
- Test: `src/games/stack/logic/{pieces,rotate,board}.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Vec3 = { x: number; y: number; z: number };
  export type Cell2 = { x: number; y: number };
  export type StackPieceId = 'I3' | 'L3' | 'I4' | 'O4' | 'T4' | 'L4' | 'S4' | 'Y4' | 'R4' | 'Q4';
  /** width×depth = 바닥 바운딩박스(여유 칸 없음). target = 채워야 할 3D 칸. inside = 쉬움 놓기 방식 */
  export type Area = { width: number; depth: number; target: Vec3[]; inside: boolean };
  export type Placed = { id: StackPieceId; cells: Vec3[]; at: Vec3 };
  export type Puzzle = { area: Area; pieces: { id: StackPieceId; cells: Vec3[] }[]; solution: Placed[] };
  export const MAX_H = 2;
  ```
- `pieces.ts`:
  - `STACK_PIECES: Record<StackPieceId, { cells: Vec3[]; color: string }>`
    - I3~S4는 1탄 `PIECES`의 cells에 z = 0을 붙인 것이다.
    - Y4 `(0,0,0)(1,0,0)(0,1,0)(0,0,1)`
    - R4 `(0,0,0)(1,0,0)(1,1,0)(1,1,1)`
    - Q4 `(0,1,0)(1,1,0)(1,0,0)(1,0,1)`
    - 색은 1탄에서 import한다. Y4←P5, R4←L5, Q4←U5.
  - `STACK_IDS`, `PLANAR_IDS = ['I3','L3','I4','O4','T4','L4','S4']`
- `rotate.ts`:
  - `key3(c): string`
  - `normalize(cells): Vec3[]` — 최소 좌표를 0으로 하고, (z, y, x) 순으로 정렬
  - `rotZ(cells)` — (x, y, z) → (−y, x, z) 후 정규화
  - `rotateAbout(cells, axis: Vec3)` — 정수 단위 축 둘레 +90°(오른손). v' = k × v + (k·v)k 후 정규화
  - `orientations(cells, zOnly = false): Vec3[][]` — 서로 다른 방향만
  - `heightOf(cells)`, `sizeOf(cells): { w; d }`
  - `centerOf(cells): Vec3` — (w/2, d/2, h/2)
- `board.ts`:
  - `dropZ(cells, ax, ay, others: Placed[]): number` — 기둥별 최고 높이 기준. 위에서 떨어져 처음 닿는 곳
  - `landing(area, others, cells, ax, ay): Vec3 | null`
    - z + 높이 > MAX_H면 null
    - inside면 모든 정육면체가 target 안이어야 한다
    - 아니면 0 ≤ x < width, 0 ≤ y < depth
  - `canLift(placed, id): boolean` — 같은 기둥에서 더 높은 곳에 다른 조각이 있으면 false
  - `isSolved(area, placed): boolean` — 놓인 정육면체 집합 == target 집합
  - `footprintOf(target): Cell2[]`

- [ ] **Step 1: 실패 테스트**
  - `orientations` 개수: 전체 / 높이 ≤ 2 / zOnly

    | 조각 | 전체 | 높이 ≤ 2 | zOnly |
    |---|---|---|---|
    | I3 | 3 | 2 | 2 |
    | L3 | 12 | 12 | 4 |
    | I4 | 3 | 2 | 2 |
    | O4 | 3 | 3 | 1 |
    | T4 | 12 | 8 | 4 |
    | L4 | 24 | 16 | 4 |
    | S4 | 12 | 8 | 2 |
    | Y4 | 8 | 8 | 4 |
    | R4 | 12 | 12 | 4 |
    | Q4 | 12 | 12 | 4 |

  - `rotZ` 4번 = 정규화한 원래 모양이다. `rotateAbout(c, {x:1,y:0,z:0})` 4번 = 원래 모양이다. `rotateAbout(c, {x:0,y:0,z:1})` = `rotZ(c)`이다.
  - Q4는 `orientations(R4)`에 없다.
  - `dropZ`
    - 빈 판이면 0이다.
    - O4 위에 I3를 떨어뜨리면 1이다.
    - 떠 있는 정육면체 밑으로는 못 들어간다. (0,0)에 z = 1 정육면체가 있으면 그 기둥에 떨어지는 조각은 2다.
  - `landing`: 높이 2짜리 조각이 z = 1에 떨어지면 null이다. inside에서 target 밖이면 null이다. free에서 바운딩박스 밖이면 null이다.
  - `canLift`: 아래 조각은 false, 위 조각은 true다.
  - `isSolved`: target 밖 정육면체가 하나라도 있으면 false다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack/logic` → FAIL
- [ ] **Step 3: 구현** — 시그니처대로 쓴다. `orientations`는 `rotZ`와 `rotateAbout(·, x축)`으로 BFS를 돌며 `normalize`한 key로 중복을 거른다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** React·DOM import 금지. 이유: CLAUDE.md CRITICAL(로직 순수 TS).

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
