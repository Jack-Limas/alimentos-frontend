/** Minimal Web Storage stand-in for Node tests. */
export function createMemoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

/** Storage whose every call throws, like Safari private mode or blocked site data. */
export const throwingStorage = {
  getItem: (): string | null => {
    throw new Error('SecurityError');
  },
  setItem: (): void => {
    throw new Error('QuotaExceededError');
  },
  removeItem: (): void => {
    throw new Error('SecurityError');
  },
};
