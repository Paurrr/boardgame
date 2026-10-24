# Step 0: docs-rules

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 0)

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
- Modify: `docs/ADR.md` (ADR-008 추가), `CLAUDE.md` (예외 한 줄), `docs/PRD.md`, `docs/UI_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-12-blocks-puzzle-design.md` (§9 한 줄)

**Interfaces:** 없음. 이후 Task는 이 문서들을 지침으로 받는다. execute.py가 CLAUDE.md와 docs/*.md를 매 단계 프롬프트에 넣는다.

- [ ] **Step 1: ADR-008을 쓴다** — 기존 ADR 형식(결정/이유/트레이드오프)을 따르고, 설계서 §9 첫 항목의 내용을 담는다.
  - SVG 정사영과 자유로운 판 돌리기(WebGL 미사용)
  - 바깥 여유 칸 없음과 가까운 자리로 붙기(`SNAP_RADIUS` 0.9)
  - 쉬움의 높이가 섞인 목표(원안 0개 → 변경)
  - 트레이 0.6배와 판 밖 조각 0.6배
  - 회전 애니메이션·판 돌리기를 매 프레임 다시 그림
  - 게임별 제한시간(쌓기 퍼즐 90/120/150, 기본 120)과 게임별 최고기록
  - 칠판 확인용 숨긴 게임(`?dev`)
- [ ] **Step 2: CLAUDE.md 아키텍처 규칙의 드래그 줄 바로 아래에 한 줄을 더한다** (사용자 허락받음):
  `- 예외(쌓기 퍼즐, ADR-008): 판 돌리기·회전 애니메이션은 매 프레임 다시 그린다. 끄는 중 떨어질 자리 표시는 자리가 바뀔 때만 상태를 갱신한다`
- [ ] **Step 3: 나머지 문서를 고친다**
  - PRD: 핵심 기능에 2탄을 추가한다. "MVP 제외: 3D 우봉고"를 이 계획 링크로 바꾼다. 쌓기 퍼즐 제한시간 90/120/150초와 게임별 최고기록을 적는다.
  - UI_GUIDE: 쌓기 퍼즐 절을 추가한다.
    - 트레이·판 밖 0.6배
    - 회전 220ms(다시 투영)
    - 정육면체 음영 = 면 색 위에 `--ink`를 반투명으로 덮는다. 진하기는 (1 − n.z)(0.24 + 0.14·(n·r))
    - 빈칸은 `--target` 반투명 점선, 미리보기는 진하게, 못 놓는 끌기는 투명도 0.5, 가림은 0.25
    - 조각 색 대응 Y4←P5, R4←L5, Q4←U5
  - ARCHITECTURE: `src/games/stack/` 트리(설계서 §5.1)와 `src/lib/rects.ts`, `src/lib/devMode.ts`를 추가한다.
  - 1탄 설계서 §9의 "3D 우봉고" 줄 끝에 "→ 2탄 설계서(2026-10-24-stack-puzzle-design.md)"를 붙인다.
- [ ] **Step 4: 검증** — `npm run lint && npm run test && npm run build` 통과(문서만 바꿔 깨질 것이 없어야 한다).

**금지:** 코드를 바꾸지 마라. 이유: 이 단계는 이후 단계의 지침 문서만 맞춘다.

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
