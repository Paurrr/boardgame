import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { usePointerDrag } from '../../../lib/usePointerDrag';
import type { Slot } from '../logic/types';
import styles from './Board.module.css';
import { Card } from './Card';

export type BoardProps = {
  rows: number;
  cols: number;
  slots: readonly Slot[];
  open: readonly number[];
  /** 판 테두리 색 = 지금 차례인 사람 색 */
  color: string;
  /** 칸을 탭하면 그 칸 번호. 뒤집을 수 있는지는 부르는 쪽(reducer)이 판단한다 */
  onTap: (index: number) => void;
};

const CELL = 100;
const GAP = 8;
const PAD = 16;
/** 테두리 굵기. 여백(PAD) 안쪽에 그린다 */
const FRAME = 8;
/** 아래쪽 두께: 판 아래로 같은 색 블록이 이만큼 더 보인다 (나무 블록 버튼의 아래 테두리처럼) */
const DEPTH = 8;
const RADIUS = 20;

const noop = () => {};

/** 판 하나. 카드를 줄 순서로 깔고, 탭한 칸 번호만 알린다 (규칙 판단은 하지 않는다) */
export function Board({ rows, cols, slots, open, color, onTap }: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // 오래 누르거나 끈 손가락은 탭이 아니다 → 판에 기댄 손바닥·끄는 손가락은 뒤집지 않는다
  const drag = usePointerDrag<number>({ onDragStart: noop, onDragMove: noop, onDragEnd: noop, onTap });

  const width = 2 * PAD + cols * CELL + (cols - 1) * GAP;
  const faceHeight = 2 * PAD + rows * CELL + (rows - 1) * GAP;
  const height = faceHeight + DEPTH;

  const onSlotPointerDown = (index: number) => (e: ReactPointerEvent<SVGGElement>) => {
    if (svgRef.current) drag.begin(e, index, svgRef.current);
  };

  return (
    <svg
      ref={svgRef}
      className={styles.board}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={drag.move}
      onPointerUp={drag.end}
      onPointerCancel={drag.cancel}
      data-testid="board"
    >
      <rect x={0} y={DEPTH} width={width} height={faceHeight} rx={RADIUS} fill={color} />
      <rect x={0} y={0} width={width} height={faceHeight} rx={RADIUS} className={styles.surface} />
      <rect
        data-testid="board-frame"
        x={FRAME / 2}
        y={FRAME / 2}
        width={width - FRAME}
        height={faceHeight - FRAME}
        rx={RADIUS - FRAME / 2}
        stroke={color}
        strokeWidth={FRAME}
        fill="none"
      />
      {slots.map((slot, i) => (
        <g key={i} data-testid="slot" data-index={i} onPointerDown={onSlotPointerDown(i)}>
          <svg
            x={PAD + (i % cols) * (CELL + GAP)}
            y={PAD + Math.floor(i / cols) * (CELL + GAP)}
            width={CELL}
            height={CELL}
          >
            {/* 카드 둥근 모서리·빈자리 점선 사이도 그 칸으로 누르게 칸 전체를 받는다 */}
            <rect width={CELL} height={CELL} fill="none" pointerEvents="all" />
            <Card picture={slot.picture} faceUp={open.includes(i)} taken={slot.takenBy !== null} />
          </svg>
        </g>
      ))}
    </svg>
  );
}
