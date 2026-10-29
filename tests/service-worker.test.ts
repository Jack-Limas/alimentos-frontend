import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import {
  serviceWorkerUrl,
  shouldRegister,
  versionOf,
  watchForUpdates,
  type RegistrationLike,
} from '@/features/pwa/service-worker';

interface StrategyInput {
  url: string;
  method: string;
  mode: string;
  hasAuthorization: boolean;
  origin: string;
}

interface SwApi {
  VERSION: string;
  STATIC_CACHE: string;
  PAGES_CACHE: string;
  PRECACHE: string[];
  strategyFor(input: StrategyInput): string;
  offlinePageFor(pathname: string): string;
  staleCaches(names: string[], version: string): string[];
  assetsIn(html: string): string[];
  cacheable(response: unknown): boolean;
}

/** Runs the real public/sw.js in a sandbox and returns what it exposes. */
function loadServiceWorker(scriptUrl = 'https://app.example/sw.js?v=abc123') {
  const listeners: Record<string, unknown> = {};
  const self: Record<string, unknown> = {
    location: new URL(scriptUrl),
    addEventListener: (type: string, listener: unknown) => {
      listeners[type] = listener;
    },
  };
  const source = readFileSync(join(import.meta.dirname, '..', 'public', 'sw.js'), 'utf8');
  runInNewContext(source, { self, URL, Set, Promise, Boolean });
  return { sw: self.aiqSw as SwApi, listeners };
}

const ORIGIN = 'https://app.example';
const request = (path: string, overrides: Partial<StrategyInput> = {}): StrategyInput => ({
  url: path.startsWith('http') ? path : `${ORIGIN}${path}`,
  method: 'GET',
  mode: 'no-cors',
  hasAuthorization: false,
  origin: ORIGIN,
  ...overrides,
});

describe('service worker caching strategies (public/sw.js)', () => {
  const { sw, listeners } = loadServiceWorker();

  it('scopes its caches to the build version from the script URL', () => {
    expect(sw.VERSION).toBe('abc123');
    expect([sw.STATIC_CACHE, sw.PAGES_CACHE]).toEqual(['aiq-static-abc123', 'aiq-pages-abc123']);
    expect(sw.PRECACHE).toEqual(['/es/offline', '/en/offline', '/icon.svg']);
    expect(Object.keys(listeners).sort()).toEqual(['activate', 'fetch', 'install', 'message']);
  });

  it('caches hashed static files first and navigations network-first', () => {
    expect(sw.strategyFor(request('/_next/static/chunks/abc.js'))).toBe('cache-first');
    expect(sw.strategyFor(request('/_next/static/media/font.woff2'))).toBe('cache-first');
    expect(sw.strategyFor(request('/es/app/orders', { mode: 'navigate' }))).toBe('network-first');
    expect(sw.strategyFor(request('/en', { mode: 'navigate' }))).toBe('network-first');
  });

  it('never caches the API, other origins, authentication, non-GET or Authorization requests', () => {
    expect(sw.strategyFor(request('/api/v1/alerts'))).toBe('bypass');
    expect(sw.strategyFor(request('/api'))).toBe('bypass');
    expect(
      sw.strategyFor(request('https://api.example/api/v1/auth/refresh', { method: 'POST' })),
    ).toBe('bypass');
    expect(sw.strategyFor(request('https://api.example/api/v1/alerts'))).toBe('bypass');
    expect(sw.strategyFor(request('/_next/static/x.js', { hasAuthorization: true }))).toBe(
      'bypass',
    );
    expect(sw.strategyFor(request('/es/app', { mode: 'navigate', method: 'POST' }))).toBe('bypass');
    expect(sw.strategyFor(request('/es/login', { mode: 'navigate' }))).toBe('network-only');
    expect(sw.strategyFor(request('/en/login?next=%2Fen%2Fapp', { mode: 'navigate' }))).toBe(
      'network-only',
    );
    // Other same-origin files are left to the browser's HTTP cache.
    expect(sw.strategyFor(request('/icon.svg'))).toBe('bypass');
  });

  it('falls back to the offline page in the language of the URL', () => {
    expect(sw.offlinePageFor('/en/app/orders')).toBe('/en/offline');
    expect(sw.offlinePageFor('/en')).toBe('/en/offline');
    expect(sw.offlinePageFor('/es/app')).toBe('/es/offline');
    expect(sw.offlinePageFor('/english-thing')).toBe('/es/offline');
  });

  it('deletes only the caches of other versions on activate', () => {
    expect(
      sw.staleCaches(
        ['aiq-static-old', 'aiq-pages-old', 'aiq-static-abc123', 'other-lib'],
        'abc123',
      ),
    ).toEqual(['aiq-static-old', 'aiq-pages-old']);
  });

  it('precaches the assets the offline page references', () => {
    const html =
      '<link rel="stylesheet" href="/_next/static/css/app.css"><script src="/_next/static/chunks/main.js"></script>' +
      '<script src="/_next/static/chunks/main.js"></script><style>@font-face{src:url(/_next/static/media/f.woff2)}</style>';
    expect(sw.assetsIn(html)).toEqual([
      '/_next/static/css/app.css',
      '/_next/static/chunks/main.js',
      '/_next/static/media/f.woff2',
    ]);
  });

  it('stores only successful same-origin responses', () => {
    expect(sw.cacheable({ ok: true, type: 'basic' })).toBe(true);
    expect(sw.cacheable({ ok: false, type: 'basic' })).toBe(false);
    expect(sw.cacheable({ ok: true, type: 'opaque' })).toBe(false);
    expect(sw.cacheable(undefined)).toBe(false);
  });
});

describe('service worker registration', () => {
  it('registers only in production and with the build version', () => {
    expect(shouldRegister('production', { navigator: { serviceWorker: {} } })).toBe(true);
    expect(shouldRegister('development', { navigator: { serviceWorker: {} } })).toBe(false);
    expect(shouldRegister('production', { navigator: {} })).toBe(false);
    expect(serviceWorkerUrl('20261029')).toBe('/sw.js?v=20261029');
    expect(serviceWorkerUrl(undefined)).toBe('/sw.js?v=dev');
    expect(versionOf('https://app.example/sw.js?v=abc')).toBe('abc');
    expect(versionOf(null)).toBeNull();
  });

  /** A fake registration that can install a new worker in a given state. */
  function registration() {
    let onUpdateFound: (() => void) | null = null;
    let onStateChange: (() => void) | null = null;
    const reg: RegistrationLike = {
      waiting: null,
      installing: null,
      addEventListener: (_type, listener) => {
        onUpdateFound = listener;
      },
    };
    return {
      reg,
      install(state: string) {
        reg.installing = {
          state,
          addEventListener: (_type, listener) => {
            onStateChange = listener;
          },
        };
        onUpdateFound?.();
        onStateChange?.();
      },
    };
  }

  it('announces a new version only when it waits behind a controlled page', () => {
    const onWaiting = vi.fn();
    const first = registration();
    watchForUpdates(first.reg, () => false, onWaiting);
    first.install('installed');
    expect(onWaiting).not.toHaveBeenCalled();

    const update = registration();
    watchForUpdates(update.reg, () => true, onWaiting);
    update.install('installing');
    expect(onWaiting).not.toHaveBeenCalled();
    update.install('installed');
    expect(onWaiting).toHaveBeenCalledTimes(1);

    const alreadyWaiting = registration();
    alreadyWaiting.reg.waiting = { postMessage: vi.fn() };
    watchForUpdates(alreadyWaiting.reg, () => true, onWaiting);
    expect(onWaiting).toHaveBeenCalledTimes(2);
  });
});
