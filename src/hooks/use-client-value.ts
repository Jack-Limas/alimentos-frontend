import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Reads a browser-only value after hydration. The server render (and the first
 * client render) get `serverValue`, so the markup never mismatches.
 * `read` must return a primitive so React can compare snapshots.
 */
export function useClientValue<T extends string | number | boolean | null>(
  read: () => T,
  serverValue: T,
): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}

/** True only after hydration. */
export function useHydrated(): boolean {
  return useClientValue(() => true, false);
}
