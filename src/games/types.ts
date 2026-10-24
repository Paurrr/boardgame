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
  /** 라운드 제한시간 선택지(초). 없으면 60/90/120 */
  timeOptions?: readonly number[];
  /** 제한시간 기본값(초). 없으면 90 */
  defaultTimeSec?: number;
  /** 메뉴 카드에 곁들이는 작은 그림 (없어도 된다) */
  Icon?: ComponentType;
  /** true면 주소에 ?dev가 있을 때만 메뉴에 보인다 (칠판 확인 중인 게임) */
  hidden?: boolean;
};
