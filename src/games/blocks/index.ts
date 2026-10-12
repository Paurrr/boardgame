import type { GameModule } from '../types';
import { PlayerArea } from './ui/PlayerArea';

export const blocksGame: GameModule = {
  id: 'blocks',
  name: '블록 퍼즐',
  description: '조각을 돌리고 뒤집어 모양을 빈틈없이 채워요',
  minPlayers: 1,
  maxPlayers: 4,
  PlayerArea,
};
