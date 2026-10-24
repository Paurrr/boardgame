import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STACK_PIECES } from '../logic/pieces';
import type { Vec3 } from '../logic/types';
import { makeCamera, project, rotMat } from './camera';
import { CubeScene } from './CubeScene';
import type { SceneCube } from './CubeScene';
import styles from './CubeScene.module.css';

const cam = makeCamera(30, 50);
const toScreen = (p: Vec3) => project(cam, p);

const cube = (x: number, y: number, z: number, more: Partial<SceneCube> = {}): SceneCube => ({
  pos: { x, y, z },
  kind: 'piece',
  group: 'a',
  color: STACK_PIECES.L4.color,
  ...more,
});

function draw(cubes: SceneCube[]) {
  const { container } = render(
    <svg>
      <CubeScene cam={cam} toScreen={toScreen} cubes={cubes} />
    </svg>,
  );
  return {
    faces: container.querySelectorAll(`polygon.${styles.face}`),
    ghosts: container.querySelectorAll(`polygon.${styles.ghost}`),
    shades: container.querySelectorAll(`polygon.${styles.shade}`),
    groups: Array.from(container.querySelectorAll('g[data-piece]')),
    container,
  };
}

describe('CubeScene', () => {
  it('정육면체 하나는 보이는 면 3개(+x, +y, +z)와 옆면 음영 2개다', () => {
    const { faces, shades } = draw([cube(0, 0, 0)]);
    expect(faces).toHaveLength(3);
    // 윗면은 n.z = 1이라 음영이 없다
    expect(shades).toHaveLength(2);
  });

  it('같은 group에서 맞닿은 면은 그리지 않는다', () => {
    expect(draw([cube(0, 0, 0), cube(1, 0, 0)]).faces).toHaveLength(5);
  });

  it('group이 다르면 맞닿아도 면을 그린다', () => {
    expect(draw([cube(0, 0, 0), cube(1, 0, 0, { group: 'b' })]).faces).toHaveLength(6);
  });

  it('먼 정육면체부터 그린다 (앞이 나중)', () => {
    const { groups } = draw([cube(1, 0, 0, { pieceId: 'L4', group: 'b' }), cube(0, 0, 0, { pieceId: 'I3' })]);
    expect(groups.map((g) => g.getAttribute('data-piece'))).toEqual(['I3', 'L4']);
  });

  it('빈칸(ghost)은 fill 속성 없이 ghost 클래스로 그린다', () => {
    const { faces, ghosts } = draw([{ pos: { x: 0, y: 0, z: 0 }, kind: 'ghost', group: 'ghost' }]);
    expect(faces).toHaveLength(0);
    expect(ghosts).toHaveLength(3);
    for (const g of ghosts) expect(g).not.toHaveAttribute('fill');
  });

  it('빈칸은 group과 무관하게 xf 없는 칸과 맞닿은 면을 생략한다', () => {
    const ghost: SceneCube = { pos: { x: 0, y: 0, z: 0 }, kind: 'ghost', group: 'ghost' };
    expect(draw([ghost, cube(1, 0, 0)]).ghosts).toHaveLength(2);
    // 회전 애니메이션 중인 칸은 자리가 비어 보이므로 생략하지 않는다
    const xf = { M: rotMat({ x: 0, y: 0, z: 1 }, 0.3), pivot: { x: 1.5, y: 0.5, z: 0.5 } };
    expect(draw([ghost, cube(1, 0, 0, { xf })]).ghosts).toHaveLength(3);
  });

  it('pieceId를 data-piece로 단다', () => {
    const { groups } = draw([cube(0, 0, 0, { pieceId: 'L4' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveAttribute('data-piece', 'L4');
  });

  it('xray면 정육면체 그룹에 가림 클래스를 단다', () => {
    const { container } = draw([cube(0, 0, 0, { pieceId: 'L4', xray: true }), cube(3, 0, 0, { pieceId: 'I3' })]);
    expect(container.querySelector('[data-piece="L4"]')).toHaveClass(styles.xray);
    expect(container.querySelector('[data-piece="I3"]')).not.toHaveClass(styles.xray);
  });
});
