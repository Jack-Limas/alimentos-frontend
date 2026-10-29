// Alerts SharedWorker: one GET /alerts poll every minute for all the tabs of
// this origin (see features/alerts/alerts-hub.ts). Started from
// shared-alerts-client.ts with `new SharedWorker(new URL(...), { type: 'module' })`.
// Never logs: the access token passes through here.
import { createAlertsHub, fetchAlertsWithToken, type PortLike } from '@/features/alerts/alerts-hub';
import type { HubMessage, TabMessage } from '@/features/alerts/shared-protocol';

interface Port extends PortLike {
  onmessage: ((event: MessageEvent<TabMessage>) => void) | null;
  start(): void;
}

// The project's TypeScript lib is "dom": only onconnect of the shared worker scope is used.
const scope = self as unknown as {
  onconnect: ((event: MessageEvent & { ports: readonly MessagePort[] }) => void) | null;
};

const hub = createAlertsHub({
  fetchAlerts: (apiUrl, token) => fetchAlertsWithToken(apiUrl, token),
});

scope.onconnect = (event) => {
  const port = event.ports[0] as unknown as Port | undefined;
  if (!port) return;
  const typed: PortLike = { postMessage: (message: HubMessage) => port.postMessage(message) };
  hub.connect(typed);
  port.onmessage = (message) => {
    hub.receive(typed, message.data);
  };
  port.start();
};
