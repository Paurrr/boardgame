import { DIFFICULTIES, isDifficulty } from '../../lib/difficulty';
import type { Difficulty } from '../../lib/difficulty';
import type { KeyValueStore } from '../../lib/storage';
import type { PlayerConfig } from './match';
import { ROUND_OPTIONS } from './match';
import { clampGameTime, DEFAULT_GAME_TIME_SEC, MAX_NAME_LENGTH } from './setup';
import type { SavedSetup } from './setup';

const SETUP_KEY = 'boardgame.setup.v1';
/** 게임마다 따로 둔다. 블록 퍼즐은 예전 키 boardgame.blocks.best.v1 그대로다 */
const bestKey = (gameId: string) => `boardgame.${gameId}.best.v1`;

export type BestTimes = Partial<Record<Difficulty, number>>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 무시한다 (게임은 계속)
  }
}

/** 저장된 설정. 없거나 형식이 맞지 않으면 null */
export function loadSetup(store: KeyValueStore): SavedSetup | null {
  const data = readJson(store, SETUP_KEY);
  if (!isRecord(data)) return null;
  const { players, rounds, timeMode = 'round', timeLimitSec, gameTimeSec = DEFAULT_GAME_TIME_SEC, level } = data;
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) return null;
  const parsed: PlayerConfig[] = [];
  for (const p of players) {
    if (!isRecord(p) || typeof p.name !== 'string' || !isDifficulty(p.difficulty)) return null;
    parsed.push({ name: p.name.slice(0, MAX_NAME_LENGTH), difficulty: p.difficulty });
  }
  if (typeof rounds !== 'number' || !ROUND_OPTIONS.includes(rounds)) return null;
  // 제한시간 선택지는 게임마다 다르다. 여기서는 양의 정수인지만 보고, 게임에 맞추는 일은 PlayerSetup이 한다
  if (typeof timeLimitSec !== 'number' || !Number.isInteger(timeLimitSec) || timeLimitSec <= 0) return null;
  // 시간 방식·판 전체 시간은 나중에 생긴 값이라 예전 저장값에는 없다 (없으면 기본값)
  if (timeMode !== 'round' && timeMode !== 'game') return null;
  if (typeof gameTimeSec !== 'number') return null;
  // 판 난이도도 나중에 생긴 값이다. 없거나 잘못되면 보통 (설정 전체를 버리지 않는다)
  return {
    players: parsed,
    rounds,
    timeMode,
    timeLimitSec,
    gameTimeSec: clampGameTime(gameTimeSec),
    level: isDifficulty(level) ? level : 'normal',
  };
}

export function saveSetup(store: KeyValueStore, setup: SavedSetup): void {
  writeJson(store, SETUP_KEY, setup);
}

export function loadBestTimes(store: KeyValueStore, gameId: string): BestTimes {
  const data = readJson(store, bestKey(gameId));
  const out: BestTimes = {};
  if (!isRecord(data)) return out;
  for (const d of DIFFICULTIES) {
    const v = data[d];
    if (typeof v === 'number' && isFinite(v) && v > 0) out[d] = v;
  }
  return out;
}

/** 1인 모드 한 문제 기록. 최고기록을 깼으면 저장하고 true */
export function recordBestTime(store: KeyValueStore, gameId: string, difficulty: Difficulty, ms: number): boolean {
  if (!isFinite(ms) || ms <= 0) return false;
  const best = loadBestTimes(store, gameId);
  const prev = best[difficulty];
  if (prev !== undefined && prev <= ms) return false;
  best[difficulty] = ms;
  writeJson(store, bestKey(gameId), best);
  return true;
}
