import type { AuthChannel, AuthMessage } from '@/features/auth/auth-channel';
import { createAuthClient } from '@/features/auth/auth-client';
import type { LockRunner } from '@/features/auth/refresh-lock';
import { createSessionStore } from '@/features/auth/session-store';
import { createMemoryStorage } from './memory-storage';

/**
 * In-memory BroadcastChannel: delivers asynchronously to every other channel
 * of the hub (never to the sender), with a structured clone like the real one.
 */
export function createChannelHub() {
  const subscribers = new Set<{ owner: object; listener: (message: AuthMessage) => void }>();

  return function createChannel(): AuthChannel {
    const owner = {};
    return {
      post(message) {
        for (const subscriber of subscribers) {
          if (subscriber.owner === owner) continue;
          queueMicrotask(() => {
            subscriber.listener(structuredClone(message));
          });
        }
      },
      subscribe(listener) {
        const entry = { owner, listener };
        subscribers.add(entry);
        return () => {
          subscribers.delete(entry);
        };
      },
    };
  };
}

/** Exclusive lock shared by the tabs created with it, like navigator.locks. */
export function createMutex(): LockRunner {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task);
    tail = run.catch(() => undefined);
    return run;
  };
}

/** Runs the task with no lock at all (what a browser without Web Locks would do). */
export const noLock: LockRunner = (task) => task();

/**
 * One browser tab: its own sessionStorage and auth client, a shared channel and lock.
 * `localStorage` (shared by the tabs of one browser) holds the signed-in hint; without
 * it the hint is "unknown", as in a browser where storage is blocked.
 */
export function createTab(
  createChannel: () => AuthChannel,
  runExclusive: LockRunner = createMutex(),
  localStorage: ReturnType<typeof createMemoryStorage> | null = null,
) {
  const storage = createMemoryStorage();
  const client = createAuthClient({
    store: createSessionStore(
      () => storage,
      () => localStorage,
    ),
    channel: createChannel(),
    runExclusive,
  });
  const disconnect = client.connect();
  return { storage, client, disconnect };
}

/** Waits for queued channel deliveries and pending timers to settle. */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
