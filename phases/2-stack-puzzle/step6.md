# Step 6: stack-scene

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 6)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- `/src/games/stack/ui/camera.ts`
- `/src/games/stack/logic/{types,rotate}.ts`

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
- Create: `src/games/stack/ui/CubeScene.tsx`, `src/games/stack/ui/CubeScene.module.css`
- Test: `src/games/stack/ui/CubeScene.test.tsx`

**Interfaces:**
- Consumes: Task 5(`Camera`, `Pt`, `depth`, `Mat`, `applyMat`), Task 3(`Vec3`, `StackPieceId`, `key3`)
- Produces:
  ```ts
  export type CubeKind = 'piece' | 'preview' | 'ghost';
  export type Xf = { M: Mat; pivot: Vec3 };   // 그릴 때만: world = pivot + M(p − pivot)
  export type SceneCube = {
    pos: Vec3; kind: CubeKind;
    group: string;            // 같은 group 안에서만 맞닿은 면을 생략
    color?: string; pieceId?: StackPieceId; selected?: boolean; xray?: boolean; xf?: Xf;
  };
  export function CubeScene(props: { cam: Camera; toScreen: (p: Vec3) => Pt; cubes: SceneCube[] }): JSX.Element;
  ```
- 규칙
  - 면 6개 중 (xf가 있으면 M을 적용한) 법선 n이 `n·cam.d > 1e-6`인 것만 그린다.
  - 같은 group에 (pos + 면 법선) 칸이 있으면 그 면을 생략한다. ghost는 xf 없는 모든 칸에 대해 생략한다.
  - 정육면체 중심(xf 적용)의 `depth` 오름차순으로 그린다.
  - 면마다 색 다각형 하나를 그리고, 음영 s = max(0, (1 − n.z)(0.24 + 0.14·(n·cam.r)))가 0.01보다 크면 `--ink` 다각형을 하나 더 겹친다(fill-opacity = s, ghost는 s × 0.4).
  - 정육면체 하나 = `<g data-piece={pieceId} class={xray ? 가림 : ''}>`
  - 클래스(CSS Modules)
    - face: 테두리 `--ink`
    - selected: 테두리를 굵게
    - preview: 진하게 붙은 미리보기, pointer-events 없음
    - ghost: `--target` 반투명 점선, pointer-events 없음, fill 속성 없음
    - xray: opacity 0.25
    - 음영 다각형: pointer-events 없음

- [ ] **Step 1: 실패 테스트** (`makeCamera(30, 50)`, `toScreen = p => project(cam, p)`)
  - 정육면체 하나 → 색 면 3개(+x, +y, +z)와 음영 다각형 2개다(윗면은 n.z = 1이라 음영 없음).
  - 같은 group으로 (0,0,0), (1,0,0)이면 색 면이 5개다.
  - group이 다르면 색 면이 6개다.
  - DOM 순서에서 (1,0,0) 정육면체의 `<g>`가 (0,0,0)보다 뒤다(앞이 나중).
  - ghost는 fill 속성이 없고 ghost 클래스가 있다.
  - `pieceId: 'L4'`이면 `data-piece="L4"`다.
  - `xray: true`이면 가림 클래스가 있다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack/ui/CubeScene.test.tsx` → FAIL
- [ ] **Step 3: 구현** — 위 규칙대로 쓴다. 꼭짓점 좌표는 소수 3자리로 자른다.
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** `filter`·`box-shadow`·그라데이션 금지. 색 하드코딩 금지. 이유: UI_GUIDE·CLAUDE.md.

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 6을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
