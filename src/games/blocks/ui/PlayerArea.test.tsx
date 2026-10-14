import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '../../../lib/random';
import { boardAreaFor } from '../logic/board';
import { generatePuzzle } from '../logic/generator';
import { PIECES } from '../logic/pieces';
import { shapeSize } from '../logic/shape';
import { orient } from '../logic/transform';
import { bestLayout, cellSizeFor, freeAreas, PAD, SLOT, trayPosition, visibleArea } from './layout';
import type { Point, Rect } from './layout';
import { PlayerArea } from './PlayerArea';

const noop = () => {};

/** transform="translate(x y)"의 x, y */
function translateOf(el: Element): Point {
  const m = /translate\(([^ ]+) ([^)]+)\)/.exec(el.getAttribute('transform') ?? '');
  if (!m) throw new Error('transform 없음');
  return { x: Number(m[1]), y: Number(m[2]) };
}

function expectAt(el: Element, p: Point) {
  const t = translateOf(el);
  expect(t.x).toBeCloseTo(p.x);
  expect(t.y).toBeCloseTo(p.y);
}

/** 손가락 하나로 조각을 from(지금 그려진 자리)에서 to로 끌어 놓는다 (SVG 좌표) */
function dragTo(piece: Element, svg: Element, from: Point, to: Point, scale: number, pointerId: number) {
  const dx = (to.x - from.x) * scale;
  const dy = (to.y - from.y) * scale;
  fireEvent.pointerDown(piece, { pointerId, clientX: 0, clientY: 0 });
  fireEvent.pointerMove(svg, { pointerId, clientX: dx, clientY: dy });
  fireEvent.pointerUp(svg, { pointerId, clientX: dx, clientY: dy });
}

/** 버튼 줄 아래 영역 왼쪽 끝, 위아래 가운데 — 돌려도 영역 안에 들어가는 빈 곳 */
function looseSpot(free: Rect[], size: { w: number; h: number }): Point {
  const below = free[0];
  return { x: below.x, y: below.y + (below.h - size.h) / 2 };
}

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

  it('돌리기·뒤집기 버튼은 면 아래에 두께 블록을 깔아 도톰하게 보인다', () => {
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    for (const name of ['돌리기', '뒤집기']) {
      const [depth, face] = screen.getByRole('button', { name }).querySelectorAll('rect');
      expect(Number(depth.getAttribute('y'))).toBeGreaterThan(0);
      expect(face.getAttribute('y')).toBeNull();
    }
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
      const free = freeAreas(layout, area, visibleArea(layout, W, H));
      return { piece, svg: screen.getByTestId('puzzle-svg'), area, layout, scale, size, from, free };
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

  it('판 밖 빈 곳에 놓으면 그 자리에 남는다', () => {
    const { piece, svg, scale, size, from, free } = renderWidePiece();
    const spot = looseSpot(free, size);
    dragTo(piece, svg, from, spot, scale, 1);
    expect(piece).toHaveAttribute('data-placed', 'no');
    expectAt(piece, spot);
  });

  it('빈 곳에 둔 뒤 판 위 잘못된 자리에 놓으면 슬롯이 아니라 그 빈 곳으로 돌아간다', () => {
    const { piece, svg, area, layout, scale, size, from, free } = renderWidePiece();
    const spot = looseSpot(free, size);
    dragTo(piece, svg, from, spot, scale, 1);
    // 판 오른쪽 끝 칸에 걸쳐 나머지는 판 밖
    dragTo(piece, svg, spot, { x: layout.boardX + area.width - 1, y: layout.boardY }, scale, 2);
    expect(piece).toHaveAttribute('data-placed', 'no');
    expectAt(piece, spot);
  });

  it('판에 놓인 조각을 빈 곳으로 끌어내면 판에서 빠지고 그 자리에 남는다', () => {
    const { piece, svg, layout, scale, size, from, free } = renderWidePiece();
    const onBoard = { x: layout.boardX, y: layout.boardY };
    dragTo(piece, svg, from, onBoard, scale, 1);
    expect(piece).toHaveAttribute('data-placed', 'yes');
    const spot = looseSpot(free, size);
    dragTo(piece, svg, onBoard, spot, scale, 2);
    expect(piece).toHaveAttribute('data-placed', 'no');
    expectAt(piece, spot);
  });

  it('빈 곳에 둔 조각을 돌리면 그 자리에서 돈다', () => {
    const { piece, svg, scale, size, from, free } = renderWidePiece();
    const spot = looseSpot(free, size);
    dragTo(piece, svg, from, spot, scale, 1);
    fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expect(piece).toHaveAttribute('data-rotation', '1');
    expectAt(piece, { x: spot.x + (size.w - size.h) / 2, y: spot.y + (size.h - size.w) / 2 });
    for (let i = 0; i < 3; i++) fireEvent.pointerDown(screen.getByRole('button', { name: '돌리기' }));
    expectAt(piece, spot);
  });

  it('퍼즐 그림 바깥이어도 칸 안 빈 곳이면 두고, 칸 밖으로 끌면 가장자리에서 멈춘다', () => {
    // 가로로 넓은 칸 → 퍼즐 그림 좌우로 빈 곳이 생긴다
    const W = 1600;
    const H = 600;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: W, height: H } as DOMRect);
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const layout = bestLayout(boardAreaFor(puzzle.target, 'normal'), puzzle.pieceIds.length, W, H);
    const scale = cellSizeFor(layout, W, H);
    const view = visibleArea(layout, W, H);
    expect(view.x).toBeLessThan(-SLOT);
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    const svg = screen.getByTestId('puzzle-svg');
    const first = screen.getAllByTestId('piece')[0];
    const size = shapeSize(PIECES[puzzle.pieceIds[0]].cells);
    const from = trayPosition(layout.slots[0], size.w, size.h);

    const spot = { x: view.x + PAD + 0.25, y: from.y };
    dragTo(first, svg, from, spot, scale, 1);
    expectAt(first, spot);

    dragTo(first, svg, spot, { x: view.x - 10, y: spot.y }, scale, 2);
    expectAt(first, { x: view.x + PAD, y: spot.y });
  });

  it('끌어 놓은 조각은 놓은 뒤에도 맨 위에 그려진다', () => {
    const W = 600;
    const H = 1000;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: W, height: H } as DOMRect);
    const puzzle = generatePuzzle(createRng(7), 'normal');
    const layout = bestLayout(boardAreaFor(puzzle.target, 'normal'), puzzle.pieceIds.length, W, H);
    const scale = cellSizeFor(layout, W, H);
    render(<PlayerArea difficulty="normal" seed={7} active onSolved={noop} />);
    const first = screen.getAllByTestId('piece')[0];
    const size = shapeSize(PIECES[puzzle.pieceIds[0]].cells);
    const from = trayPosition(layout.slots[0], size.w, size.h);
    dragTo(first, screen.getByTestId('puzzle-svg'), from, { x: from.x + 0.5, y: from.y }, scale, 1);
    const all = screen.getAllByTestId('piece');
    expect(all[all.length - 1]).toBe(first);
  });
});
