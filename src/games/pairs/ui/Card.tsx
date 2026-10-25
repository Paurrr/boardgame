import { useState } from 'react';
import styles from './Card.module.css';
import { Picture, PictureShape } from './pictures';

/** 카드가 접혔다 펴지며 뒤집히는 시간 */
export const FLIP_MS = 250;

const EDGE = 4; // 테두리가 viewBox 밖으로 잘리지 않게 안쪽으로 들인 만큼
const SIZE = 100 - 2 * EDGE;
const RADIUS = 12;
const PICTURE_SCALE = 0.8;
const PICTURE_AT = (100 - 100 * PICTURE_SCALE) / 2;

function Back({ cover = false }: { cover?: boolean }) {
  return (
    <g data-testid={cover ? undefined : 'card-back'}>
      <rect x={EDGE} y={EDGE} width={SIZE} height={SIZE} rx={RADIUS} className={styles.back} />
      <rect x={16} y={16} width={68} height={68} rx={6} className={styles.backLine} />
      <polygon points="50,30 70,50 50,70 30,50" className={styles.backMark} />
    </g>
  );
}

/** cover: 뒤집히는 동안 바뀌기 전 면을 덮어 보이는 것. 화면에 남은 면으로 세지 않게 testid를 붙이지 않는다 */
function Face({ picture, cover = false }: { picture: number; cover?: boolean }) {
  return (
    <g data-testid={cover ? undefined : 'card-face'}>
      <rect x={EDGE} y={EDGE} width={SIZE} height={SIZE} rx={RADIUS} className={styles.face} />
      <g transform={`translate(${PICTURE_AT} ${PICTURE_AT}) scale(${PICTURE_SCALE})`}>
        {cover ? <PictureShape picture={picture} /> : <Picture picture={picture} />}
      </g>
    </g>
  );
}

const flipStyle = { animationDuration: `${FLIP_MS}ms` };

/**
 * 판의 카드 한 장 (100×100, 부모가 크기를 정한다). 가져간 카드는 점선 빈자리.
 * faceUp이 바뀌면 화면의 면은 바로 바뀌고, FLIP_MS 동안 가로로 접혔다 펴진다.
 * 접히는 앞쪽 절반은 바뀌기 전 면을 덮어 보여서 다 접힌 순간 면이 바뀌어 보인다.
 */
export function Card({ picture, faceUp, taken }: { picture: number; faceUp: boolean; taken: boolean }) {
  const [shown, setShown] = useState(faceUp);
  const [flips, setFlips] = useState(0);
  const [covering, setCovering] = useState(false);
  if (shown !== faceUp) {
    setShown(faceUp);
    setFlips(flips + 1);
    setCovering(true);
  }

  if (taken) {
    return (
      <svg className={styles.card} viewBox="0 0 100 100">
        <rect
          data-testid="empty-slot"
          x={EDGE}
          y={EDGE}
          width={SIZE}
          height={SIZE}
          rx={RADIUS}
          className={styles.empty}
        />
      </svg>
    );
  }

  return (
    <svg className={styles.card} viewBox="0 0 100 100">
      {/* 뒤집을 때마다 key를 바꿔 애니메이션을 처음부터 다시 튼다 */}
      <g key={flips} className={flips > 0 ? styles.flip : undefined} style={flips > 0 ? flipStyle : undefined}>
        {faceUp ? <Face picture={picture} /> : <Back />}
        {covering && (
          <g className={styles.cover} style={flipStyle} onAnimationEnd={() => setCovering(false)}>
            {faceUp ? <Back cover /> : <Face picture={picture} cover />}
          </g>
        )}
      </g>
    </svg>
  );
}
