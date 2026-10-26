import { createBroadcastAuthChannel } from './auth-channel';
import { createAuthClient, type AuthClient } from './auth-client';
import { createWebLockRunner } from './refresh-lock';
import { createSessionStore } from './session-store';

let client: AuthClient | null = null;

/**
 * The tab's auth client. Creating it opens nothing: sessionStorage, the
 * BroadcastChannel and the lock are only touched by bootstrap(), connect() and
 * requests, which run in the browser.
 */
export function getAuthClient(): AuthClient {
  client ??= createAuthClient({
    store: createSessionStore(),
    channel: createBroadcastAuthChannel(),
    runExclusive: createWebLockRunner(),
  });
  return client;
}
