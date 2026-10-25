# Step 3: pairs-result

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md, /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-memory-design.md
- /docs/superpowers/plans/2026-10-25-memory.md (전체 계획. 이 step은 Task 3)
- `/phases/4-memory/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/types.ts
- /src/App.tsx
- /src/AppOwnMatch.test.tsx
- /src/shell/logic/persistence.ts
- /src/lib/storage.ts
- /src/games/bell/ui/levelText.ts
- /src/games/bell/ui/BellResult.tsx
- /src/shell/ui/FinalResult.module.css

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
- Modify: `src/games/types.ts`, `src/App.tsx`, `src/AppOwnMatch.test.tsx`, `src/shell/logic/persistence.ts`(주석만)
- Create: `src/games/pairs/ui/levelText.ts`, `src/games/pairs/ui/PairsResult.tsx`
- Test: `src/games/pairs/ui/levelText.test.ts`, `src/games/pairs/ui/PairsResult.test.tsx`

**Interfaces:**
- Consumes: `PAIRS_LEVELS`·`cardCount`·`Standing`(Task 0), `DIFFICULTIES`·`DIFFICULTY_LABEL`, `KeyValueStore`(`src/lib/storage.ts`), `PLAYER_COLORS`, `src/shell/ui/FinalResult.module.css`
- Produces:
  - `OwnMatchProps`에 `store: KeyValueStore`. `App.tsx`는 이미 만든 `store`를 own 게임 `Match`에도 넘긴다. 과일 종치기는 받기만 한다(코드 변경 없음).
  - `persistence.ts`의 `BestTimes`·`recordBestTime` 주석을 "작을수록 좋은 값(퍼즐은 ms, 짝 맞추기는 뒤집기 횟수)"으로. 이름·키는 그대로.
  - `levelText(level: Difficulty): string` = `` `카드 ${n}장 · 틀리면 ${s}초만 보여요` ``(s = `showMs / 1000`), `LEVEL_TEXT: Record<Difficulty, string>`, `levelBadge(level: Difficulty): string` = `` `${DIFFICULTY_LABEL[level]} · ${n}장 · ${s}초` ``
  - `type SoloRecord = { tries: number; best: number; isNew: boolean }`
  - `PairsResult({ playerNames, standings, solo, onReplay, onExit }: { playerNames: readonly string[]; standings: readonly Standing[]; solo: SoloRecord | null; onReplay: () => void; onExit: () => void })` — `BellResult`처럼 `FinalResult.module.css`를 import해 같은 모양.
    - 2명 이상: 제목은 1등이 한 명이면 `` `${이름} 우승!` ``, 여럿이면 `` `${이름들.join('·')} 공동 우승!` ``. 줄마다 `` `${place}등 ${이름}` ``와 `` `${pairs}쌍` ``(왼쪽 테두리 사람 색), place 1 줄에 '우승'.
    - 1명(`solo`): 제목 '다 찾았어요!', `` `${tries}번 만에 다 찾았어요` ``, `` `최고기록 ${best}번` ``, `isNew`면 '새 기록!'.
    - 버튼 '메뉴로'(onExit)·'다시 하기'(onReplay).

- [ ] **Step 1: 실패 테스트**
  - `levelText('hard')` = '카드 48장 · 틀리면 1초만 보여요', `LEVEL_TEXT.easy` = '카드 16장 · 틀리면 3초만 보여요', `levelBadge('normal')` = '보통 · 32장 · 2초'.
  - `PairsResult`: standings `[{1,5,1},{0,3,2}]`·이름 `['민수','지우']` → '지우 우승!', 줄 순서 '1등 지우'·'2등 민수', '5쌍'.
  - `공동 1등이면 공동 우승` (Review Focus 5): `[{0,4,1},{1,4,1},{2,0,3}]` → '민수·지우 공동 우승!', '3등 아빠'.
  - solo `{ tries: 9, best: 8, isNew: false }` → '9번 만에 다 찾았어요', '최고기록 8번', '새 기록!' 없음. `isNew` true면 있음.
  - 버튼 두 개가 각 콜백을 1번 부른다.
  - `AppOwnMatch.test.tsx`: 가짜 Match가 `store`를 받아 `store.setItem`/`getItem`이 함수인지 `data-has-store`로 보이고, 시작하면 'true'.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games/pairs src/AppOwnMatch.test.tsx` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build` (과일 종치기·퍼즐 테스트도 그대로 통과)

**금지:** 저장 키(`boardgame.${gameId}.best.v1`)와 `SavedSetup` 형식을 바꾸지 마라. 이유: 기존 기록과 설정을 잃는다.

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
3. 결과에 따라 `phases/4-memory/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **250자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
