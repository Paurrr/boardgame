# Step 1: pairs-pictures

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md, /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-memory-design.md
- /docs/superpowers/plans/2026-10-25-memory.md (전체 계획. 이 step은 Task 1)
- `/phases/4-memory/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/pairs/logic/level.ts
- /src/games/bell/ui/FruitIcon.tsx
- /src/games/bell/ui/FruitCard.tsx
- /src/games/bell/ui/FruitCard.module.css
- /src/games/blocks/logic/pieces.ts
- /src/styles.css

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
- Create: `src/games/pairs/ui/pictures.tsx`, `src/games/pairs/ui/Card.tsx`, `src/games/pairs/ui/Card.module.css`, `src/games/pairs/ui/MenuIcon.tsx`
- Test: `src/games/pairs/ui/pictures.test.tsx`, `src/games/pairs/ui/Card.test.tsx`

**Interfaces:**
- Consumes: `PICTURE_COUNT`(Task 0), `PIECES`(`src/games/blocks/logic/pieces.ts`), `FruitIcon({ fruit, x, y, size })`(`src/games/bell/ui/FruitIcon.tsx`)
- Produces:
  - `PICTURE_IDS: readonly string[]` — 아래 24개, 이 순서. 번호 = `slots[i].picture`.
  - `Picture({ picture }: { picture: number })` — 0~100 상자 안에 그린 `<g data-testid="picture" data-picture={PICTURE_IDS[picture]}>`.
  - `FLIP_MS = 250`
  - `Card({ picture, faceUp, taken }: { picture: number; faceUp: boolean; taken: boolean })` — `<svg viewBox="0 0 100 100">`, 부모가 크기를 정한다(중첩 svg의 x·y·width·height).
    - `taken`: `data-testid="empty-slot"`, `--off-edge` 점선 테두리만.
    - 뒷면: `data-testid="card-back"`, `--target` 면 + `--ink` 굵은 테두리 + 단순한 무늬(`--bar`). 모든 카드가 같다.
    - 앞면: `data-testid="card-face"`, `--panel` 면 + `--ink` 테두리 + 안쪽에 `Picture`.
    - `faceUp`이 바뀌면 `FLIP_MS` 동안 scaleX 1→0→1로 뒤집힌다(중간에 면이 바뀜). `transform-box: fill-box`, 길이는 `style={{ animationDuration: \`${FLIP_MS}ms\` }}`로 넘긴다.
  - `MenuIcon()` — 같은 그림(고래) 앞면 두 장과 뒷면 한 장을 조금씩 겹친 그림. `aria-hidden`.

그림 24가지 (id 한글 · 주된 색 `PIECES` 키). 모양은 빌더 몫이되, 큰 덩어리 모양이 서로 뚜렷이 달라 2~3m에서 구별되게. 테두리는 `--ink`.
- 동물: `fish` 물고기 S4 · `turtle` 거북이 T4 · `snail` 달팽이 O4 · `chick` 병아리 L3 · `whale` 고래 I4 · `ladybug` 무당벌레 I3 · `pig` 돼지 L4 · `owl` 부엉이 P5
- 먹을 것: `strawberry` 딸기(FruitIcon) · `banana` 바나나(FruitIcon) · `carrot` 당근 O4 · `watermelon` 수박 조각 I3+T4 · `mushroom` 버섯 P5 · `broccoli` 브로콜리 L5
- 탈것: `car` 자동차 I4 · `boat` 돛단배 U5 · `rocket` 로켓 I3 · `airplane` 비행기 S4
- 물건: `umbrella` 우산 L4 · `key` 열쇠 L3 · `star` 별 O4 · `moon` 달 U5 · `heart` 하트 I3 · `house` 집 P5

- [ ] **Step 1: 실패 테스트**
  - `PICTURE_IDS` 길이가 `PICTURE_COUNT`이고 겹치지 않는다.
  - 0~23 모두 `picture`가 하나, `data-picture`가 그 id.
  - 24개를 모두 그려 `fill`·`stroke` 속성을 모으면 각각 `none`, `var(--…)`, `PIECES` 색 중 하나다(새 색 없음).
  - `Card`: `taken`이면 `empty-slot`만 있고 `picture`가 없다. `faceUp` false면 `card-back`이고 `picture` 없음. true면 `card-face` 안에 `data-picture`가 맞는 `picture`.
  - `MenuIcon`은 `picture` 2개를 그린다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/pairs/ui` → FAIL
- [ ] **Step 3: 구현** — CSS 색은 클래스로(`fill: var(--panel)` 등), 그림 색만 `fill` 속성에 `PIECES` 값을 쓴다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** 새 16진수 색, 그림자·그라데이션·필터를 쓰지 마라. 이유: CLAUDE.md 색 규칙. 과일 종치기 파일(`src/games/bell/**`)을 고치지 마라. 이유: `FruitIcon`은 가져다 쓰기만 한다.

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
3. 결과에 따라 `phases/4-memory/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **250자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
