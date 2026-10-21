# 설계: 전자칠판용 보드게임 웹앱 — 1탄 "블록 퍼즐"

- 작성일: 2026-10-12
- 상태: 사용자 리뷰 대기
- 범위: 공통 셸 + 첫 게임 "블록 퍼즐"(우봉고 스타일) MVP

## 1. 배경과 목표

집에 있는 7~8년 된 LG 전자칠판에서 아이들과 보드게임을 하고 싶다. 칠판에는 Play Store가 없어 앱 설치가 어렵지만 인터넷과 웹 브라우저는 된다. 같은 시기 LG 전자칠판(TR3BF 계열)의 공개 사양은 Android 8.0 + 내장 Chrome, 4K(3840×2160), 최대 20점 멀티터치다. 실제 기기 사양은 진단 페이지로 확인한다(§7). 2026-10-14 실측 결과 실제 기기는 55TR3DK, Android 11 + 내장 Chrome 99, 1280×720 CSS px @ DPR 3, 동시 터치 17점이었다(ADR-006).

**목표**: 칠판 브라우저에서 주소만 열면 1~4명이 함께 즐길 수 있는 우봉고 스타일 퍼즐 게임을 만들고, 이후 다른 보드게임을 같은 앱에 계속 추가할 수 있는 구조를 갖춘다.

**성공 기준**
- 칠판에서 URL로 접속해 설치 없이 플레이할 수 있다.
- 2~4명이 각자 자기 칸에서 동시에 조각을 끌어도 서로 방해받지 않는다.
- 나이 차가 큰 아이들이 각자 맞는 난이도로 한 판(여러 라운드)을 끝까지 즐길 수 있다.
- 게임을 하나 더 추가할 때 공통 화면(메뉴·플레이어 설정·라운드·점수)을 다시 만들지 않아도 된다.

## 2. 사용자 결정 사항

| 항목 | 결정 |
|---|---|
| 플랫폼 | 웹 (정적 SPA, 서버 없음) |
| 기술 | Vite + React + TypeScript, 게임 화면은 SVG, 칠판 Chrome 99 대상 빌드(ADR-006) |
| 배포 | GitHub Pages (공개 저장소) + GitHub Actions 자동 배포, 주소 `paurrr.github.io/boardgame` |
| 인원 | 1~4인. 1인 = 타임어택, 2~4인 = 동시 대결 |
| 난이도 | 플레이어마다 따로 선택 |
| 진행 | 라운드제 + 점수 |
| 놓기 방식 | 쉬움은 목표 모양 안에만 놓을 수 있음. 보통·어려움은 원작처럼 판 위 어디든(겹침만 금지). 퍼즐판에는 실루엣만 보이고 조각 경계는 보이지 않음 |
| 이름 | 앱 이름 "우리집 보드게임", 게임 이름 "블록 퍼즐". "우봉고"는 KOSMOS 상표이므로 공개 명칭에 쓰지 않고 원작 카드도 복제하지 않는다 |

## 3. 게임 규칙 — 블록 퍼즐

### 3.1 조각 세트
자체 정의 폴리오미노 10종이다. 플레이어마다 한 벌씩 가지며, 조각마다 고유한 색이 있다.

| 종류 | 조각 |
|---|---|
| 트로미노(3칸) | I3, L3 |
| 테트로미노(4칸) | I4, O4, T4, L4, S4 |
| 펜토미노(5칸) | P5, L5, U5 |

J·Z 같은 거울상은 별도 조각으로 두지 않는다. L4·S4 등을 뒤집어서 만든다.

### 3.2 난이도
| 난이도 | 조각 수 | 조각 풀 | 뒤집기 | 목표 모양 최대 크기 | 놓기 방식(§3.4) | 대상 |
|---|---|---|---|---|---|---|
| 쉬움 | 2~3 | 트로미노·테트로미노 | 사용 안 함 | 5×4 | 모양 안에만 | 5~6세 |
| 보통 | 3 | 전체(펜토미노 최대 1개) | 사용 | 5×5 | 자유(원작식) | 7~9세 |
| 어려움 | 4 | 전체 | 사용 | 6×5 | 자유(원작식) | 10세+ |

최대 크기 수치는 조정 가능한 상수다.

### 3.3 퍼즐 생성
시드 기반 난수를 쓰므로 같은 시드면 같은 퍼즐이 나온다.

1. 난이도의 조각 풀에서 서로 다른 조각 N개를 고른다.
2. 첫 조각을 원점에 놓는다. 나머지 조각은 무작위 방향(쉬움은 회전 4방향, 그 외는 회전+뒤집기 8방향)과 위치로 놓되, 기존 칸과 변으로 맞닿고 겹치지 않게 한다.
3. 놓인 칸의 합집합이 목표 모양이다. 구멍(사방이 막힌 빈칸)이 있거나 최대 크기를 넘으면 버린다.
4. 유효 후보를 여러 개(예: 20개) 만든 뒤 바운딩박스 채움률(칸 수 ÷ 가로×세로)이 가장 높은 반듯한 모양을 고른다.
5. 결과는 `{ target, pieceIds, solution }`이다. 플레이어에게는 정확히 그 조각들만 기본 방향으로 지급한다.

조각을 실제로 배치해서 만든 모양이므로 항상 풀 수 있다. 쉬움은 회전만으로 만들었으므로 뒤집기 없이 풀린다.

### 3.4 퍼즐판, 놓기, 정답 판정

**퍼즐판 표시**
- 퍼즐판에는 목표 모양의 **바깥 테두리(실루엣)만** 굵게 그린다. 원작 카드와 같다.
- 정답 배치를 드러내는 조각 경계선이나 영역별 색 구분은 **절대 그리지 않는다**.
- 맞춤을 돕기 위해 옅은 칸 격자선을 그릴 수 있다. 이 선은 모든 칸에 똑같이 그려서 조각 경계와 구분되지 않게 한다.
- 퍼즐판 격자는 목표 모양의 바운딩박스에 사방 여유 칸을 더한 영역이다(쉬움 0칸, 보통·어려움 2칸). 여유 칸은 목표 칸보다 옅게 그린다.

**놓기 방식 (난이도별)**
| 방식 | 난이도 | 판 위에 놓이는 조건 |
|---|---|---|
| 모양 안에만 (`inside`) | 쉬움 | 조각의 모든 칸이 목표 모양 안에 있고, 다른 조각과 겹치지 않음 |
| 자유 (`free`) | 보통·어려움 | 조각의 모든 칸이 퍼즐판 격자(여유 칸 포함) 안에 있고, 다른 조각과 겹치지 않음. 목표 모양 밖으로 삐져나와도 놓인다 |

- 조각은 퍼즐판 격자에 칸 단위로 맞춰 놓는다.
- 조건을 만족하지 않으면 그 조각을 판 밖에 마지막으로 둔 자리로 돌아간다. 한 번도 옮기지 않았으면 처음 트레이 자리로 간다.
- `inside` 방식은 어린아이가 헷갈리지 않게 하는 대신 실물보다 약간 힌트가 된다. 삐져나가는 배치를 시도할 수 없기 때문이다. `free` 방식은 실물처럼 걸쳐 놓고 맞춰볼 수 있다.

**정답 판정 (두 방식 공통)**
- 목표 칸이 전부 덮이고, 목표 밖에 놓인 조각 칸이 하나도 없으면 즉시 정답 처리한다.
- 겹침은 놓기 단계에서 이미 막혀 있다.

### 3.5 라운드와 점수
- 라운드 시작 전 "3, 2, 1" 카운트다운을 하고 전원이 동시에 시작한다.
- 제한시간(기본 90초, 60/90/120초 선택)이 끝나거나 전원이 풀면 라운드가 끝난다.
- 점수: 1등 3점, 2등 2점, 그 외 해결 1점, 미해결 0점. 같은 순간에 푼 경우는 없다고 보고 먼저 판정된 쪽을 앞 순위로 친다.
- 라운드가 끝나면 결과(누가 몇 점)를 보여주고, "다음 라운드" 버튼으로 진행한다.
- 한 판은 기본 5라운드(3/5/9 선택)다. 총점 최고가 우승이고, 동점이면 공동 우승이다.
- 플레이어별 퍼즐 시드는 `(게임 시드, 라운드, 플레이어 번호)`에서 파생한다. 같은 난이도여도 서로 다른 퍼즐을 받는다.
- 2026-10-21 변경: 빠르기 보너스·판 전체 타임어택·총 시간 동점 처리 → docs/ADR.md ADR-007

### 3.6 1인 모드 (타임어택)
- 진행은 같다(라운드·제한시간). 문제별 소요 시간을 보여준다.
- 난이도별 "한 문제 최단 시간"을 `localStorage`에 저장하고, 기록을 깨면 "새 기록!"을 표시한다.
- 2026-10-21 변경: 빠르기 보너스·판 전체 타임어택·총 시간 동점 처리 → docs/ADR.md ADR-007

## 4. 화면과 조작

### 4.1 화면 흐름
`게임 메뉴` → `플레이어 설정` → (`카운트다운` → `플레이` → `라운드 결과`) × 라운드 수 → `최종 결과` → 메뉴 또는 다시 하기

- **게임 메뉴**: 게임 카드 목록(지금은 블록 퍼즐 1개). 하단에 작게 "기기 확인" 링크(`check.html`)를 둔다.
- **플레이어 설정**: 인원(1~4), 각 플레이어 이름(기본값 "플레이어 1" 등, 수정 가능)과 난이도, 라운드 수, 제한시간. 마지막 설정을 `localStorage`에 기억한다.
- **플레이 중 상단 바**: 라운드 n/N, 남은 시간, 전체화면, 소리 켜기/끄기, 그만하기(확인 후 메뉴로).

### 4.2 칸 분할
```
3인 예시
┌──────────┬──────────┬──────────┐
│ 민준 7점  │ 서연 5점  │ 아빠 9점  │  ← 위쪽: 이름·점수·상태 (보기 전용)
├──────────┼──────────┼──────────┤
│ ┌─퍼즐판─┐│ ┌─퍼즐판─┐│ ┌─퍼즐판─┐│  ← 아래쪽 2/3: 조작 영역
│ └────────┘│ └────────┘│ └────────┘│
│ [조각들]  │ [조각들]  │ [조각들]  │
└──────────┴──────────┴──────────┘
```
- 칸은 가로로 나란히 1~4개 둔다. 2×2 배치는 금지한다. 벽에 걸린 칠판 윗줄에는 아이 손이 닿지 않기 때문이다.
- 조작 영역(퍼즐판 + 조각 트레이)은 칸의 아래쪽 2/3에 둔다.
- 퍼즐판과 트레이의 조각은 같은 칸 크기로 그린다. 칸 크기는 칸 너비와 높이에 맞춰 계산하며, 보통·어려움은 여유 칸(§3.4)까지 포함해 계산한다.

### 4.3 조작
| 동작 | 결과 |
|---|---|
| 조각 끌기 | 손가락을 따라 움직인다. 조각 칸이 하나라도 판에 걸치게 놓으면 가장 가까운 격자에 맞추고, 난이도별 놓기 조건(§3.4)을 만족하지 않으면 판 밖에 마지막으로 둔 자리로 돌아간다. 판에 걸치지 않게 놓으면 그 자리에 둔다. 둘 수 있는 곳은 자기 칸의 조작 영역(퍼즐 그림 바깥 여백 포함)에서 판과 버튼 줄을 뺀 곳 어디든이고, 버튼 줄이나 칸 밖에 걸치면 가장 가까운 빈 곳으로 밀린다. 마지막에 끈 조각이 맨 위에 그려진다 |
| 조각 톡 치기 | 시계방향 90° 회전. 판 밖 조각은 그 자리에서 돈다. 판 위 조각을 돌려 그 자리에서 놓기 조건(§3.4)을 만족하지 않게 되면 돌린 상태로 판 밖에 마지막으로 둔 자리로 돌아간다 |
| 돌리기·뒤집기 버튼 | 판과 트레이 사이 고정 버튼 줄에 큰 "돌리기"·"뒤집기" 버튼을 둔다. 마지막으로 만진 조각(점선 테두리로 강조)에 적용된다. 쉬움 난이도에서는 뒤집기를 숨긴다 |

버튼을 조각 바로 위에 띄우지 않는 이유가 있다. 떠다니는 버튼은 손에 가리고, 판 맨 위 조각이면 화면 밖으로 나간다. 돌리기 버튼을 따로 두는 이유도 있다. 칠판 IR 터치는 떨림 때문에 탭이 끌기로 인식될 수 있다(구현 계획 작성 중 결정, 2026-10-12).

여러 명이 동시에 만지는 퍼즐 칸 안 버튼은 `click`이 아니라 `pointerdown`에 반응한다. 터치의 click은 첫 손가락에만 생기기 때문이다.

- 탭 판정: 이동 10px 미만이고 300ms 이내.
- 멀티터치: Pointer Events와 포인터별 캡처를 쓴다. 각 칸은 자기 영역의 포인터만 처리하므로 4명이 동시에 끌 수 있다.
- 브라우저 동작 차단: `touch-action: none`, `overscroll-behavior: none`, 길게 누르기 메뉴 차단, 텍스트 선택 차단.
- 전체화면: Fullscreen API를 쓰고, 구형을 위해 `webkit` 접두사 버전도 대비한다.
- 효과음: WebAudio 합성음(정답 딩, 카운트다운 삑, 시간 종료 부저)을 쓰고 에셋 파일은 없다. 첫 터치 때 오디오를 활성화한다.

### 4.4 시각
밝고 아이 친화적인 색감을 쓴다. 조각 10종의 색은 서로 잘 구분되게 하고, 플레이어 칸 머리에는 플레이어 색을 쓴다. `docs/UI_GUIDE.md`의 안티패턴을 따른다.

## 5. 기술 구조

### 5.1 디렉토리
```
src/
├── main.tsx, App.tsx      # 진입점, 화면 전환
├── shell/
│   ├── logic/             # 순수 TS: 판 진행 상태 기계(reducer), 점수 집계, 설정 저장
│   └── ui/                # GameMenu, PlayerSetup, PlayLayout(칸 분할), TopBar, RoundResult, FinalResult
├── games/
│   ├── registry.ts        # 게임 목록
│   └── blocks/
│       ├── index.ts       # GameModule 정의
│       ├── logic/         # 순수 TS: pieces, transform, board, generator, solver
│       └── ui/            # PlayerArea, PuzzleBoard, PieceTray, PieceView (SVG)
└── lib/
    ├── random.ts          # 시드 난수, 시드 파생
    ├── usePointerDrag.ts  # 포인터 드래그·탭 판정 훅
    ├── sound.ts           # WebAudio 합성음
    └── fullscreen.ts
public/check.html          # 기기 진단 페이지 (ES5 인라인 JS)
```

### 5.2 핵심 인터페이스 (시그니처 수준)
```ts
// lib/random.ts
type Rng = { next(): number; int(maxExclusive: number): number; pick<T>(xs: T[]): T; shuffle<T>(xs: T[]): T[] };
function createRng(seed: number): Rng;
function deriveSeed(...parts: number[]): number;

// games/blocks/logic
type Cell = { x: number; y: number };
type PieceId = 'I3' | 'L3' | 'I4' | 'O4' | 'T4' | 'L4' | 'S4' | 'P5' | 'L5' | 'U5';
type Orientation = { rotation: 0 | 1 | 2 | 3; flipped: boolean };
type Placement = { pieceId: PieceId; orientation: Orientation; at: Cell };
type Difficulty = 'easy' | 'normal' | 'hard';
type Puzzle = { target: Cell[]; pieceIds: PieceId[]; solution: Placement[] };
type PlaceMode = 'inside' | 'free';                               // 쉬움: inside, 보통·어려움: free
type BoardArea = { width: number; height: number; target: Cell[] }; // 바운딩박스 + 여유 칸, target은 판 좌표

function orient(cells: Cell[], o: Orientation): Cell[];          // 정규화(최소 좌표 0,0) 포함
function placedCells(p: Placement): Cell[];
function placeModeOf(d: Difficulty): PlaceMode;
function boardAreaFor(target: Cell[], d: Difficulty): BoardArea; // 여유 칸: 쉬움 0, 보통·어려움 2
function canPlace(area: BoardArea, others: Placement[], p: Placement, mode: PlaceMode): boolean;
function isSolved(target: Cell[], placements: Placement[]): boolean; // 목표 전부 덮음 && 목표 밖 칸 없음
function generatePuzzle(rng: Rng, difficulty: Difficulty): Puzzle;
function solve(target: Cell[], pieceIds: PieceId[], allowFlip: boolean): Placement[] | null; // 검증용 백트래킹

// shell/logic
type MatchConfig = { players: { name: string; difficulty: Difficulty }[]; rounds: number; timeLimitSec: number };
// 상태: setup → countdown → playing → roundResult → … → final
function matchReducer(state: MatchState, action: MatchAction): MatchState;
function roundPoints(solveOrder: number[], playerCount: number): number[]; // 3/2/1/0

// 게임 모듈 계약 (최소)
type GameModule = {
  id: string; name: string; minPlayers: number; maxPlayers: number;
  PlayerArea: React.FC<{ difficulty: Difficulty; seed: number; active: boolean; onSolved: () => void }>;
};
```
- 셸은 시간과 해결 순서를 기록하고, 게임은 "풀었다"만 알린다.
- 턴제 등 이 계약에 맞지 않는 게임은 그 게임을 추가할 때 셸을 확장한다(YAGNI).

### 5.3 상태 관리
- 판 진행(라운드·점수·타이머 단계)은 `shell/logic`의 순수 reducer로 관리하고 `useReducer`로 연결한다. 남은 시간은 시작 시각 기준으로 계산하고 렌더 주기에 맞춰 갱신한다.
- 각 플레이어 칸의 퍼즐 상태(조각 위치·방향)는 그 칸의 `PlayerArea` 내부 상태로 둔다.
- 드래그 중 위치는 매 프레임 React 상태로 올리지 않는다. 대상 요소의 `transform`을 직접 바꾸고, 놓을 때만 상태를 커밋한다. 약한 SoC를 고려한 것이다.

## 6. 호환성, 빌드, 배포
- 진단 결과(Chrome 99)에 맞춰 `build.target`·`cssTarget`을 `chrome99`로 정하고 모던 번들 하나만 만든다. 진단 전에는 `@vitejs/plugin-legacy`로 `chrome >= 61`용 번들도 만들었다. 더 오래된 기기가 필요하면 ADR-006의 복구 절차를 따른다.
- `vite.config.ts`의 `base`는 `'/boardgame/'`이다.
- `public/check.html`은 빌드를 거치지 않는 ES5 인라인 스크립트다. 앱 번들이 실패해도 진단은 열린다.
- GitHub Actions에서 `main`에 push하면 lint, test, build를 거쳐 GitHub Pages에 배포한다.
- 3D 효과, 무거운 그림자·필터, 큰 이미지 에셋은 쓰지 않는다. 약한 SoC를 4K로 그리기 때문이다.

## 7. 기기 진단 페이지 (`check.html`)
칠판에서 열어 다음을 화면에 크게 표시한다.
- userAgent와 추출한 Chrome/WebView 버전, OS
- `screen` 크기, 뷰포트 크기, `devicePixelRatio`
- `navigator.maxTouchPoints`
- 실시간 멀티터치 테스트: 손가락마다 색 원을 그리고 현재 동시 터치 수와 최대 기록을 표시
- 지원 여부: PointerEvent, Fullscreen API(접두사 포함), localStorage, WebAudio, ES 모듈(`noModule` 지원)

이 결과로 legacy targets와 4인 동시 플레이 가능 여부를 확정한다. → 2026-10-14 확정: Chrome 99라 legacy 번들을 빼고, 동시 터치 17점이라 4인 그대로 간다(ADR-006). `maxTouchPoints`는 1로 잘못 보고되므로 실시간 터치 테스트 결과를 믿는다.

## 8. 테스트
- **Vitest 단위 테스트(TDD)**:
  - `random`: 같은 시드 → 같은 수열
  - `transform`: 회전 4번이면 원상태, 뒤집기 2번이면 원상태, O4는 방향이 1종, 정규화
  - `board`: `canPlace` — `inside`는 목표 밖 칸·겹침을 거부하고, `free`는 판 격자 밖·겹침만 거부하며 목표 밖으로 삐져나온 배치를 허용. `isSolved` — 전부 덮였어도 목표 밖 칸이 있으면 미해결. `boardAreaFor`의 난이도별 여유 칸
  - `generator` 속성 테스트: 난이도별 시드 1000개에 대해 조각 수·크기 제한·구멍 없음을 확인하고, `solution`이 실제 해인지(`isSolved`) 검증한다. 독립 솔버 `solve`로도 풀리는지 확인하고, 쉬움은 `allowFlip=false`로 풀리는지 확인한다.
  - `shell/logic`: `roundPoints`, reducer 전이(전원 해결 시 조기 종료, 시간 종료, 마지막 라운드 후 final, 동점 공동 우승)
- **UI 테스트**: 핵심 흐름만 React Testing Library로 가볍게 본다(설정 → 시작 → 칸 수).
- **수동 확인**: 데스크톱 Chrome DevTools 터치 에뮬레이션, 그리고 실제 칠판에서 최종 확인.

## 9. MVP 제외 사항
- 폰·태블릿을 컨트롤러로 쓰는 온라인 대전, 서버, 계정
- 3D 우봉고, 원작 카드·그림·이름
- 힌트 기능, 튜토리얼 애니메이션, 배경음악
- 우봉고 외 다른 게임 (구조만 대비)

## 10. 구현 순서
1. 프로젝트 셋업(Vite+React+TS+Vitest+ESLint), `check.html`, GitHub Actions 배포. 칠판에서 진단하고 targets를 확정한다.
2. `games/blocks/logic` (TDD)
3. 1인 퍼즐 화면(드래그·회전·뒤집기·판정). 칠판에서 터치를 실험한다.
4. 셸(메뉴, 설정, 칸 분할, 라운드·타이머·점수, 결과)
5. 마감(전체화면, 효과음, 최고기록, 실기기 점검)

외부에 영향을 주는 작업(공개 저장소 생성, Pages 활성화, push)은 실행 직전에 사용자 확인을 받는다.

## 11. 위험과 대응
| 위험 | 대응 |
|---|---|
| 칠판 Chrome이 매우 구형 | 해소: 실측 Chrome 99(ADR-006). 다른 구형 기기는 ADR-006 복구 절차로 legacy 번들을 되살린다. 그래도 안 되면 미니PC를 HDMI+USB 터치로 연결한다 |
| 동시 터치 수가 사양보다 적음 | 해소: 실측 17점, 4인 동시 플레이 확인 |
| 4K 렌더링이 느림 | SVG 요소 수 최소화, 드래그 중 transform 직접 조작, 효과 최소화 |
| 같은 난이도라도 퍼즐마다 체감 난이도가 다름 | 채움률 기준 선택으로 편차를 줄인다. 필요하면 이후 솔버 탐색량으로 난이도를 보정한다 |
