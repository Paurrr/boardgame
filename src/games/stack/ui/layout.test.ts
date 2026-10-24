import { describe, expect, it } from 'vitest';
import type { Rect } from '../../../lib/rects';
import { STACK_IDS, STACK_PIECES } from '../logic/pieces';
import { centerOf, orientations } from '../logic/rotate';
import { MAX_H } from '../logic/types';
import type { StackPieceId } from '../logic/types';
import { boardOutline, EL_MAX, EL_MIN, makeCamera, project } from './camera';
import type { Pt } from './camera';
import {
  boardBoxSize,
  boardOrigin,
  BTN_DEPTH,
  BTN_GAP,
  BTN_H,
  BTN_W,
  clientToSvg,
  computeLayout,
  GAP,
  looseAreas,
  looseSpot,
  MIN_BUTTON_PX,
  PAD,
  SLOT_PAD,
  slotSizeFor,
  TRAY_SCALE,
} from './layout';

const piecesOf = (ids: readonly StackPieceId[]) => ids.map((id) => ({ cells: STACK_PIECES[id].cells }));
const HARD = piecesOf(['I4', 'L4', 'T4', 'Y4']);
const EASY = piecesOf(['L4', 'T4']);
/** 칠판(1280×720) 4인 칸 하나의 조작 영역 */
const PX_W = 316;
const PX_H = 440;
const hardLayout = (pxW = PX_W, pxH = PX_H) => computeLayout(3, 3, slotSizeFor(HARD, false), 4, 2, pxW, pxH);

/** 맞닿기만 한 것은 겹침이 아니다 (경계 좌표의 소수 오차는 무시) */
const EPS = 1e-9;
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
const around = (c: Pt, w: number, h: number): Rect => ({ x: c.x - w / 2, y: c.y - h / 2, w, h });
const expectNear = (a: Pt, b: Pt) => {
  expect(a.x).toBeCloseTo(b.x, 9);
  expect(a.y).toBeCloseTo(b.y, 9);
};
/** 칸 왼쪽 위·오른쪽 아래 px로 구한 보이는 범위 */
const visible = (l: ReturnType<typeof hardLayout>, pxW = PX_W, pxH = PX_H) => {
  const box = { left: 0, top: 0, width: pxW, height: pxH };
  return { a: clientToSvg(l, box, 0, 0), b: clientToSvg(l, box, pxW, pxH) };
};

describe('boardBoxSize', () => {
  it('너비는 바닥 대각선', () => {
    expect(boardBoxSize(3, 2).w).toBeCloseTo(Math.hypot(3, 2), 12);
  });

  it('높이는 기울기 범위에서 가장 큰 화면 높이', () => {
    // 3×3: diag·sin el + 2·cos el 은 65° 근처에서 가장 크다 (≈ √22)
    expect(boardBoxSize(3, 3).h).toBeCloseTo(Math.sqrt(22), 3);
    const diag = Math.hypot(4, 1);
    for (let el = EL_MIN; el <= EL_MAX; el++) {
      const t = (el * Math.PI) / 180;
      expect(boardBoxSize(4, 1).h).toBeGreaterThanOrEqual(diag * Math.sin(t) + MAX_H * Math.cos(t) - 1e-12);
    }
  });
});

describe('slotSizeFor', () => {
  it('3D 대각선 × 트레이 배율 + 여유', () => {
    expect(slotSizeFor(piecesOf(['I4']), false)).toBeCloseTo(Math.hypot(4, 1, 1) * TRAY_SCALE + SLOT_PAD, 12);
  });

  it('가장 큰 조각에 맞춘다', () => {
    // I3 대각선 √11 < Y4(2×2×2) 대각선 √12
    expect(slotSizeFor(piecesOf(['I3', 'Y4']), false)).toBeCloseTo(Math.sqrt(12) * TRAY_SCALE + SLOT_PAD, 12);
  });

  it('어느 방향·시점에서도 트레이 배율로 그린 조각이 슬롯에 들어간다', () => {
    const half = (slotSizeFor(piecesOf(STACK_IDS), false) - SLOT_PAD) / 2;
    const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    // 조각 가운데(centerOf)를 슬롯 가운데에 두었을 때 가운데에서 가장 먼 꼭짓점까지의 화면 거리 (x·y 따로)
    let reach = 0;
    for (const id of STACK_IDS) {
      for (const cells of orientations(STACK_PIECES[id].cells)) {
        const c = centerOf(cells);
        for (let az = 0; az < 360; az += 30) {
          for (let el = EL_MIN; el <= EL_MAX; el += 10) {
            const cam = makeCamera(az, el);
            for (const cube of cells) {
              for (const [dx, dy, dz] of corners) {
                const s = project(cam, { x: cube.x + dx - c.x, y: cube.y + dy - c.y, z: cube.z + dz - c.z });
                reach = Math.max(reach, Math.abs(s.x), Math.abs(s.y));
              }
            }
          }
        }
      }
    }
    expect(reach * TRAY_SCALE).toBeLessThanOrEqual(half + 1e-9);
  });
});

describe('computeLayout', () => {
  it('칠판 1~4인 칸 어디서든 버튼이 56 CSS px 이상', () => {
    for (const pxW of [316, 423, 636, 1272]) {
      const hard = hardLayout(pxW, PX_H);
      expect(hard.buttonH * hard.scale).toBeGreaterThanOrEqual(MIN_BUTTON_PX);
      const easy = computeLayout(3, 2, slotSizeFor(EASY, true), 2, 1, pxW, PX_H);
      expect(easy.buttonH * easy.scale).toBeGreaterThanOrEqual(MIN_BUTTON_PX);
    }
  });

  it('scale은 xMidYMax meet 배율', () => {
    const l = hardLayout();
    expect(l.scale).toBeCloseTo(Math.min(PX_W / l.vbW, PX_H / l.vbH), 12);
  });

  it('위에서부터 PAD, 판 상자, 버튼 줄, 트레이, PAD 순이다', () => {
    const l = hardLayout();
    const { boardBox: b, buttons: t } = l;
    expect(b.y).toBe(PAD);
    expect(t.y).toBeCloseTo(b.y + b.h + GAP, 12);
    expect(t.h).toBeCloseTo(l.buttonH + BTN_DEPTH, 12);
    const trayTop = Math.min(...l.slots.map((s) => s.y)) - l.slotSize / 2;
    const trayBottom = Math.max(...l.slots.map((s) => s.y)) + l.slotSize / 2;
    expect(trayTop).toBeCloseTo(t.y + t.h + GAP, 12);
    expect(l.vbH).toBeCloseTo(trayBottom + PAD, 12);
  });

  it('판 상자·버튼 줄은 가운데이고 판 상자는 boardBoxSize 크기', () => {
    const l = hardLayout();
    const size = boardBoxSize(3, 3);
    expect(l.boardBox.w).toBeCloseTo(size.w, 12);
    expect(l.boardBox.h).toBeCloseTo(size.h, 12);
    expect(l.boardBox.x + l.boardBox.w / 2).toBeCloseTo(l.vbW / 2, 12);
    expect(l.buttons.w).toBeCloseTo(2 * BTN_W + BTN_GAP, 12);
    expect(l.buttons.x + l.buttons.w / 2).toBeCloseTo(l.vbW / 2, 12);
  });

  it('시점(el)을 받지 않으므로 판 상자가 출렁이지 않는다', () => {
    expect(computeLayout).toHaveLength(7);
    expect(hardLayout().boardBox).toEqual(hardLayout().boardBox);
  });

  it('넓은 칸은 트레이 1줄, 좁은 칸은 2줄', () => {
    expect(new Set(hardLayout(1272, PX_H).slots.map((s) => s.y)).size).toBe(1);
    expect(new Set(hardLayout(316, PX_H).slots.map((s) => s.y)).size).toBe(2);
  });

  it('슬롯은 겹치지 않고 내용 폭 안에 있다', () => {
    for (const pxW of [316, 1272]) {
      const { slots, slotSize, vbW } = hardLayout(pxW, PX_H);
      expect(slots).toHaveLength(4);
      for (let i = 0; i < slots.length; i++) {
        expect(slots[i].x - slotSize / 2).toBeGreaterThanOrEqual(PAD - 1e-12);
        expect(slots[i].x + slotSize / 2).toBeLessThanOrEqual(vbW - PAD + 1e-12);
        for (let j = i + 1; j < slots.length; j++) {
          const dx = Math.abs(slots[i].x - slots[j].x);
          const dy = Math.abs(slots[i].y - slots[j].y);
          expect(dx >= slotSize - 1e-12 || dy >= slotSize - 1e-12).toBe(true);
        }
      }
    }
  });

  it('크기를 아직 모르면 scale 1, 버튼은 기본 높이', () => {
    const l = hardLayout(0, 0);
    expect(l.scale).toBe(1);
    expect(l.buttonH).toBe(BTN_H);
  });
});

describe('boardOrigin', () => {
  it('판 상자 가운데에서 cos el만큼 아래', () => {
    const l = hardLayout();
    const t = (50 * Math.PI) / 180;
    expectNear(boardOrigin(l, 50), {
      x: l.boardBox.x + l.boardBox.w / 2,
      y: l.boardBox.y + l.boardBox.h / 2 + (MAX_H / 2) * Math.cos(t),
    });
  });

  it('어느 시점에서도 판(0~MAX_H층 상자)이 판 상자 안에 들어간다', () => {
    for (const [w, d] of [[3, 3], [4, 2], [2, 1]]) {
      const l = computeLayout(w, d, 2, 2, 2, PX_W, PX_H);
      const b = l.boardBox;
      for (let az = 0; az < 360; az += 15) {
        for (let el = EL_MIN; el <= EL_MAX; el += 5) {
          const o = boardOrigin(l, el);
          for (const p of boardOutline(makeCamera(az, el), w, d)) {
            expect(o.x + p.x).toBeGreaterThanOrEqual(b.x - 1e-9);
            expect(o.x + p.x).toBeLessThanOrEqual(b.x + b.w + 1e-9);
            expect(o.y + p.y).toBeGreaterThanOrEqual(b.y - 1e-9);
            expect(o.y + p.y).toBeLessThanOrEqual(b.y + b.h + 1e-9);
          }
        }
      }
    }
  });
});

describe('clientToSvg', () => {
  const l = hardLayout();

  it('칸이 가로로 남으면 좌우 여백까지 보이는 범위의 모서리로', () => {
    // 배율 10, 가로는 내용의 2배 → 양옆으로 vbW/2씩 남는다
    const box = { left: 100, top: 50, width: l.vbW * 20, height: l.vbH * 10 };
    expectNear(clientToSvg(l, box, 100, 50), { x: -l.vbW / 2, y: 0 });
    expectNear(clientToSvg(l, box, 100 + box.width, 50 + box.height), { x: l.vbW * 1.5, y: l.vbH });
  });

  it('칸이 세로로 남으면 아래 정렬이라 위쪽 여백까지', () => {
    const box = { left: 7, top: 3, width: l.vbW * 10, height: l.vbH * 20 };
    expectNear(clientToSvg(l, box, 7, 3), { x: 0, y: -l.vbH });
    expectNear(clientToSvg(l, box, 7 + box.width, 3 + box.height), { x: l.vbW, y: l.vbH });
    expectNear(clientToSvg(l, box, 7 + box.width / 2, 3 + box.height / 2), { x: l.vbW / 2, y: 0 });
  });

  it('크기를 아직 모르면 1px = 1 판 단위', () => {
    expect(clientToSvg(l, { left: 10, top: 20, width: 0, height: 0 }, 15, 27)).toEqual({ x: 5, y: 7 });
  });
});

describe('looseAreas', () => {
  for (const [pxW, pxH] of [[PX_W, PX_H], [1272, PX_H], [PX_W, 700]]) {
    it(`${pxW}×${pxH}: 판 상자·버튼 줄과 겹치지 않고 보이는 범위의 PAD 안쪽`, () => {
      const l = hardLayout(pxW, pxH);
      const { a, b } = visible(l, pxW, pxH);
      const areas = looseAreas(l, pxW, pxH);
      expect(areas.length).toBeGreaterThan(0);
      for (const r of areas) {
        expect(r.w).toBeGreaterThan(0);
        expect(r.h).toBeGreaterThan(0);
        expect(overlaps(r, l.boardBox)).toBe(false);
        expect(overlaps(r, l.buttons)).toBe(false);
        expect(r.x).toBeGreaterThanOrEqual(a.x + PAD - 1e-9);
        expect(r.y).toBeGreaterThanOrEqual(a.y + PAD - 1e-9);
        expect(r.x + r.w).toBeLessThanOrEqual(b.x - PAD + 1e-9);
        expect(r.y + r.h).toBeLessThanOrEqual(b.y - PAD + 1e-9);
      }
    });
  }

  it('버튼 줄 아래(트레이 자리)는 보이는 폭 전체', () => {
    const l = hardLayout();
    const { a, b } = visible(l);
    const below = { x: a.x + PAD, y: l.buttons.y + l.buttons.h, w: b.x - a.x - 2 * PAD, h: b.y - PAD - (l.buttons.y + l.buttons.h) };
    const found = looseAreas(l, PX_W, PX_H).find((r) => Math.abs(r.y - below.y) < 1e-9 && Math.abs(r.w - below.w) < 1e-9);
    expect(found).toBeDefined();
    expect(found?.x).toBeCloseTo(below.x, 9);
    expect(found?.h).toBeCloseTo(below.h, 9);
  });
});

describe('looseSpot: 버튼 줄·칸 밖에 걸치면 가장 가까운 빈 곳으로', () => {
  const l = hardLayout();
  const W = 1.6;
  const H = 1.6;
  const { a, b } = visible(l);
  const expectFree = (c: Pt, layout = l, pxW = PX_W, pxH = PX_H) => {
    const v = visible(layout, pxW, pxH);
    const r = around(c, W, H);
    expect(overlaps(r, layout.boardBox)).toBe(false);
    expect(overlaps(r, layout.buttons)).toBe(false);
    expect(r.x).toBeGreaterThanOrEqual(v.a.x + PAD - 1e-9);
    expect(r.y).toBeGreaterThanOrEqual(v.a.y + PAD - 1e-9);
    expect(r.x + r.w).toBeLessThanOrEqual(v.b.x - PAD + 1e-9);
    expect(r.y + r.h).toBeLessThanOrEqual(v.b.y - PAD + 1e-9);
  };

  it('버튼 줄과 겹치는 가운데 → 겹치지 않는 가장 가까운 곳(버튼 줄 바로 아래)', () => {
    const t = l.buttons;
    const c = { x: t.x + t.w / 2, y: t.y + t.h * 0.6 };
    const spot = looseSpot(l, PX_W, PX_H, c, W, H);
    expectFree(spot);
    expectNear(spot, { x: c.x, y: t.y + t.h + H / 2 });
  });

  it('판 상자와 겹치는 가운데 → 판 상자 밖으로', () => {
    const c = { x: l.boardBox.x + l.boardBox.w / 2, y: l.boardBox.y + l.boardBox.h / 2 };
    expectFree(looseSpot(l, PX_W, PX_H, c, W, H));
  });

  it('칸 밖 가운데 → 보이는 범위 안으로 들어온다', () => {
    const leftBelow = looseSpot(l, PX_W, PX_H, { x: a.x - 3, y: b.y + 3 }, W, H);
    expectFree(leftBelow);
    expectNear(leftBelow, { x: a.x + PAD + W / 2, y: b.y - PAD - H / 2 });

    const right = looseSpot(l, PX_W, PX_H, { x: b.x + 2, y: l.slots[0].y }, W, H);
    expectFree(right);
    expectNear(right, { x: b.x - PAD - W / 2, y: l.slots[0].y });
  });

  it('이미 빈 곳이면 그대로', () => {
    expect(looseSpot(l, PX_W, PX_H, l.slots[0], W, H)).toEqual(l.slots[0]);
    // 칸이 세로로 길면 판 위쪽 여백에도 둘 수 있다
    const tall = hardLayout(PX_W, 700);
    const above = { x: tall.vbW / 2, y: tall.boardBox.y - 2 };
    expectFree(above, tall, PX_W, 700);
    expect(looseSpot(tall, PX_W, 700, above, W, H)).toEqual(above);
  });
});
