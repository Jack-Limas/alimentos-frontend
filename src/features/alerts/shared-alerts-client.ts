import type { AlertsSnapshot, HubMessage, TabMessage } from './shared-protocol';

export type AlertsMode = 'shared' | 'per-tab';

/**
 * SharedWorker is missing in some browsers (Chrome on Android, for example,
 * and older Safari): there every tab polls on its own with TanStack Query,
 * which is what the app did before. The UI is the same in both modes.
 */
export function chooseAlertsMode(scope: { SharedWorker?: unknown }): AlertsMode {
  return typeof scope.SharedWorker === 'function' ? 'shared' : 'per-tab';
}

/** The part of MessagePort the client uses (a fake one in tests). */
export interface PortLike {
  postMessage(message: TabMessage): void;
  onmessage: ((event: MessageEvent<HubMessage>) => void) | null;
  start?(): void;
  close?(): void;
}

/** What the tab knows about the session, from the auth client. */
export interface AuthBridge {
  getToken(): string | null;
  subscribe(listener: () => void): () => void;
  /** The existing single-flight refresh behind the "aiq-refresh" Web Lock. */
  refresh(staleToken: string | null): Promise<string | null>;
}

export interface SharedAlertsState {
  snapshot: AlertsSnapshot | null;
  ports: number;
  polling: boolean;
  error: 'network' | 'server' | null;
  connected: boolean;
}

const INITIAL: SharedAlertsState = Object.freeze({
  snapshot: null,
  ports: 0,
  polling: false,
  error: null,
  connected: false,
});

/**
 * This tab's end of the alerts SharedWorker. Connects on the first
 * subscriber, keeps the worker's token in sync with the session (connect,
 * login, every refresh, logout), refreshes when the worker asks and answers
 * its heartbeats. The token is posted to the worker and never logged.
 */
export function createSharedAlertsClient({
  connect,
  auth,
  apiUrl,
  onPageHide = (handler) => {
    window.addEventListener('pagehide', handler);
    return () => window.removeEventListener('pagehide', handler);
  },
}: {
  connect: () => PortLike;
  auth: AuthBridge;
  apiUrl: string;
  onPageHide?: (handler: () => void) => () => void;
}) {
  let state: SharedAlertsState = INITIAL;
  let port: PortLike | null = null;
  let lastToken: string | null = null;
  let stopAuth: (() => void) | null = null;
  let stopPageHide: (() => void) | null = null;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<SharedAlertsState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };
  const send = (message: TabMessage) => port?.postMessage(message);

  function onMessage(message: HubMessage): void {
    switch (message.type) {
      case 'snapshot':
        set({ snapshot: message.snapshot, error: null });
        return;
      case 'status':
        set({ ports: message.ports, polling: message.polling, error: message.error });
        return;
      case 'cleared':
        set({ snapshot: null });
        return;
      case 'ping':
        send({ type: 'pong' });
        return;
      case 'need-refresh':
        void auth.refresh(auth.getToken()).then((token) => {
          // A new token reaches the worker through the session subscription.
          if (token === null) send({ type: 'refresh-failed' });
        });
        return;
    }
  }

  function open(): void {
    port = connect();
    port.onmessage = (event) => {
      onMessage(event.data);
    };
    port.start?.();
    lastToken = auth.getToken();
    send({ type: 'hello', apiUrl, token: lastToken });
    stopAuth = auth.subscribe(() => {
      const token = auth.getToken();
      if (token === lastToken) return;
      lastToken = token;
      send({ type: 'token', token });
    });
    stopPageHide = onPageHide(() => {
      send({ type: 'bye' });
    });
    set({ connected: true });
  }

  function close(): void {
    send({ type: 'bye' });
    stopAuth?.();
    stopPageHide?.();
    port?.close?.();
    port = null;
    state = INITIAL;
  }

  return {
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      if (port === null) open();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) close();
      };
    },
    getState: () => state,
    refetch: () => {
      send({ type: 'refetch' });
    },
  };
}

export type SharedAlertsClient = ReturnType<typeof createSharedAlertsClient>;
