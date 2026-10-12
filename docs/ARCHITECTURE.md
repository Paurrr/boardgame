# 아키텍처

## 디렉토리 구조
```
src/
├── main.tsx, App.tsx      # 진입점, 화면 전환
├── shell/                 # 모든 게임이 공유하는 공통 셸
│   ├── logic/             # 순수 TS: 판 진행 상태 기계(reducer), 점수 집계, 설정 저장
│   └── ui/                # GameMenu, PlayerSetup, PlayLayout(칸 분할), TopBar, RoundResult, FinalResult
├── games/
│   ├── registry.ts        # 게임 목록 (GameModule[])
│   └── blocks/            # 블록 퍼즐 (우봉고 스타일)
│       ├── index.ts       # GameModule 정의
│       ├── logic/         # 순수 TS: pieces, transform, board, generator, solver
│       └── ui/            # PlayerArea, PuzzleBoard, PieceTray, PieceView (SVG)
└── lib/                   # random(시드 난수), usePointerDrag, sound(WebAudio), fullscreen
public/check.html          # 기기 진단 페이지 (ES5, 빌드 미경유)
```
테스트 파일은 대상 옆에 `*.test.ts(x)`로 둔다.

## 패턴
- **셸 + 게임 모듈**: 셸이 메뉴·설정·칸 분할·라운드·타이머·점수를 맡고, 게임은 플레이어 칸 하나(`PlayerArea`)만 책임진다. 게임은 풀었을 때 `onSolved()`만 호출한다.
  ```ts
  type GameModule = {
    id: string; name: string; minPlayers: number; maxPlayers: number;
    PlayerArea: React.FC<{ difficulty: Difficulty; seed: number; active: boolean; onSolved: () => void }>;
  };
  ```
  턴제 등 이 계약에 맞지 않는 게임은 그 게임을 추가할 때 셸을 확장한다.
- **로직/UI 분리**: 규칙은 `logic/`의 순수 함수(React·DOM 의존 금지)로, UI는 `ui/`의 React 컴포넌트로 둔다. 로직은 Vitest로 TDD 한다.
- **시드 기반 재현성**: 퍼즐은 `createRng(seed)`로 생성한다. 플레이어별 시드는 `deriveSeed(gameSeed, round, playerIndex)`.

## 데이터 흐름
```
PlayerSetup ─(MatchConfig)→ matchReducer ─(라운드·시드·active)→ PlayLayout
                                  ↑                                  │
                       SOLVED(playerIndex, time)          PlayerArea × N (각 칸 독립)
                       TICK / TIME_UP / NEXT_ROUND  ←── onSolved() ──┘
matchReducer ─(roundPoints, 총점)→ RoundResult / FinalResult
```

## 상태 관리
- 판 진행(단계·라운드·해결 순서·점수)은 `shell/logic`의 순수 reducer + `useReducer`.
- 남은 시간은 라운드 시작 시각 기준으로 계산하고 화면 갱신 주기에 맞춰 표시한다.
- 각 칸의 퍼즐 상태(조각 위치·방향)는 `PlayerArea` 내부 상태. 드래그 중 좌표는 상태로 올리지 않고 SVG 요소의 `transform`을 직접 갱신, 놓을 때만 커밋한다.
- 영속 데이터는 `localStorage`만 사용 (마지막 설정, 1인 최고기록). 접근은 try/catch로 감싸고 실패해도 동작해야 한다.
