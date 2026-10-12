import type { PointerEvent as ReactPointerEvent } from 'react';
import type { PieceState } from '../logic/play';
import { PIECES } from '../logic/pieces';
import { outlinePath } from '../logic/shape';
import { orient } from '../logic/transform';
import styles from './PlayerArea.module.css';

type Props = {
  piece: PieceState;
  x: number;
  y: number;
  selected: boolean;
  registerRef: (el: SVGGElement | null) => void;
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
};

export function PieceView({ piece, x, y, selected, registerRef, onPointerDown }: Props) {
  const def = PIECES[piece.pieceId];
  const cells = orient(def.cells, piece.orientation);
  return (
    <g
      ref={registerRef}
      transform={`translate(${x} ${y})`}
      onPointerDown={onPointerDown}
      data-testid="piece"
      data-piece={piece.pieceId}
      data-rotation={piece.orientation.rotation}
      data-flipped={piece.orientation.flipped ? 'yes' : 'no'}
      data-placed={piece.at ? 'yes' : 'no'}
    >
      {cells.map((c) => (
        // 칸 사이 가는 틈이 보이지 않게 살짝 겹친다
        <rect key={c.x + ',' + c.y} x={c.x} y={c.y} width={1.02} height={1.02} fill={def.color} />
      ))}
      <path d={outlinePath(cells)} className={selected ? styles.pieceOutlineSelected : styles.pieceOutline} />
    </g>
  );
}
