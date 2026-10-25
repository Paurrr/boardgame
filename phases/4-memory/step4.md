# Step 4: pairs-match

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- /CLAUDE.md, /docs/ARCHITECTURE.md, /docs/ADR.md, /docs/UI_GUIDE.md
- /docs/superpowers/specs/2026-10-25-memory-design.md
- /docs/superpowers/plans/2026-10-25-memory.md (전체 계획. 이 step은 Task 4)
- `/phases/4-memory/index.json`의 앞선 step summary로 이미 만들어진 것을 확인
- /src/games/pairs/** (앞 step에서 만든 파일 전부)
- /src/games/bell/ui/BellMatch.tsx
- /src/games/bell/ui/BellMatch.module.css
- /src/games/bell/index.ts
- /src/shell/ui/TopBar.tsx
- /src/lib/sound.ts
- /src/games/registry.ts
- /src/games/registry.test.ts

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
- Create: `src/games/pairs/ui/PairsMatch.tsx`, `src/games/pairs/ui/PairsMatch.module.css`, `src/games/pairs/index.ts`
- Modify: `src/games/registry.ts`
- Test: `src/games/pairs/ui/PairsMatch.test.tsx`, `src/games/registry.test.ts`

**Interfaces:**
- Consumes: Task 0(`createPairsGame`·`pairsReducer`·`isOver`·`standings`·`PAIRS_LEVELS`·`cardCount`), Task 1(`FLIP_MS`·`MenuIcon`), Task 2(`Board`·`TurnHeader`), Task 3(`OwnMatchProps.store`·`levelBadge`·`LEVEL_TEXT`·`PairsResult`), `TopBar`, `PLAYER_COLORS`, `isMuted`·`setMuted`·`sounds`, `recordBestTime`·`loadBestTimes`
- Produces:
  - `MATCH_SHOW_MS = 600`, `BANNER_MS = 1000`, `END_SHOW_MS = 1000` (PairsMatch.tsx export)
  - `PairsMatch(props: OwnMatchProps)`
  - `pairsGame: OwnMatchGame` = `{ kind: 'own', id: 'pairs', name: '짝 맞추기', description: '같은 그림 두 장을 찾아요', minPlayers: 1, maxPlayers: 4, Match: PairsMatch, levels: LEVEL_TEXT, Icon: MenuIcon, hidden: true }`. `GAMES = [blocksGame, stackGame, bellGame, pairsGame]`.

PairsMatch 동작:
- `useReducer(pairsReducer, undefined, () => createPairsGame(playerNames.length, seed, level))`. 배너는 `{ text: string; color: string } | null` 상태.
- 배치: `TopBar`(label `levelBadge(level)`, 소리 켜기/끄기는 BellMatch와 같게, 그만하기 → `onExit`) → 위 1/3에 `TurnHeader` → 아래 2/3에 `Board`(color `PLAYER_COLORS[turn]`)와 그 위에 겹친 배너(`role="status"`, 글자색 = 배너 color, 크게, `pointer-events: none`). 판 아래 여백 1.5rem.
- 탭: 배너가 있으면 무시, 아니면 `FLIP` dispatch.
- `pending 'match'`: `sounds.solved()`, `FLIP_MS + MATCH_SHOW_MS` 뒤 CONTINUE. 그 뒤 끝나지 않았고 2명 이상이면 배너 '한 번 더!'(차례인 사람 색)를 `BANNER_MS`.
- `pending 'miss'`: `FLIP_MS + showMs` 뒤 CONTINUE. 2명 이상이면 `sounds.go()`와 배너 `` `${다음 사람 이름} 차례` ``(그 사람 색)를 `BANNER_MS`.
- 끝나면 `END_SHOW_MS` 뒤 `PairsResult`. 1명이면 그때 한 번 `isNew = recordBestTime(store, 'pairs', level, tries)`, `best = loadBestTimes(store, 'pairs')[level]`로 `solo`를 만든다.
- 언마운트 때 타이머를 모두 지운다(effect cleanup).

- [ ] **Step 1: 실패 테스트** — `vi.useFakeTimers()`, store는 `memoryStore()`. 짝 위치는 같은 seed로 `createPairsGame`을 테스트 안에서 따로 만들어 찾는다. 탭 = `slot`에 `pointerDown` 뒤 `pointerUp`.
  - 2명 `['민수', '지우']` 쉬움 → `slot` 16개, '민수 차례'.
  - 맞는 두 장 → `FLIP_MS + MATCH_SHOW_MS` 뒤 두 칸 `empty-slot`, '1쌍', 배너 '한 번 더!', 여전히 '민수 차례'.
  - 틀린 두 장 → `FLIP_MS + 3000 − 1`에 앞면 2장, 1ms 더 → 앞면 0장, 배너·머리에 '지우 차례', `board-frame` stroke `PLAYER_COLORS[1]`.
  - 어려움에서 틀리면 `FLIP_MS + 1000` 뒤에 엎인다.
  - 두 장이 보이는 동안 셋째 칸 탭 → 앞면은 2장 그대로.
  - `배너가 떠 있는 동안 누른 카드는 뒤집히지 않는다` (Review Focus 1): 배너 중 탭 → 앞면 0장. `BANNER_MS` 뒤 탭 → 1장.
  - 2명에서 민수가 쉬움을 모두 맞춤 → `END_SHOW_MS` 뒤 '민수 우승!'.
  - `1인 기록은 더 적을 때만 바뀐다` (Review Focus 4): 1명 쉬움 완벽하게 → '8번 만에 다 찾았어요', '새 기록!'. 같은 store로 다시(한 번 틀리고 완벽) → '9번 만에', '최고기록 8번', '새 기록!' 없음. 1명일 때는 '한 번 더!'·차례 배너가 없다.
  - `보여 주는 중에 나가도 에러가 없다` (Review Focus 3): 틀린 두 장 표시 중, 배너 중 각각 그만하기 두 번 → `onExit` 1번, 언마운트 뒤 타이머를 다 돌려도 에러·경고 없음.
  - `registry.test.ts`: `findGame('pairs')`가 `kind 'own'`·`hidden true`·1~4명·`levels`가 `LEVEL_TEXT`. `menuGames(GAMES, '')`에 없고 `'?dev'`면 있다.
- [ ] **Step 2: 실패 확인** — `npx vitest run src/games` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `npm run test && npm run lint && npm run build`
- [ ] **Step 5: 손 확인(가능하면)** — `npm run dev` 뒤 `?dev`로 1·2·4명, 세 난이도 한 판씩. 브라우저가 없는 자동 세션이면 summary에 "손 확인 보류"라고 적는다.

**금지:** `hidden`을 빼지 마라. 이유: 칠판 확인 뒤 사람이 공개한다. `PlayLayout`을 쓰지 마라. 이유: 사람별 칸이 아니라 판 하나다.

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
3. 결과에 따라 `phases/4-memory/index.json`의 step 4을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약"` (만든 파일·export 이름·핵심 결정만, **250자 이내**. 이유: summary가 다음 step 프롬프트에 쌓이는데 Windows 명령줄 길이 제한이 약 32k자다)
   - 수정 3회 시도 후에도 실패 → `"status": "error"`, `"error_message": "구체적 에러 내용"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "구체적 사유"` 후 즉시 중단

## 금지사항

- 이 step의 Files 목록 밖 모듈을 고치지 마라. 이유: step마다 한 레이어만 다룬다.
- 기존 테스트를 지우거나 skip하지 마라. 기존 테스트를 깨뜨리지 마라.
- 테스트보다 구현을 먼저 쓰지 마라. 이유: CLAUDE.md TDD 규칙.
- 위 작업 절의 "금지" 항목을 지켜라.
