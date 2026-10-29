import { getAuthClient } from '@/features/auth/browser-auth-client';
import { env } from '@/lib/env';
import {
  createSharedAlertsClient,
  type PortLike,
  type SharedAlertsClient,
} from './shared-alerts-client';

let client: SharedAlertsClient | null = null;

/**
 * Keep `new SharedWorker(new URL(...), { type: 'module' })` literal: Turbopack
 * recognizes it and bundles the worker as its own entry point.
 */
function connectWorker(): PortLike {
  const worker = new SharedWorker(
    new URL('../../workers/alerts.shared-worker.ts', import.meta.url),
    {
      type: 'module',
      name: 'aiq-alerts',
    },
  );
  return worker.port as unknown as PortLike;
}

/** One connection per tab, shared by the badge, the dashboard and the alerts page. */
export function getSharedAlertsClient(): SharedAlertsClient {
  const auth = getAuthClient();
  client ??= createSharedAlertsClient({
    connect: connectWorker,
    apiUrl: env.apiUrl,
    auth: {
      getToken: () => auth.store.getState().accessToken,
      subscribe: auth.store.subscribe,
      refresh: (staleToken) => auth.refreshAccessToken(staleToken),
    },
  });
  return client;
}

/** Ask the worker for fresh alerts now (after a change that affects them). */
export function requestSharedAlertsRefetch(): void {
  client?.refetch();
}
