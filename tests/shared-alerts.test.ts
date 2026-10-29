import { describe, expect, it, vi } from 'vitest';
import {
  createAlertsHub,
  fetchAlertsWithToken,
  HEARTBEAT_MS,
  type FetchResult,
  type PortLike,
} from '@/features/alerts/alerts-hub';
import {
  chooseAlertsMode,
  createSharedAlertsClient,
  type PortLike as TabPort,
} from '@/features/alerts/shared-alerts-client';
import type { HubMessage, TabMessage } from '@/features/alerts/shared-protocol';
import type { Alert } from '@/features/alerts/types';

const TOKEN = 'eyJ.secret.token-value';
const alert = (severity: Alert['severity']): Alert =>
  ({
    type: 'LOW_STOCK',
    severity,
    entity: 'Product',
    entityId: 'p',
    code: 'OUT_OF_STOCK',
    params: {},
  }) as Alert;

/** A fake port that records what the hub sends it. */
const port = () => {
  const received: HubMessage[] = [];
  return { received, postMessage: (m: HubMessage) => received.push(m) } satisfies PortLike & {
    received: HubMessage[];
  };
};

function setup(
  results: FetchResult[] = [{ status: 'ok', alerts: [alert('CRITICAL'), alert('WARNING')] }],
) {
  let now = 1_000;
  const timers: { fn: () => void; ms: number }[] = [];
  const calls: { apiUrl: string; token: string }[] = [];
  const hub = createAlertsHub({
    now: () => now,
    setInterval: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearInterval: () => undefined,
    fetchAlerts: (apiUrl, token) => {
      calls.push({ apiUrl, token });
      return Promise.resolve(
        results[Math.min(calls.length - 1, results.length - 1)] as FetchResult,
      );
    },
  });
  return { hub, calls, timers, advance: (ms: number) => (now += ms) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const of = <T extends HubMessage['type']>(p: { received: HubMessage[] }, type: T) =>
  p.received.filter((m): m is Extract<HubMessage, { type: T }> => m.type === type);

describe('alerts hub (SharedWorker logic)', () => {
  it('polls once for every tab and broadcasts counts, alerts and fetchedAt to all', async () => {
    const { hub, calls } = setup();
    const [a, b, c] = [port(), port(), port()];
    for (const p of [a, b, c]) hub.connect(p);
    hub.receive(a, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    hub.receive(b, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    hub.receive(c, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();

    expect(calls).toEqual([{ apiUrl: 'http://api', token: TOKEN }]);
    for (const p of [a, b, c]) {
      expect(of(p, 'snapshot').at(-1)?.snapshot).toMatchObject({
        counts: { CRITICAL: 1, WARNING: 1, INFO: 0 },
        fetchedAt: 1_000,
      });
      expect(of(p, 'status').at(-1)).toMatchObject({ ports: 3, polling: true, error: null });
    }
    expect(hub.state()).toMatchObject({ ports: 3, polling: true });
  });

  it('polls every 60 s and gives a new tab the current snapshot without a request', async () => {
    const { hub, calls, timers } = setup();
    const a = port();
    hub.connect(a);
    hub.receive(a, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();
    expect(timers.map((t) => t.ms)).toEqual([HEARTBEAT_MS, 60_000]);

    const late = port();
    hub.connect(late);
    expect(of(late, 'snapshot')).toHaveLength(1);
    expect(calls).toHaveLength(1);

    timers[1]?.fn();
    await flush();
    expect(calls).toHaveLength(2);
  });

  it('does not poll again when another tab brings a new token and there is a snapshot', async () => {
    const { hub, calls } = setup();
    const [a, b] = [port(), port()];
    hub.connect(a);
    hub.connect(b);
    hub.receive(a, { type: 'hello', apiUrl: 'http://api', token: 'token-of-a' });
    await flush();
    hub.receive(b, { type: 'hello', apiUrl: 'http://api', token: 'token-of-b' });
    hub.receive(a, { type: 'token', token: 'refreshed-a' });
    await flush();
    expect(calls).toHaveLength(1);
    expect(hub.state()).toMatchObject({ polling: true, hasToken: true });
  });

  it('does not poll without a token', async () => {
    const { hub, calls } = setup();
    const a = port();
    hub.connect(a);
    hub.receive(a, { type: 'hello', apiUrl: 'http://api', token: null });
    await flush();
    expect(calls).toHaveLength(0);
    expect(hub.state().polling).toBe(false);
  });

  it('on a 401 asks the newest tab to refresh and resumes with the new token', async () => {
    const { hub, calls, advance } = setup([
      { status: 'unauthorized' },
      { status: 'ok', alerts: [alert('INFO')] },
    ]);
    const [older, newer] = [port(), port()];
    hub.connect(older);
    advance(10);
    hub.connect(newer);
    hub.receive(older, { type: 'hello', apiUrl: 'http://api', token: 'expired' });
    await flush();

    expect(of(newer, 'need-refresh')).toHaveLength(1);
    expect(of(older, 'need-refresh')).toHaveLength(0);
    expect(hub.state().awaitingRefresh).toBe(true);
    // While waiting, no request with the rejected token.
    await hub.poll();
    expect(calls).toHaveLength(1);

    hub.receive(newer, { type: 'token', token: TOKEN });
    await flush();
    expect(calls.at(-1)).toEqual({ apiUrl: 'http://api', token: TOKEN });
    expect(of(older, 'snapshot').at(-1)?.snapshot.counts.INFO).toBe(1);
  });

  it('stops and clears everything when the session ends (logout or failed refresh)', async () => {
    const { hub } = setup();
    const a = port();
    hub.connect(a);
    hub.receive(a, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();

    hub.receive(a, { type: 'token', token: null });
    expect(of(a, 'cleared')).toHaveLength(1);
    expect(hub.state()).toMatchObject({ polling: false, hasToken: false, snapshot: null });

    hub.receive(a, { type: 'token', token: TOKEN });
    await flush();
    hub.receive(a, { type: 'refresh-failed' });
    expect(hub.state()).toMatchObject({ polling: false, hasToken: false });
  });

  it('drops ports that stop answering the heartbeat and those that say bye', async () => {
    const { hub, advance } = setup();
    const [alive, dead, leaving] = [port(), port(), port()];
    for (const p of [alive, dead, leaving]) hub.connect(p);
    hub.receive(alive, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();

    hub.receive(leaving, { type: 'bye' });
    expect(hub.state().ports).toBe(2);

    advance(HEARTBEAT_MS);
    hub.heartbeat();
    hub.receive(alive, { type: 'pong' });
    advance(HEARTBEAT_MS + 1);
    hub.heartbeat();
    expect(hub.state().ports).toBe(1);
    expect(of(alive, 'ping').length).toBeGreaterThan(0);

    hub.receive(alive, { type: 'bye' });
    expect(hub.state()).toMatchObject({ ports: 0, polling: false });
  });

  it('takes back a dropped port that speaks again and resumes polling for it', async () => {
    const { hub, advance } = setup();
    const frozen = port();
    hub.connect(frozen);
    hub.receive(frozen, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();
    advance(HEARTBEAT_MS * 3);
    hub.heartbeat();
    expect(hub.state()).toMatchObject({ ports: 0, polling: false });

    // The tab wakes up and says hello again.
    hub.receive(frozen, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    expect(hub.state()).toMatchObject({ ports: 1, polling: true });
    expect(of(frozen, 'snapshot').length).toBeGreaterThanOrEqual(2);
    // A late bye from an unknown port does nothing.
    const stranger = port();
    hub.receive(stranger, { type: 'bye' });
    expect(hub.state().ports).toBe(1);
  });

  it('polls at once when a rejoin restarts polling after a due poll', async () => {
    const { hub, calls, advance } = setup();
    const tab = port();
    hub.connect(tab);
    hub.receive(tab, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();
    expect(calls).toHaveLength(1);
    // Dropped and back within the minute: no extra request.
    advance(HEARTBEAT_MS * 3);
    hub.heartbeat();
    hub.receive(tab, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();
    expect(calls).toHaveLength(1);
    // Dropped again and back after the minute: the poll that the restart skipped happens now.
    advance(HEARTBEAT_MS * 2 + 1);
    hub.heartbeat();
    expect(hub.state().polling).toBe(false);
    hub.receive(tab, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();
    expect(calls).toHaveLength(2);
  });

  it('keeps the last snapshot on a network error and reports it', async () => {
    const { hub } = setup([
      { status: 'ok', alerts: [alert('WARNING')] },
      { status: 'error', kind: 'network' },
    ]);
    const a = port();
    hub.connect(a);
    hub.receive(a, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();
    await hub.poll();
    expect(of(a, 'status').at(-1)?.error).toBe('network');
    expect(hub.state().snapshot?.counts.WARNING).toBe(1);
  });

  it('never logs the token and never sends it back to a tab', async () => {
    const log = vi.spyOn(console, 'log');
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const { hub } = setup([{ status: 'unauthorized' }]);
    const a = port();
    hub.connect(a);
    hub.receive(a, { type: 'hello', apiUrl: 'http://api', token: TOKEN });
    await flush();

    expect(JSON.stringify(a.received)).not.toContain(TOKEN);
    for (const spy of [log, warn, error]) expect(spy).not.toHaveBeenCalled();
  });
});

describe('fetchAlertsWithToken', () => {
  const json = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

  it('sends the Bearer token without cookies and maps the answers', async () => {
    const fetchImpl = vi.fn(() => json(200, { data: [alert('CRITICAL')] }));
    await expect(
      fetchAlertsWithToken('http://api', TOKEN, fetchImpl as never),
    ).resolves.toMatchObject({ status: 'ok' });
    expect(fetchImpl).toHaveBeenCalledWith('http://api/api/v1/alerts', {
      headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
    });
    await expect(
      fetchAlertsWithToken('http://api', TOKEN, (() => json(401, {})) as never),
    ).resolves.toEqual({ status: 'unauthorized' });
    await expect(
      fetchAlertsWithToken('http://api', TOKEN, (() => json(500, {})) as never),
    ).resolves.toEqual({ status: 'error', kind: 'server' });
    await expect(
      fetchAlertsWithToken('http://api', TOKEN, (() =>
        Promise.reject(new TypeError('offline'))) as never),
    ).resolves.toEqual({ status: 'error', kind: 'network' });
  });
});

describe('tab side', () => {
  it('uses the shared worker when it exists and per-tab polling otherwise', () => {
    expect(chooseAlertsMode({ SharedWorker: class {} })).toBe('shared');
    expect(chooseAlertsMode({})).toBe('per-tab');
  });

  function tab(initialToken: string | null) {
    const sent: TabMessage[] = [];
    let token = initialToken;
    const authListeners = new Set<() => void>();
    let pageHide: (() => void) | null = null;
    const fakePort: TabPort = { postMessage: (m) => sent.push(m), onmessage: null, close: vi.fn() };
    const refresh = vi.fn<(stale: string | null) => Promise<string | null>>(() =>
      Promise.resolve('fresh-token'),
    );
    const client = createSharedAlertsClient({
      connect: () => fakePort,
      apiUrl: 'http://api',
      auth: {
        getToken: () => token,
        subscribe: (l) => {
          authListeners.add(l);
          return () => authListeners.delete(l);
        },
        refresh,
      },
      onPageHide: (handler) => {
        pageHide = handler;
        return () => (pageHide = null);
      },
    });
    const deliver = (message: HubMessage) =>
      fakePort.onmessage?.({ data: message } as MessageEvent<HubMessage>);
    const setToken = (next: string | null) => {
      token = next;
      authListeners.forEach((l) => l());
    };
    return { client, sent, deliver, setToken, refresh, hide: () => pageHide?.() };
  }

  it('connects on the first subscriber and sends the token on hello, login, refresh and logout', () => {
    const t = tab(null);
    const stop = t.client.subscribe(() => undefined);
    t.setToken('login-token');
    t.setToken('login-token');
    t.setToken('refreshed-token');
    t.setToken(null);
    expect(t.sent).toEqual([
      { type: 'hello', apiUrl: 'http://api', token: null },
      { type: 'token', token: 'login-token' },
      { type: 'token', token: 'refreshed-token' },
      { type: 'token', token: null },
    ]);
    stop();
    expect(t.sent.at(-1)).toEqual({ type: 'bye' });
  });

  it('refreshes through the auth client when the worker asks, answers pings and says bye on pagehide', async () => {
    const t = tab('old');
    t.client.subscribe(() => undefined);
    t.deliver({ type: 'need-refresh' });
    t.deliver({ type: 'ping' });
    await flush();
    expect(t.refresh).toHaveBeenCalledWith('old');
    expect(t.sent).toContainEqual({ type: 'pong' });
    t.hide();
    expect(t.sent.at(-1)).toEqual({ type: 'bye' });
  });

  it('tells the worker when the refresh failed', async () => {
    const t = tab('old');
    t.refresh.mockResolvedValueOnce(null);
    t.client.subscribe(() => undefined);
    t.deliver({ type: 'need-refresh' });
    await flush();
    expect(t.sent).toContainEqual({ type: 'refresh-failed' });
  });

  it('says hello again when the worker has been silent for too long (dropped while frozen)', () => {
    let now = 0;
    const timers: (() => void)[] = [];
    const sent: TabMessage[] = [];
    const fakePort: TabPort = { postMessage: (m) => sent.push(m), onmessage: null };
    const client = createSharedAlertsClient({
      connect: () => fakePort,
      apiUrl: 'http://api',
      auth: {
        getToken: () => 'tok',
        subscribe: () => () => undefined,
        refresh: () => Promise.resolve('tok'),
      },
      onPageHide: () => () => undefined,
      now: () => now,
      setInterval: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearInterval: () => undefined,
    });
    client.subscribe(() => undefined);
    now = 20_000;
    timers.forEach((fn) => fn());
    expect(sent.filter((m) => m.type === 'hello')).toHaveLength(1);
    fakePort.onmessage?.({ data: { type: 'ping' } } as MessageEvent<HubMessage>);
    now = 40_000;
    timers.forEach((fn) => fn());
    expect(sent.filter((m) => m.type === 'hello')).toHaveLength(1);
    now = 80_000;
    timers.forEach((fn) => fn());
    expect(sent.filter((m) => m.type === 'hello')).toHaveLength(2);
  });

  it('exposes snapshots and status to the UI', () => {
    const t = tab('x');
    const listener = vi.fn();
    t.client.subscribe(listener);
    t.deliver({ type: 'status', ports: 3, polling: true, error: null });
    t.deliver({
      type: 'snapshot',
      snapshot: { alerts: [], counts: { CRITICAL: 0, WARNING: 0, INFO: 0 }, fetchedAt: 5 },
    });
    expect(t.client.getState()).toMatchObject({ ports: 3, polling: true, connected: true });
    expect(t.client.getState().snapshot?.fetchedAt).toBe(5);
    t.deliver({ type: 'cleared' });
    expect(t.client.getState().snapshot).toBeNull();
    expect(listener).toHaveBeenCalled();
  });
});
