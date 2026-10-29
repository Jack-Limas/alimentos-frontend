import {
  countAlerts,
  type AlertsSnapshot,
  type HubMessage,
  type TabMessage,
} from './shared-protocol';
import type { Alert } from './types';

export const POLL_MS = 60_000;
export const HEARTBEAT_MS = 15_000;
/** A port that missed this many heartbeats is considered closed. */
export const MISSED_HEARTBEATS = 2;

/** The part of a MessagePort the hub uses. */
export interface PortLike {
  postMessage(message: HubMessage): void;
}

export type FetchResult =
  | { status: 'ok'; alerts: Alert[] }
  | { status: 'unauthorized' }
  | { status: 'error'; kind: 'network' | 'server' };

export interface HubDeps {
  fetchAlerts: (apiUrl: string, token: string) => Promise<FetchResult>;
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
  pollMs?: number;
  heartbeatMs?: number;
}

interface PortState {
  lastSeen: number;
  connectedAt: number;
}

/**
 * The logic of the alerts SharedWorker, without the worker: one poll of
 * GET /alerts every minute for every tab, fanned out to all connected ports.
 * - Tabs send the access token (hello, after login, after each refresh, null
 *   on logout). Without a token nothing is polled.
 * - On a 401 one tab (the most recently connected) is asked to refresh; its
 *   new token restarts the poll. The tab refreshes with the existing Web Lock
 *   coordination, so the worker never calls /auth/refresh itself.
 * - Heartbeats drop ports whose tab died without saying bye.
 * The token is kept in memory only and never logged or sent back.
 */
export function createAlertsHub({
  fetchAlerts,
  now = Date.now,
  setInterval: startInterval = (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: stopInterval = (handle) => {
    globalThis.clearInterval(handle as ReturnType<typeof globalThis.setInterval>);
  },
  pollMs = POLL_MS,
  heartbeatMs = HEARTBEAT_MS,
}: HubDeps) {
  const ports = new Map<PortLike, PortState>();
  let apiUrl: string | null = null;
  let token: string | null = null;
  let snapshot: AlertsSnapshot | null = null;
  let error: 'network' | 'server' | null = null;
  let pollTimer: unknown = null;
  let heartbeatTimer: unknown = null;
  let awaitingRefresh = false;
  let inFlight: Promise<void> | null = null;

  const broadcast = (message: HubMessage) => {
    for (const port of ports.keys()) port.postMessage(message);
  };
  const status = (): HubMessage => ({
    type: 'status',
    ports: ports.size,
    polling: pollTimer !== null,
    error,
  });

  function startPolling(): void {
    if (pollTimer === null && token !== null && ports.size > 0) {
      pollTimer = startInterval(() => void poll(), pollMs);
      // Polling restarts when a dropped tab rejoins: if the last poll is already
      // due, do it now, or tabs that keep dropping and rejoining would reset the
      // 60 s timer forever and never get new alerts.
      if (snapshot !== null && now() - snapshot.fetchedAt >= pollMs) void poll();
    }
  }

  function stopPolling(): void {
    if (pollTimer !== null) stopInterval(pollTimer);
    pollTimer = null;
  }

  function poll(): Promise<void> {
    if (token === null || apiUrl === null || awaitingRefresh) return Promise.resolve();
    // One request at a time, however many tabs ask.
    inFlight ??= (async () => {
      const used = token;
      const result = await fetchAlerts(apiUrl ?? '', used ?? '');
      if (token !== used) return; // logged out or refreshed meanwhile
      if (result.status === 'ok') {
        error = null;
        snapshot = { alerts: result.alerts, counts: countAlerts(result.alerts), fetchedAt: now() };
        broadcast({ type: 'snapshot', snapshot });
      } else if (result.status === 'unauthorized') {
        requestRefresh();
      } else {
        // Keep the last good snapshot; tabs show it with an error status.
        error = result.kind;
      }
      broadcast(status());
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  function requestRefresh(): void {
    awaitingRefresh = true;
    // The newest tab is the most likely to be in the foreground.
    const newest = [...ports].sort((a, b) => b[1].connectedAt - a[1].connectedAt)[0]?.[0];
    newest?.postMessage({ type: 'need-refresh' });
  }

  function setToken(next: string | null): void {
    const changed = next !== token;
    token = next;
    if (next === null) {
      awaitingRefresh = false;
      snapshot = null;
      error = null;
      stopPolling();
      if (changed) broadcast({ type: 'cleared' });
      broadcast(status());
      return;
    }
    // Every tab bootstraps with its own refresh, so tokens change often: a new
    // token only triggers a request when there is nothing to show yet or the
    // last one was rejected; otherwise the 60 s rhythm goes on with it.
    const fetchNow = snapshot === null || awaitingRefresh;
    awaitingRefresh = false;
    startPolling();
    if (changed && fetchNow) void poll();
  }

  function heartbeat(): void {
    const limit = now() - heartbeatMs * MISSED_HEARTBEATS;
    for (const [port, state] of ports) {
      if (state.lastSeen < limit) ports.delete(port);
    }
    if (ports.size === 0) {
      stopPolling();
      return;
    }
    broadcast({ type: 'ping' });
  }

  function remove(port: PortLike): void {
    ports.delete(port);
    if (ports.size === 0) stopPolling();
    else broadcast(status());
  }

  function connect(port: PortLike): void {
    ports.set(port, { lastSeen: now(), connectedAt: now() });
    heartbeatTimer ??= startInterval(heartbeat, heartbeatMs);
    // A new tab sees the current alerts at once, without a request of its own.
    if (snapshot) port.postMessage({ type: 'snapshot', snapshot });
    startPolling();
    broadcast(status());
  }

  return {
    connect,

    receive(port: PortLike, message: TabMessage): void {
      // A port dropped by the heartbeat (a frozen background tab) that speaks again
      // is alive: it is registered again and gets the current alerts.
      if (!ports.has(port)) {
        if (message.type === 'bye') return;
        connect(port);
      }
      const state = ports.get(port);
      if (!state) return;
      state.lastSeen = now();
      switch (message.type) {
        case 'hello':
          apiUrl = message.apiUrl;
          if (message.token !== null) setToken(message.token);
          else broadcast(status());
          return;
        case 'token':
          setToken(message.token);
          return;
        case 'refresh-failed':
          setToken(null);
          return;
        case 'refetch':
          void poll();
          return;
        case 'pong':
          return;
        case 'bye':
          remove(port);
          return;
      }
    },

    /** For tests and the worker's own timers. */
    poll,
    heartbeat,
    state: () => ({
      ports: ports.size,
      polling: pollTimer !== null,
      hasToken: token !== null,
      awaitingRefresh,
      snapshot,
    }),
  };
}

export type AlertsHub = ReturnType<typeof createAlertsHub>;

/** fetch for the worker: Bearer token, no cookies, mapped to the hub's results. */
export async function fetchAlertsWithToken(
  apiUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchResult> {
  try {
    const response = await fetchImpl(`${apiUrl}/api/v1/alerts`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
    });
    if (response.status === 401) return { status: 'unauthorized' };
    if (!response.ok) return { status: 'error', kind: 'server' };
    const body = (await response.json()) as { data: Alert[] };
    return { status: 'ok', alerts: body.data };
  } catch {
    return { status: 'error', kind: 'network' };
  }
}
