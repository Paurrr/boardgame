import { PIECES } from '../logic/pieces';
import { outlinePath } from '../logic/shape';
import type { PieceId } from '../logic/types';
import styles from './PlayerArea.module.css';

/** 메뉴 카드 그림: 실제 조각 셋을 맞대어 쌓은 모양 */
const ART: { id: PieceId; x: number; y: number }[] = [
  { id: 'I4', x: 0, y: 0 },
  { id: 'O4', x: 0, y: 1.2 },
  { id: 'T4', x: 2.2, y: 1.2 },
];

export function MenuIcon() {
  return (
    <svg className={styles.icon} viewBox="-0.2 -0.2 5.6 3.6" aria-hidden="true">
      {ART.map(({ id, x, y }) => {
        const { cells, color } = PIECES[id];
        return (
          <g key={id} transform={`translate(${x} ${y})`} data-piece={id}>
            {cells.map((c) => (
              <rect key={c.x + ',' + c.y} x={c.x} y={c.y} width={1.02} height={1.02} fill={color} />
            ))}
            <path d={outlinePath(cells)} className={styles.pieceOutline} />
          </g>
        );
      })}
    </svg>
  );
}
