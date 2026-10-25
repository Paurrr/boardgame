# Step 4: bell-cards

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md (ADR-009), /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-fruit-bell-design.md
- /docs/superpowers/plans/2026-10-25-fruit-bell.md (전체 계획. 이 step은 Task 4)
- `/phases/3-fruit-bell/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/bell/logic/types.ts
- /src/games/blocks/logic/pieces.ts
- /src/games/stack/ui/MenuIcon.tsx
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
- Create: `src/games/bell/ui/FruitIcon.tsx`, `src/games/bell/ui/FruitCard.tsx`, `src/games/bell/ui/FruitCard.module.css`, `src/games/bell/ui/MenuIcon.tsx`
- Test: `src/games/bell/ui/FruitCard.test.tsx`, `src/games/bell/ui/MenuIcon.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Fruit`, `FruitCount`(Task 1), `PIECES`(`src/games/blocks/logic/pieces.ts`)
- Produces:
  - `FRUIT_COLOR: Record<Fruit, string>` — `PIECES`에서 가져온다(Global Constraints). `LEAF_COLOR = PIECES.T4.color`.
  - `FruitIcon({ fruit, x, y, size }: { fruit: Fruit; x: number; y: number; size: number })` — 가운데가 (x, y)인 `<g data-testid="fruit" data-fruit={fruit}>`. 모양은 빌더 몫이되 멀리서 구별되게: 딸기(아래가 뾰족, 위 초록 꼭지, 크림 씨), 바나나(초승달), 라임(원 + 안쪽 단면 테두리), 블루베리(원 + 위 작은 꽃받침). `--ink` 테두리.
  - `CARD_W = 100`, `CARD_H = 140`, `ICON_SIZE = 32`
  - `PIP_LAYOUT: Record<FruitCount, { x: number; y: number }[]>` = 1 `[(50,70)]`, 2 `[(30,40),(70,100)]`, 3 `[(28,36),(50,70),(72,104)]`, 4 `[(30,40),(70,40),(30,100),(70,100)]`, 5 `[(30,36),(70,36),(50,70),(30,104),(70,104)]`
  - `FruitCard({ card }: { card: Card | null })` — `<svg viewBox="0 0 100 140" data-testid="fruit-card">`. 크림 면·`--ink` 테두리 카드 위에 `PIP_LAYOUT[count]` 자리마다 `FruitIcon`. `null`이면 `--off-edge` 점선 빈 자리(`data-testid="empty-card"`). 크기는 부모를 채운다(`width/height 100%`, 비율 유지).
  - `MenuIcon()` — 바나나 2 카드와 바나나 3 카드를 살짝 겹쳐 놓은 그림(합이 5). `aria-hidden`.

- [ ] **Step 1: 실패 테스트**
  - 과일 4가지 × 개수 1~5마다 `fruit`이 개수만큼, 모두 `data-fruit`가 그 과일.
  - `null`이면 `empty-card`가 있고 `fruit`은 0개.
  - `PIP_LAYOUT`: 개수마다 점 수가 개수와 같고, 모든 점이 카드 안쪽 여백 6 이상(`ICON_SIZE/2 + 6 ≤ x ≤ CARD_W − ICON_SIZE/2 − 6`, y도 같게), 같은 카드의 두 점 거리는 `ICON_SIZE` 이상.
  - `FRUIT_COLOR.strawberry === PIECES.I3.color` 등 네 가지.
  - `MenuIcon`은 `fruit` 5개를 그린다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/bell/ui` → FAIL
- [ ] **Step 3: 구현** — CSS 색은 클래스로(`fill: var(--panel)` 등). 과일 색만 `fill` 속성에 `FRUIT_COLOR` 값을 쓴다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 새 16진수 색을 쓰지 마라. 이유: CLAUDE.md 색 규칙. 과일·잎 색은 `PIECES`에서, 나머지는 `:root` 변수로.

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
3. 결과에 따라 `phases/3-fruit-bell/index.json`의 step 4을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **300자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
