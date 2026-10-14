import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createRng } from '../../../lib/random';
import { useElementSize } from '../../../lib/useElementSize';
import { usePointerDrag } from '../../../lib/usePointerDrag';
import type { PlayerAreaProps } from '../../types';
import { boardAreaFor, placeModeOf } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { dropPiece, flipPiece, initialPieces, piecesSolved, rotatePiece } from '../logic/play';
import type { PieceState } from '../logic/play';
import { PIECES } from '../logic/pieces';
import { cellKey, outlinePath, shapeSize } from '../logic/shape';
import { orient } from '../logic/transform';
import type { PieceId } from '../logic/types';
import { bestLayout, cellSizeFor, trayPosition } from './layout';
import type { Layout, Point } from './layout';
import { PieceView } from './PieceView';
import styles from './PlayerArea.module.css';

const BUTTON_W = 3.6;
const BUTTON_H = 1.4;
const BUTTON_GAP = 0.6;
/** 나무 블록처럼 면 아래로 비치는 두께 */
const BUTTON_DEPTH = 0.24;
const BUTTON_RADIUS = 0.32;

const translate = (p: Point) => `translate(${p.x} ${p.y})`;

/** 조각의 왼쪽 위 (SVG 좌표): 판 위면 판 칸, 아니면 자기 트레이 슬롯 가운데 */
function piecePosition(piece: PieceState, index: number, layout: Layout): Point {
  if (piece.at) return { x: layout.boardX + piece.at.x, y: layout.boardY + piece.at.y };
  const { w, h } = shapeSize(orient(PIECES[piece.pieceId].cells, piece.orientation));
  return trayPosition(layout.slots[index], w, h);
}

type ActionButtonProps = { x: number; y: number; label: string; disabled: boolean; onPress: () => void };

/** 여러 명이 동시에 만져도 동작하도록 click 대신 pointerdown에 반응한다 */
function ActionButton({ x, y, label, disabled, onPress }: ActionButtonProps) {
  return (
    <g
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      transform={translate({ x, y })}
      className={disabled ? styles.actionDisabled : styles.action}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!disabled) onPress();
      }}
    >
      <rect y={BUTTON_DEPTH} width={BUTTON_W} height={BUTTON_H} rx={BUTTON_RADIUS} className={styles.actionDepth} />
      <rect width={BUTTON_W} height={BUTTON_H} rx={BUTTON_RADIUS} className={styles.actionFace} />
      <text x={BUTTON_W / 2} y={BUTTON_H / 2} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}

function PlayerAreaImpl({ difficulty, seed, active, onSolved }: PlayerAreaProps) {
  const puzzle = useMemo(() => generatePuzzle(createRng(seed), difficulty), [seed, difficulty]);
  const area = useMemo(() => boardAreaFor(puzzle.target, difficulty), [puzzle, difficulty]);
  const boardCells = useMemo(() => {
    const targetKeys = new Set(area.target.map(cellKey));
    const out: { x: number; y: number; target: boolean }[] = [];
    for (let y = 0; y < area.height; y++) {
      for (let x = 0; x < area.width; x++) out.push({ x, y, target: targetKeys.has(cellKey({ x, y })) });
    }
    return out;
  }, [area]);
  const mode = placeModeOf(difficulty);

  const [pieces, setPieces] = useState<PieceState[]>(() => initialPieces(puzzle.pieceIds));
  const [selected, setSelected] = useState<PieceId | null>(null);
  const [dragging, setDragging] = useState<PieceId | null>(null);
  const { ref: boxRef, size } = useElementSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pieceEls = useRef(new Map<PieceId, SVGGElement>());
  const reported = useRef(false);

  const solved = piecesSolved(pieces, area);
  const canAct = active && !solved;
  const layout = bestLayout(area, pieces.length, size.width, size.height);
  /** 퍼즐 칸 하나의 화면 크기(px). 아직 못 쟀으면 1 */
  const scale = cellSizeFor(layout, size.width, size.height) || 1;

  useEffect(() => {
    if (solved && !reported.current) {
      reported.current = true;
      onSolved();
    }
  }, [solved, onSolved]);

  const positionOf = (id: PieceId): Point => {
    const i = pieces.findIndex((p) => p.pieceId === id);
    return piecePosition(pieces[i], i, layout);
  };
  const moveEl = (id: PieceId, p: Point) => pieceEls.current.get(id)?.setAttribute('transform', translate(p));

  const drag = usePointerDrag<PieceId>({
    onDragStart: (id) => setDragging(id),
    onDragMove: (id, dx, dy) => {
      const base = positionOf(id);
      // 끄는 동안은 React 렌더 없이 transform만 바꾼다 (약한 칠판 SoC 대비)
      moveEl(id, { x: base.x + dx / scale, y: base.y + dy / scale });
    },
    onDragEnd: (id, dx, dy) => {
      const base = positionOf(id);
      // 놓은 결과가 원래 자리와 같으면 React가 transform을 다시 쓰지 않으므로 직접 되돌린다
      moveEl(id, base);
      setDragging(null);
      if (!canAct) return;
      // + 0 은 -0 을 0 으로 바꾼다
      const at = {
        x: Math.round(base.x + dx / scale - layout.boardX) + 0,
        y: Math.round(base.y + dy / scale - layout.boardY) + 0,
      };
      setPieces((prev) => dropPiece(prev, id, at, area, mode));
    },
    onTap: (id) => {
      if (canAct) setPieces((prev) => rotatePiece(prev, id, area, mode));
    },
  });

  const onPiecePointerDown = (id: PieceId) => (e: ReactPointerEvent<SVGGElement>) => {
    if (!canAct || !svgRef.current) return;
    setSelected(id);
    drag.begin(e, id, svgRef.current);
  };

  const press = (action: 'rotate' | 'flip') => {
    if (!canAct || selected === null) return;
    // 끌고 있는 조각은 놓은 뒤에 바꾼다 (끄는 중에 바뀌면 원래 자리에서 검사돼 트레이로 튄다)
    if (drag.isDragging(selected)) return;
    const apply = action === 'rotate' ? rotatePiece : flipPiece;
    setPieces((prev) => apply(prev, selected, area, mode));
  };

  const ordered = dragging
    ? [...pieces.filter((p) => p.pieceId !== dragging), ...pieces.filter((p) => p.pieceId === dragging)]
    : pieces;
  const showFlip = difficulty !== 'easy';
  const buttonCount = showFlip ? 2 : 1;
  const buttonsX = (layout.width - (buttonCount * BUTTON_W + (buttonCount - 1) * BUTTON_GAP)) / 2;
  const buttonY = layout.actionY + (2 - BUTTON_H) / 2;
  const buttonsDisabled = !canAct || selected === null;

  return (
    <div ref={boxRef} className={styles.box}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMax meet"
        onPointerMove={drag.move}
        onPointerUp={drag.end}
        onPointerCancel={drag.cancel}
        data-testid="puzzle-svg"
      >
        <g transform={translate({ x: layout.boardX, y: layout.boardY })}>
          {boardCells.map((c) => (
            <rect
              key={c.x + ',' + c.y}
              x={c.x}
              y={c.y}
              width={1}
              height={1}
              className={c.target ? styles.targetCell : styles.marginCell}
              data-testid={c.target ? 'target-cell' : 'outside-cell'}
            />
          ))}
          <path d={outlinePath(area.target)} className={solved ? styles.silhouetteSolved : styles.silhouette} />
        </g>

        <ActionButton
          x={buttonsX}
          y={buttonY}
          label="돌리기"
          disabled={buttonsDisabled}
          onPress={() => press('rotate')}
        />
        {showFlip && (
          <ActionButton
            x={buttonsX + BUTTON_W + BUTTON_GAP}
            y={buttonY}
            label="뒤집기"
            disabled={buttonsDisabled}
            onPress={() => press('flip')}
          />
        )}

        {ordered.map((piece) => {
          const index = pieces.indexOf(piece);
          return (
            <PieceView
              key={piece.pieceId}
              piece={piece}
              {...piecePosition(piece, index, layout)}
              selected={selected === piece.pieceId}
              registerRef={(el) => {
                if (el) pieceEls.current.set(piece.pieceId, el);
                else pieceEls.current.delete(piece.pieceId);
              }}
              onPointerDown={onPiecePointerDown(piece.pieceId)}
            />
          );
        })}

        {solved && (
          <text
            x={layout.boardX + area.width / 2}
            y={layout.boardY + area.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className={styles.solvedText}
          >
            완성!
          </text>
        )}
      </svg>
    </div>
  );
}

/** 셸의 타이머가 매 초 다시 그려도 퍼즐 칸은 props가 바뀔 때만 다시 그린다 */
export const PlayerArea = memo(PlayerAreaImpl);
