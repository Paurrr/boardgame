export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

/** localStorage를 쓸 수 없으면(사생활 보호 모드 등) 메모리에만 저장한다 */
export function browserStore(): KeyValueStore {
  try {
    const ls = window.localStorage;
    ls.setItem('__probe__', '1');
    ls.removeItem('__probe__');
    return ls;
  } catch {
    return memoryStore();
  }
}
