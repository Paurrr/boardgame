import type { OwnMatchGame } from '../types';
import { LEVEL_TEXT } from './ui/levelText';
import { MenuIcon } from './ui/MenuIcon';
import { PairsMatch } from './ui/PairsMatch';

/** 4탄 (ADR-010). 메뉴에 공개했다 */
export const pairsGame: OwnMatchGame = {
  kind: 'own',
  id: 'pairs',
  name: '짝 맞추기',
  description: '같은 그림 두 장을 찾아요',
  minPlayers: 1,
  maxPlayers: 4,
  Match: PairsMatch,
  /** 판 전체 난이도: 카드 장수와 틀린 두 장이 보이는 시간 */
  levels: LEVEL_TEXT,
  Icon: MenuIcon,
};
