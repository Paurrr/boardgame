/** 주소에 ?dev 표시가 있는가 (숨긴 게임을 메뉴에 보인다) */
export function isDevMode(search: string): boolean {
  return new URLSearchParams(search).has('dev');
}
