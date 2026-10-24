# Step 5: stack-camera

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md
- /docs/ARCHITECTURE.md
- /docs/ADR.md (ADR-008)
- /docs/PRD.md
- /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-24-stack-puzzle-design.md
- /docs/superpowers/plans/2026-10-24-stack-puzzle.md (전체 계획. 이 step은 Task 5)
- `/phases/2-stack-puzzle/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- `/src/games/stack/logic/{types,pieces,rotate,board,generator}.ts`

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
- Create: `src/games/stack/ui/camera.ts`
- Test: `src/games/stack/ui/camera.test.ts`

**Interfaces:**
- Consumes: Task 3(`landing`, 타입), Task 4(`generatePuzzle`, `permutations`. 테스트에서만 쓴다)
- Produces:
  ```ts
  export type Pt = { x: number; y: number };
  /** r: 화면 오른쪽, u: 화면 위, d: 보는 사람 쪽 (월드 단위 벡터). az·el은 도 */
  export type Camera = { az: number; el: number; r: Vec3; u: Vec3; d: Vec3 };
  export const AZ0 = 30, EL0 = 50, EL_MIN = 15, EL_MAX = 85, SNAP_RADIUS = 0.9, XRAY_RADIUS = 1.3;
  export function makeCamera(az: number, el: number): Camera;
  export function project(cam: Camera, p: Vec3): Pt;            // { x: p·r, y: −(p·u) }
  export function depth(cam: Camera, p: Vec3): number;          // p·d
  export function unproject(cam: Camera, s: Pt, z: number): { x: number; y: number }; // 연속값
  export function tipAxis(cam: Camera): Vec3;                   // 눕히기 축 (설계서 §4.5)
  export function landingNear(cam: Camera, area: Area, others: Placed[], cells: Vec3[], rel: Pt, pivot: Vec3): Vec3 | null;
  export function boardOutline(cam: Camera, width: number, depth: number): Pt[];  // pivot (W/2, D/2, 0) 기준, 0~2층 상자의 화면 볼록 윤곽
  export function pointInPolygon(p: Pt, poly: Pt[]): boolean;
  export function xrayCubes(cam: Camera, toScreen: (p: Vec3) => Pt, targets: Vec3[], cubes: Vec3[]): Set<string>; // 가리는 칸의 key3
  export type Mat = number[];                                   // 3×3 행 우선
  export function rotMat(axis: Vec3, rad: number): Mat;         // 로드리게스
  export function applyMat(m: Mat, v: Vec3): Vec3;
  ```
- 식(실험에서 검증됨). a = az, t = el(라디안):
  - `r = (sin a, −cos a, 0)`
  - `u = (−sin t·cos a, −sin t·sin a, cos t)`
  - `d = (cos t·cos a, cos t·sin a, sin t)`
  - `unproject`: A = s.x, B = (s.y + z·cos t)/sin t → x = A·sin a + B·cos a, y = −A·cos a + B·sin a
  - `tipAxis`: v = 보는 방향 (cos a, sin a)에 가까운 축(|cos| ≥ |sin|이면 (sign cos a, 0, 0), 아니면 (0, sign sin a, 0)), 축 = z × v = (−v.y, v.x, 0)
  - `landingNear`
    1. z = 1, 0 순으로 그 높이 평면의 칸(`round(unproject + pivot)`)에 `landing`했을 때 l.z === z면 반환한다.
    2. 아니면 z = 0 평면 칸의 `landing`을 반환한다(null이 아니면).
    3. 아니면 각 z 평면 칸의 주변 3×3에서 놓을 수 있는 자리 중, 화면 거리 |project(l − pivot) − rel|이 가장 작고 `SNAP_RADIUS` 미만인 것을 고른다.
    4. 없으면 null이다.
  - `xrayCubes`: cubes 중 어떤 target보다 깊이가 0.01 넘게 크고(앞), 정육면체 중심의 화면 거리가 `XRAY_RADIUS` 미만인 것

- [ ] **Step 1: 실패 테스트**
  - az ∈ {0, 30, 100, 200, 300}, el 50에서 z ∈ {0,1}, x·y ∈ [−3, 3]의 격자점을 `unproject(project(p), p.z)`하면 원래 좌표다(오차 1e-9).
  - az 0~330(30° 간격)에서 `applyMat(rotMat(tipAxis(cam), π/2), {0,0,1})`과 `cam.d`의 내적이 0보다 크다(윗부분이 보는 사람 쪽으로 간다).
  - `makeCamera(30, 50).d`의 세 성분이 모두 양수다.
  - `landingNear` 통계(실험 drop-test와 같은 방식)
    - 난이도별 시드 1~60, 각 퍼즐마다 무작위 시점 6개(az 0~360, el 25~85, rng 시드 7)를 쓴다.
    - 정답을 놓을 수 있는 순서대로 하나씩 둔다. 정답 자리 화면점에 반지름 r 원 안의 무작위 오차를 더한다.
    - r = 0.2이면 맞는 자리가 99% 이상이다.
    - r = 0.5이면 null이 2% 이하이고 맞는 자리가 84% 이상이다.
    - 거리 3~4이면 null이 95% 이상이다.
  - `pointInPolygon`: `boardOutline(cam, 3, 3)` 안에 원점(판 중심)이 있고, (20, 20)은 밖이다.
  - `xrayCubes`
    - target (0,0,0)을 앞쪽 (1,1,1) 칸이 가리면 그 key가 들어 있다.
    - 뒤쪽 (−1,−1,0) 칸은 들어 있지 않다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/stack/ui/camera.test.ts` → FAIL
- [ ] **Step 3: 구현** — 위 식대로 쓴다. `boardOutline`은 상자 8꼭짓점을 투영한 점들의 볼록 껍질이다(점 8개라 간단한 gift wrapping으로 충분).
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`

**금지:** React import 금지. 이유: 순수 함수로 두어야 TDD로 검증된다.

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
3. 결과에 따라 `phases/2-stack-puzzle/index.json`의 step 5을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정을 넣어라)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
