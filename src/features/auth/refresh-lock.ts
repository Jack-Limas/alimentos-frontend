export const REFRESH_LOCK_NAME = 'aiq-refresh';

/** Runs a task while holding an exclusive lock and returns its result. */
export type LockRunner = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Exclusive lock shared by every tab of this origin (Web Locks API). Browsers
 * without `navigator.locks` run the task directly: the in-tab single-flight
 * still applies, only the cross-tab guarantee is lost.
 */
export function createWebLockRunner(name: string = REFRESH_LOCK_NAME): LockRunner {
  return <T>(task: () => Promise<T>): Promise<T> => {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    if (locks === undefined) return task();
    return locks.request(name, { mode: 'exclusive' }, task);
  };
}
