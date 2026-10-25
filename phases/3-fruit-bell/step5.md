# Step 5: bell-lane

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md (ADR-009), /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-fruit-bell-design.md
- /docs/superpowers/plans/2026-10-25-fruit-bell.md (전체 계획. 이 step은 Task 5)
- `/phases/3-fruit-bell/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/bell/logic/types.ts
- /src/games/bell/ui/FruitCard.tsx
- /src/shell/ui/PlayLayout.tsx
- /src/shell/ui/PlayLayout.module.css
- /src/shell/ui/Match.module.css
- /src/styles.css

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
- Create: `src/games/bell/ui/notice.ts`, `src/games/bell/ui/Lane.tsx`, `src/games/bell/ui/Lane.module.css`
- Test: `src/games/bell/ui/notice.test.ts`, `src/games/bell/ui/Lane.test.tsx`

**Interfaces:**
- Consumes: `Card`, `RingResult`(Task 1), `FruitCard`(Task 4)
- Produces:
  ```ts
  // notice.ts (순수)
  export type Notice = { text: string; tone: 'ok' | 'warn' | 'plain' };
  export function noticeFor(ring: RingResult, player: number, names: readonly string[]): Notice | null;
  // Lane.tsx
  export type LaneProps = {
    name: string; color: string; top: Card | null; downCount: number;
    isTurn: boolean; canFlip: boolean; out: boolean; notice: Notice | null; gained: boolean;
    onFlip: (e: React.PointerEvent) => void;
    onBellDown: (e: React.PointerEvent) => void; onBellUp: (e: React.PointerEvent) => void; onBellCancel: (e: React.PointerEvent) => void;
  };
  export function LaneHead(props: LaneProps);  // PlayLayout의 header
  export function LaneBody(props: LaneProps);  // PlayLayout의 body
  ```
- `noticeFor` 문구(정확히):
  - 맞음, 친 사람 칸: `` `${이름} 먼저! +${gained}장` `` tone `ok` / 다른 칸: `` `${이름} 먼저!` `` tone `plain`
  - 틀림, 친 사람 칸: `` `${이름} 틀렸어요 −${paidTo.length}장` ``(U+2212) tone `warn` / `paidTo`에 든 칸: `'+1장'` tone `plain` / 그 밖: `null`
- `LaneHead`: 색 블록 + 이름 줄, 상태 글자(탈락이면 '탈락', 차례면 '차례!'), 그 아래 `FruitCard card={top}`가 남은 높이를 채운다. 새 카드는 등장 애니메이션(180ms, 키는 빌더 몫).
- `LaneBody`: 위에서부터 알림 줄(`notice`, 없으면 같은 높이 빈 줄 — 칸이 흔들리지 않게), 뒤집기 버튼, 종. 아래 여백 1.5rem 이상.
  - 뒤집기: `<button>` 이름에 '뒤집기'와 `` `${downCount}장` ``. `canFlip`이면 `--accent` 면, 아니면 `--off` 면·`aria-disabled="true"`. `pointerdown`에서 `canFlip`일 때만 `onFlip(e)`. `gained`면 장수가 300ms 확대·축소. 높이 72px 이상.
  - 종: `<button aria-label="종">` 안에 종 SVG(`--pressed` 면, `--ink` 테두리)와 글자 '종'. `pointerdown`/`pointerup`/`pointercancel`을 각각 넘긴다. `out`이면 `disabled`이고 아무것도 넘기지 않는다. 지름 120px 이상.

- [ ] **Step 1: 실패 테스트**
  - `noticeFor`: 위 다섯 경우 문구·tone 그대로.
  - `Lane`: `canFlip`이면 뒤집기 `pointerdown` → `onFlip` 1번, 아니면 `aria-disabled="true"`이고 안 부른다. 뒤집기 이름에 '14장'.
  - 종 `pointerdown`·`pointerup`·`pointercancel` → 각 콜백 1번. `out`이면 종이 `disabled`, 콜백 0번, 머리에 '탈락'.
  - `top`이 있으면 머리에 `fruit-card`, `null`이면 `empty-card`. `isTurn`이면 '차례!'.
  - `notice` tone `ok`/`warn`이면 각각 다른 클래스.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/bell/ui` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** Lane에 규칙 판단(누가 차례인지, 5인지)을 넣지 마라. 이유: Lane은 받은 값을 그리기만 하고, 판단은 logic과 BellMatch가 한다.

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
3. 결과에 따라 `phases/3-fruit-bell/index.json`의 step 5을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **300자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
