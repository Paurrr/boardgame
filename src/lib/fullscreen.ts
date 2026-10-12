type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };

const ignore = () => undefined;

export function isFullscreen(): boolean {
  const d = document as FsDocument;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

/** 구형 Chrome은 webkit 접두사 버전만 있다 */
export function canFullscreen(): boolean {
  const el = document.documentElement as FsElement;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

export function toggleFullscreen(): void {
  const d = document as FsDocument;
  const el = document.documentElement as FsElement;
  try {
    if (isFullscreen()) {
      if (typeof d.exitFullscreen === 'function') d.exitFullscreen().catch(ignore);
      else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
    } else if (typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(ignore);
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } catch {
    // 지원하지 않으면 아무것도 하지 않는다
  }
}
