import type { GameModule } from '../types';
import { MenuIcon } from './ui/MenuIcon';
import { PlayerArea } from './ui/PlayerArea';

/** 2탄. 칠판 확인을 마치고 메뉴에 공개했다 */
export const stackGame: GameModule = {
  id: 'stack',
  name: '쌓기 퍼즐',
  description: '조각을 쌓아 모양을 2층까지 채워요',
  minPlayers: 1,
  maxPlayers: 4,
  PlayerArea,
  timeOptions: [90, 120, 150],
  defaultTimeSec: 120,
  Icon: MenuIcon,
};
