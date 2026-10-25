# Step 5: docs-rules

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md, /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-memory-design.md
- /docs/superpowers/plans/2026-10-25-memory.md (전체 계획. 이 step은 Task 5)
- `/phases/4-memory/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /docs/PRD.md
- /src/games/pairs/** (만든 파일 전부)

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
- Modify: `docs/ADR.md`(ADR-010 추가), `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/UI_GUIDE.md`, `docs/superpowers/specs/2026-10-25-memory-design.md`(상태 줄만)

**Interfaces:** 없음. 코드는 이미 있다. 문서를 코드에 맞춘다.

- [ ] **Step 1: ADR-010** — 기존 형식(결정/이유/트레이드오프). 판 하나 차례제(원작), 난이도 = 장수 + 틀린 두 장 보이는 시간, 차례 표시 = 이름을 사람 색 글씨 + 판 테두리 색 + 배너, 탭 판정(놓을 때), own 게임에 `store` 전달, 1인 기록은 뒤집기 횟수로 `recordBestTime` 재사용, id `pairs`(`memoryStore`와 헷갈림), 칠판 확인 전 `hidden`. 트레이드오프: 판 하나라 사람별 칸 규칙의 예외, 누가 누르는지 몰라 차례 아닌 사람의 탭은 못 막음.
- [ ] **Step 2: 나머지 문서**
  - ARCHITECTURE: 트리에 `src/games/pairs/`(logic: `types.ts`·`level.ts`·`game.ts`, ui: `pictures.tsx`·`Card.tsx`·`Board.tsx`·`TurnHeader.tsx`·`levelText.ts`·`PairsResult.tsx`·`PairsMatch.tsx`·`MenuIcon.tsx`), own 게임 계약에 `store`.
  - PRD: 핵심 기능에 8번 "4탄 짝 맞추기"(1~4인, 판 하나 차례제, 판 전체 난이도, 1인 최고기록, 설계·계획·ADR-010 링크).
  - UI_GUIDE: "짝 맞추기 (4탄, ADR-010)" 절 — 그림 색은 `PIECES`에서, 카드 뒷면 `--target` 면·`--ink` 테두리, 앞면 `--panel`, 빈자리 `--off-edge` 점선, 차례 글씨·판 테두리는 사람 색, 애니메이션 예외(카드 뒤집기 `FLIP_MS` scaleX 1→0→1).
  - 설계서 상태 줄: "구현 완료, 칠판 확인 전(숨김)".
- [ ] **Step 3: 검증** — `npm run lint && npm run test && npm run build` 통과.

**금지:**
- 코드를 바꾸지 마라. 이유: 이 단계는 문서만 맞춘다.
- 네 문서에 더하는 글은 모두 합쳐 1,500자를 넘기지 마라(설계서를 옮겨 적지 말고 링크하라). 이유: CLAUDE.md와 docs/*.md 전체가 매 step 프롬프트에 들어가는데 Windows 명령줄 제한이 약 32k자이고 지금 이미 약 22k자다.

## Acceptance Criteria

```bash
npm run lint && npm run test && npm run build
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트를 확인한다:
   - ARCHITECTURE.md 디렉토리 구조를 따르는가?
   - ADR(ADR-006 Chrome 99, ADR-009 own 게임, ADR-010)을 벗어나지 않았는가?
   - CLAUDE.md CRITICAL 규칙을 위반하지 않았는가? (순수 로직에 React/DOM import 없음, ES2023+ API 없음, 하드코딩 색·그림자·그라데이션 없음)
3. 결과에 따라 `phases/4-memory/index.json`의 step 5을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **250자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
