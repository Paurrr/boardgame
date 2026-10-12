import type { ComponentType } from 'react';
import type { Difficulty } from '../lib/difficulty';

/** 셸이 플레이어 칸 하나에 넘겨주는 값. seed가 바뀌면 셸이 key로 다시 마운트한다 */
export type PlayerAreaProps = {
  difficulty: Difficulty;
  seed: number;
  /** false면 입력을 받지 않는다 (라운드 밖, 이미 푼 뒤) */
  active: boolean;
  /** 풀었을 때 한 번 부른다 */
  onSolved: () => void;
};

export type GameModule = {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  PlayerArea: ComponentType<PlayerAreaProps>;
};
