# 아키텍처

## 디렉토리 구조
```
.github/workflows/deploy.yml     # lint·test·build 후 GitHub Pages 배포
index.html  vite.config.ts  tsconfig.json  eslint.config.js  package.json
public/check.html                # 기기 진단 페이지 (ES5, 빌드 미경유)
src/
├── main.tsx  App.tsx  App.test.tsx  styles.css   # 진입점, 화면 전환, 전역 스타일(:root 색 변수, .btn 등)
├── checkPage.test.ts            # check.html 검증
├── test/setup.ts                # jest-dom, cleanup, PointerEvent 대용
├── lib/                         # 게임 무관 공통 도구
│   ├── difficulty.ts            # Difficulty 타입·라벨
│   ├── random.ts                # 시드 난수, 시드 파생
│   ├── gesture.ts               # 탭/끌기 판정 기준
│   ├── usePointerDrag.ts        # 손가락별 끌기·탭 훅
│   ├── useElementSize.ts        # 요소 크기 측정
│   ├── storage.ts               # localStorage 래퍼
│   ├── sound.ts                 # WebAudio 합성음
│   ├── fullscreen.ts            # 전체화면 (webkit 접두사 포함)
│   ├── rects.ts                 # 사각형 계산 (판 밖 조각을 둘 빈 영역 등, 게임 공용)
│   └── devMode.ts               # 주소의 ?dev 표시 확인 (숨긴 게임 노출)
├── games/
│   ├── types.ts                 # GameModule, PlayerAreaProps (셸↔게임 계약)
│   ├── registry.ts              # 게임 목록
│   ├── blocks/
│       ├── index.ts             # blocksGame: GameModule
│       ├── logic/               # 순수 TS
│       │   ├── types.ts         # Cell, PieceId, Orientation, Placement, Puzzle, BoardArea, PlaceMode
│       │   ├── shape.ts         # 정규화, 크기, 연결, 구멍, 테두리
│       │   ├── transform.ts     # 회전·뒤집기·방향
│       │   ├── pieces.ts        # 조각 10종
│       │   ├── board.ts         # 판 영역, 놓기 규칙, 판 걸침 판정, 정답 판정, 제자리 회전
│       │   ├── solver.ts        # 검증용 백트래킹 솔버
│       │   ├── generator.ts     # 퍼즐 생성기
│       │   └── play.ts          # 칸 하나의 조각 상태 변화(놓기·돌리기·뒤집기)
│       └── ui/
│           ├── layout.ts        # SVG 안 판·버튼 줄·트레이 배치와 판 밖 조각을 둘 빈 영역 계산
│           ├── MenuIcon.tsx     # 메뉴 카드 그림 (GameModule.Icon)
│           ├── PieceView.tsx    # 조각 하나
│           ├── PlayerArea.tsx   # 플레이어 칸 하나 (GameModule.PlayerArea)
│           └── PlayerArea.module.css  # 칸·조각·판 버튼 스타일 (MenuIcon도 함께 씀)
│   └── stack/                   # 2탄 쌓기 퍼즐 (3D, ADR-008)
│       ├── index.ts             # stackGame: GameModule (id 'stack', 1~4인)
│       ├── logic/               # 순수 TS
│       │   ├── types.ts         # Vec3, StackPieceId, Area, Placed, Puzzle
│       │   ├── pieces.ts        # 조각 10종 정의·색
│       │   ├── rotate.ts        # normalize, rotZ, 축 회전(눕히기), orientations
│       │   ├── board.ts         # dropZ, landing, canLift, isSolved
│       │   ├── solver.ts        # solveStack, buildable
│       │   └── generator.ts     # generatePuzzle(rng, difficulty)
│       └── ui/
│           ├── camera.ts        # 순수 TS: makeCamera, project, unproject, tipAxis, landingNear
│           ├── layout.ts        # 판·버튼 줄·트레이 배치 (순수 TS)
│           ├── CubeScene.tsx    # 정육면체 묶음 그리기 (면 선택·음영·깊이 정렬)
│           ├── PlayerArea.tsx   # 판·버튼·트레이, 끌기·돌리기·판 돌리기
│           └── MenuIcon.tsx     # 메뉴 카드 그림
└── shell/
    ├── logic/
    │   ├── match.ts             # 판 진행 reducer, 점수, 남은 시간, 시드
    │   ├── setup.ts             # 설정 기본값·정리
    │   ├── persistence.ts       # 설정·최고기록 저장/불러오기
    │   └── format.ts            # 시간 표시
    └── ui/
        ├── colors.ts            # 플레이어 색
        ├── PlayLayout.tsx/.module.css   # 가로 칸 분할 (위 1/3 정보, 아래 2/3 조작)
        ├── GameMenu.tsx/.module.css
        ├── PlayerSetup.tsx/.module.css
        ├── TopBar.tsx           # 라운드·시간·소리·전체화면·그만하기
        ├── Match.tsx/.module.css        # 카운트다운·플레이·라운드 결과
        └── FinalResult.tsx/.module.css
```
테스트 파일은 대상 옆에 `*.test.ts(x)`로 둔다.

## 패턴
- **셸 + 게임 모듈**: 셸이 메뉴·설정·칸 분할·라운드·타이머·점수를 맡고, 게임은 플레이어 칸 하나(`PlayerArea`)만 책임진다. 게임은 풀었을 때 `onSolved()`만 호출한다.
  ```ts
  type GameModule = {
    id: string; name: string; description: string; minPlayers: number; maxPlayers: number;
    PlayerArea: React.FC<{ difficulty: Difficulty; seed: number; active: boolean; onSolved: () => void }>;
    Icon?: React.FC;  // 메뉴 카드에 곁들이는 작은 그림 (없어도 된다)
  };
  ```
  턴제 등 이 계약에 맞지 않는 게임은 그 게임을 추가할 때 셸을 확장한다.
- **로직/UI 분리**: 규칙은 `logic/`의 순수 함수(React·DOM 의존 금지)로, UI는 `ui/`의 React 컴포넌트로 둔다. 로직은 Vitest로 TDD 한다.
- **시드 기반 재현성**: 퍼즐은 `createRng(seed)`로 생성한다. 플레이어별 시드는 `deriveSeed(gameSeed, round, playerIndex)`.

## 데이터 흐름
```
PlayerSetup ─(MatchConfig)→ matchReducer ─(라운드·시드·active)→ PlayLayout
                                  ↑                                  │
                       START_ROUND / SOLVED(player, now)  PlayerArea × N (각 칸 독립)
                       TIME_UP / NEXT_ROUND  ←───────── onSolved() ──┘
matchReducer ─(roundPoints, 총점)→ 라운드 결과(Match 안) / FinalResult
```

## 상태 관리
- 판 진행(단계·라운드·해결 순서·점수)은 `shell/logic`의 순수 reducer + `useReducer`.
- 남은 시간은 라운드 시작 시각 기준으로 계산하고 화면 갱신 주기에 맞춰 표시한다.
- 판 시계는 끝난 라운드 길이의 합(`usedMs`)으로 계산한다. 카운트다운과 라운드 결과 동안에는 더하지 않으므로 시계가 멈춘다.
- 이번 라운드에 쓸 수 있는 시간(라운드 예산)은 라운드마다 방식이면 제한시간, 판 전체 방식이면 남은 판 시간이다(ADR-007).
- 최종 순위는 `shell/logic`의 순수 함수 `standings`가 총점, 그다음 총 걸린 시간으로 정한다.
- 각 칸의 퍼즐 상태(조각 위치·방향)는 `PlayerArea` 내부 상태. 드래그 중 좌표는 상태로 올리지 않고 SVG 요소의 `transform`을 직접 갱신, 놓을 때만 커밋한다.
- 판 밖에 둔 자리와 그리는 순서는 규칙과 무관한 화면 상태라 `PlayerArea`에만 둔다. logic의 `PieceState.at`은 판 밖이면 `null`일 뿐이다.
- 영속 데이터는 `localStorage`만 사용 (마지막 설정, 1인 최고기록). 접근은 try/catch로 감싸고 실패해도 동작해야 한다.
