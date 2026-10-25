/** takenBy: 이 카드를 가져간 사람. 판에 있으면 null */
export type Slot = { picture: number; takenBy: number | null };

export type PairsState = {
  playerCount: number;
  /** 줄 순서(row-major), 길이 rows×cols */
  slots: Slot[];
  /** 지금 앞면인(아직 안 가져간) 칸 번호, 뒤집은 순서. 0~2개 */
  open: number[];
  /** 두 장이 열려 CONTINUE를 기다리는 중. 그동안 FLIP은 무시 */
  pending: 'match' | 'miss' | null;
  turn: number;
  /** 사람별 가져간 짝 수 */
  pairs: number[];
  /** 두 장 뒤집기를 마친 횟수(모든 사람 합). 1인 기록 */
  tries: number;
};

export type PairsAction = { type: 'FLIP'; index: number } | { type: 'CONTINUE' };

export type Standing = { player: number; pairs: number; place: number };
