import type { OwnMatchGame } from '../types';
import { BellMatch } from './ui/BellMatch';
import { LEVEL_TEXT } from './ui/levelText';
import { MenuIcon } from './ui/MenuIcon';

/** 3탄 (ADR-009). 메뉴에 공개했다 */
export const bellGame: OwnMatchGame = {
  kind: 'own',
  id: 'bell',
  name: '과일 종치기',
  description: '같은 과일이 딱 5개면 종을 쳐요',
  minPlayers: 2,
  maxPlayers: 4,
  Match: BellMatch,
  /** 판 전체 난이도: 빨라지는 차례 제한시간과 사람당 카드 (원작에 없는 집 규칙) */
  levels: LEVEL_TEXT,
  Icon: MenuIcon,
};
