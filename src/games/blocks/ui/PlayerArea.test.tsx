import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '../../../lib/random';
import { boardAreaFor } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { PIECES } from '../logic/pieces';
import { shapeSize } from '../logic/shape';
import { orient } from '../logic/transform';
import { bestLayout, cellSizeFor, trayPosition } from './layout';
import { PlayerArea } from './PlayerArea';

const noop = () => {};

describe('PlayerArea', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('목표 칸과 조각을 그린다', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    expect(screen.getAllByTestId('target-cell')).toHaveLength(puzzle.target.length);
    expect(screen.getAllByTestId('piece')).toHaveLength(puzzle.pieceIds.length);
  });

  it('판 격자는 보통이면 사방 2칸 여유, 쉬움이면 목표 크기 그대로', () => {
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const { w, h } = shapeSize(puzzle.target);
    const { unmount } = render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    const cellCount = () => screen.getAllByTestId('target-cell').length + screen.queryAllByTestId('outside-cell').length;
    expect(cellCount()).toBe((w + 4) * (h + 4));
    unmount();

    const easy = generatePuzzle(createRng(7), 'easy');
    const e = shapeSize(easy.target);
    render(<PlayerArea difficulty="easy" seed={7} active onSolved={noop} />);
    expect(cellCount()).toBe(e.w * e.h);
  });

  it('쉬움에는 뒤집기 버튼이 없다', () => {
    render(<PlayerArea difficulty="easy" seed={7} active onSolved={noop} />);
    expect(screen.getByRole('button', { name: '돌리기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '뒤집기' })).toBeNull();
  });

  it('조각을 고르고 돌리기·뒤집기를 누르면 그 조각이 바뀐다', () => {
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    fireEvent.pointerDown(screen.getAllByTestId('piece')[0], { pointerId: 1 });
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(screen.getAllByTestId('piece')[0]).toHaveAttribute('data-rotation', '1');
    fireEvent.pointerDown(screen.getByRole('button', { name: '뒤집기' }));
    expect(screen.getAllByTestId('piece')[0]).toHaveAttribute('data-flipped', 'yes');
  });

  it('active가 false면 조각을 고를 수 없다', () => {
    render(<PlayerArea difficulty="normal" seed={7} active={false} onSolved={noop} />);
    fireEvent.pointerDown(screen.getAllByTestId('piece')[0], { pointerId: 1 });
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(screen.getAllByTestId('piece')[0]).toHaveAttribute('data-rotation', '0');
  });

  it('조각을 끌어 정답 자리에 모두 놓으면 onSolved를 한 번 부른다', () => {
    const W = 600;
    const H = 1000;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: W, height: H } as DOMRect);
    const seed = 11;
    const puzzle = generatePuzzle(createRng(seed), 'normal');
    const area = boardAreaFor(puzzle.target, 'normal');
    const layout = bestLayout(area, puzzle.pieceIds.length, W, H);
    const scale = cellSizeFor(layout, W, H);
    const onSolved = vi.fn();
    render(<PlayerArea difficulty="normal" seed={seed} active onSolved={onSolved} />);
    const svg = screen.getByTestId('puzzle-svg');

    puzzle.solution.forEach((s, n) => {
      const piece = screen.getAllByTestId('piece').find((el) => el.getAttribute('data-piece') === s.pieceId);
      if (!piece) throw new Error('조각 없음: ' + s.pieceId);
      // 조각을 누른 채로 다른 손으로 정답 방향 만들기: 뒤집기 → 돌리기 r번
      fireEvent.pointerDown(piece, { pointerId: 200 + n, clientX: 0, clientY: 0 });
      if (s.orientation.flipped) fireEvent.pointerDown(screen.getByRole('button', { name: '뒤집기' }));
      for (let r = 0; r < s.orientation.rotation; r++) {
        fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
      }
      // 그 손가락으로 트레이 → 정답 자리로 끌기 (보통은 여유 칸 2)
      const { w, h } = shapeSize(orient(PIECES[s.pieceId].cells, s.orientation));
      const from = trayPosition(layout.slots[puzzle.pieceIds.indexOf(s.pieceId)], w, h);
      const to = { x: layout.boardX + s.at.x + 2, y: layout.boardY + s.at.y + 2 };
      const dx = (to.x - from.x) * scale;
      const dy = (to.y - from.y) * scale;
      fireEvent.pointerMove(svg, { pointerId: 200 + n, clientX: dx, clientY: dy });
      fireEvent.pointerUp(svg, { pointerId: 200 + n, clientX: dx, clientY: dy });
      expect(piece).toHaveAttribute('data-placed', 'yes');
    });

    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(screen.getByText('완성!')).toBeInTheDocument();
  });

  /** 600x1000 칸에서 보통 퍼즐을 그리고, 기본 방향이 가로로 긴(w > h) 조각 하나를 고른다 */
  function renderWidePiece() {
    const W = 600;
    const H = 1000;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: W, height: H } as DOMRect);
    for (let seed = 11; seed < 100; seed++) {
      const puzzle = generatePuzzle(createRng(seed), 'normal');
      const index = puzzle.pieceIds.findIndex((id) => {
        const { w, h } = shapeSize(PIECES[id].cells);
        return w > h;
      });
      if (index < 0) continue;
      const pieceId = puzzle.pieceIds[index];
      const area = boardAreaFor(puzzle.target, 'normal');
      const layout = bestLayout(area, puzzle.pieceIds.length, W, H);
      const scale = cellSizeFor(layout, W, H);
      const size = shapeSize(PIECES[pieceId].cells);
      render(<PlayerArea difficulty="normal" seed={seed} active onSolved={noop} />);
      const piece = screen.getAllByTestId('piece').find((el) => el.getAttribute('data-piece') === pieceId);
      if (!piece) throw new Error('조각 없음: ' + pieceId);
      const from = trayPosition(layout.slots[index], size.w, size.h);
      return { piece, svg: screen.getByTestId('puzzle-svg'), area, layout, scale, size, from };
    }
    throw new Error('가로로 긴 조각이 있는 퍼즐을 못 찾음');
  }

  it('같은 조각을 두 손가락으로 끌어도 첫 손가락이 놓은 자리에 남는다', () => {
    const { piece, svg, layout, scale, from } = renderWidePiece();
    const dx = (layout.boardX - from.x) * scale;
    const dy = (layout.boardY - from.y) * scale;
    fireEvent.pointerDown(piece, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerDown(piece, { pointerId: 2, clientX: 20, clientY: 0 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: dx, clientY: dy });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: 20 + dx, clientY: dy });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: dx, clientY: dy });
    expect(piece).toHaveAttribute('data-placed', 'yes');
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: 20 + dx, clientY: dy });
    expect(piece).toHaveAttribute('data-placed', 'yes');
    expect(piece.getAttribute('transform')).toBe(`translate(${layout.boardX} ${layout.boardY})`);
  });

  it('끄는 중에 돌리기를 눌러도 들고 있는 조각은 그대로이고, 놓은 자리에 놓인다', () => {
    const { piece, svg, area, layout, scale, size, from } = renderWidePiece();
    // 판 왼쪽 아래 구석에 놓는다 — 이 자리에서 돌리면 판 밖으로 나간다
    const corner = { x: layout.boardX, y: layout.boardY + area.height - size.h };
    const toCorner = { x: (corner.x - from.x) * scale, y: (corner.y - from.y) * scale };
    fireEvent.pointerDown(piece, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(svg, { pointerId: 1, clientX: toCorner.x, clientY: toCorner.y });
    fireEvent.pointerUp(svg, { pointerId: 1, clientX: toCorner.x, clientY: toCorner.y });
    expect(piece).toHaveAttribute('data-placed', 'yes');

    // 다시 들어 오른쪽 위로 한 칸씩 옮기는 중에 다른 손으로 돌리기
    fireEvent.pointerDown(piece, { pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(svg, { pointerId: 2, clientX: scale, clientY: -scale });
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(piece).toHaveAttribute('data-rotation', '0');
    fireEvent.pointerUp(svg, { pointerId: 2, clientX: scale, clientY: -scale });
    expect(piece).toHaveAttribute('data-placed', 'yes');
    expect(piece.getAttribute('transform')).toBe(`translate(${corner.x + 1} ${corner.y - 1})`);
  });
});
