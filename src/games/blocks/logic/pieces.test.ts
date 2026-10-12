import { describe, expect, it } from 'vitest';
import { MAX_PIECE_EXTENT, PENTOMINO_IDS, PIECE_IDS, PIECES, SMALL_PIECE_IDS } from './pieces';
import { isConnected, normalize, shapeSize } from './shape';
import { orient, uniqueOrientations } from './transform';

describe('PIECES', () => {
  it('10종이고 키와 id가 같다', () => {
    expect(PIECE_IDS).toHaveLength(10);
    for (const id of PIECE_IDS) expect(PIECES[id].id).toBe(id);
  });

  it.each(PIECE_IDS)('%s: 이름의 숫자만큼 칸이 있다', (id) => {
    expect(PIECES[id].cells).toHaveLength(Number(id[1]));
  });

  it.each(PIECE_IDS)('%s: 정규화돼 있고 이어져 있다', (id) => {
    const { cells } = PIECES[id];
    expect(cells).toEqual(normalize(cells));
    expect(isConnected(cells)).toBe(true);
  });

  it('색이 모두 다르다', () => {
    const colors = PIECE_IDS.map((id) => PIECES[id].color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it.each(PIECE_IDS)('%s: 어느 방향이든 MAX_PIECE_EXTENT 안에 들어간다', (id) => {
    for (const o of uniqueOrientations(PIECES[id].cells, true)) {
      const { w, h } = shapeSize(orient(PIECES[id].cells, o));
      expect(Math.max(w, h)).toBeLessThanOrEqual(MAX_PIECE_EXTENT);
    }
  });

  it('작은 조각은 펜토미노를 뺀 7종', () => {
    expect(SMALL_PIECE_IDS).toHaveLength(7);
    for (const id of PENTOMINO_IDS) expect(SMALL_PIECE_IDS).not.toContain(id);
  });
});
