import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { claimWakeForTab, WAKE_STORAGE_KEY } from '@/components/pwa/wake-services';
import { readDemoAccounts } from '@/features/auth/demo-accounts';
import {
  ImpactUnavailableError,
  isRegeneration,
  loadImpactForPage,
} from '@/features/impact/impact';
import { MAX_WAKE_URLS, parseWakeUrls, WAKE_TIMEOUT_MS, wakeAll } from '@/features/wake/wake';
import { ApiError, isWakingError, loadErrorKey, NETWORK_ERROR_CODE } from '@/lib/api';
import { createMemoryStorage, throwingStorage } from './helpers/memory-storage';

describe('WAKE_URLS', () => {
  it('reads full http(s) URLs separated by commas, ignoring junk and duplicates', () => {
    expect(
      parseWakeUrls(
        ' https://alimentos-backend.onrender.com/health ,https://alimentos-backend.onrender.com/api/v1/health/ready,' +
          'https://alimentos-ai.onrender.com/health,, not a url, ftp://x.example/file,' +
          'https://alimentos-ai.onrender.com/health',
      ),
    ).toEqual([
      'https://alimentos-backend.onrender.com/health',
      'https://alimentos-backend.onrender.com/api/v1/health/ready',
      'https://alimentos-ai.onrender.com/health',
    ]);
    expect(parseWakeUrls(undefined)).toEqual([]);
    expect(
      parseWakeUrls(
        Array.from({ length: 9 }, (_, i) => `https://h${String(i)}.example/`).join(','),
      ),
    ).toHaveLength(MAX_WAKE_URLS);
  });

  it('pings every URL at once with a 55 s timeout and survives failures', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return url.includes('ai')
        ? Promise.reject(new TypeError('fetch failed'))
        : Promise.resolve(new Response(null, { status: 200 }));
    });

    const ok = await wakeAll(
      ['https://backend.example/health', 'https://ai.example/health'],
      fetchImpl as unknown as typeof fetch,
    );

    expect(ok).toBe(1);
    expect(calls.map((call) => call.url)).toEqual([
      'https://backend.example/health',
      'https://ai.example/health',
    ]);
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0]?.init?.cache).toBe('no-store');
    expect(WAKE_TIMEOUT_MS).toBe(55_000);
  });

  it('/api/wake is not routed through the language proxy', () => {
    // Read as text: importing src/proxy.ts would load next-intl's middleware in Node.
    const source = readFileSync(join(process.cwd(), 'src/proxy.ts'), 'utf8');
    const pattern = /matcher: '([^']+)'/.exec(source)?.[1] ?? '';
    expect(pattern).not.toBe('');
    const matcher = new RegExp(`^${pattern}$`);
    expect(matcher.test('/api/wake')).toBe(false);
    expect(matcher.test('/es/login')).toBe(true);
  });
});

describe('wake once per tab', () => {
  it('claims the wake-up only the first time in a tab (a reload keeps the mark)', () => {
    const storage = createMemoryStorage();
    expect(claimWakeForTab(storage)).toBe(true);
    expect(storage.getItem(WAKE_STORAGE_KEY)).toBe('1');
    expect(claimWakeForTab(storage)).toBe(false);
    // A new tab has its own sessionStorage.
    expect(claimWakeForTab(createMemoryStorage())).toBe(true);
  });

  it('still wakes when storage is missing or throws', () => {
    expect(claimWakeForTab(null)).toBe(true);
    expect(claimWakeForTab(throwingStorage)).toBe(true);
  });
});

describe('server waking up', () => {
  it('treats no answer and 502/503/504 as "waking up", everything else as a load error', () => {
    expect(isWakingError(new ApiError(0, NETWORK_ERROR_CODE, 'fetch failed'))).toBe(true);
    for (const status of [502, 503, 504]) {
      expect(loadErrorKey(new ApiError(status, 'INTERNAL_ERROR', 'x'))).toBe('waking');
    }
    expect(loadErrorKey(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe('loadError');
    expect(loadErrorKey(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('loadError');
    expect(loadErrorKey(new Error('boom'))).toBe('loadError');
  });
});

describe('demo accounts on the login page', () => {
  const full = {
    NEXT_PUBLIC_DEMO_ADMIN_EMAIL: 'demo.admin@alimentaiq.test',
    NEXT_PUBLIC_DEMO_ADMIN_PASSWORD: 'demo-admin-1',
    NEXT_PUBLIC_DEMO_OPERATOR_EMAIL: 'demo.operador@alimentaiq.test',
    NEXT_PUBLIC_DEMO_OPERATOR_PASSWORD: 'demo-operador',
  };

  it('reads both demo accounts from NEXT_PUBLIC_DEMO_*', () => {
    expect(readDemoAccounts(full)).toEqual([
      { role: 'admin', email: 'demo.admin@alimentaiq.test', password: 'demo-admin-1' },
      { role: 'operator', email: 'demo.operador@alimentaiq.test', password: 'demo-operador' },
    ]);
  });

  it('leaves out an incomplete account and shows nothing when none is set', () => {
    expect(readDemoAccounts({ ...full, NEXT_PUBLIC_DEMO_OPERATOR_PASSWORD: ' ' })).toHaveLength(1);
    expect(readDemoAccounts({})).toEqual([]);
  });
});

describe('ISR of /impact keeps the last good version', () => {
  const down = () => Promise.reject(new TypeError('fetch failed'));

  it('knows a regeneration from the build and from dev', () => {
    expect(isRegeneration({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' })).toBe(
      false,
    );
    expect(isRegeneration({ NODE_ENV: 'production' })).toBe(true);
    expect(isRegeneration({ NODE_ENV: 'development' })).toBe(false);
  });

  it('during the build a failure gives the "data not available" fallback', async () => {
    await expect(
      loadImpactForPage({ origin: 'https://api.example', fetchImpl: down, regenerating: false }),
    ).resolves.toBeNull();
  });

  it('during a regeneration a failure throws, so Next keeps serving the previous page', async () => {
    await expect(
      loadImpactForPage({ origin: 'https://api.example', fetchImpl: down, regenerating: true }),
    ).rejects.toBeInstanceOf(ImpactUnavailableError);
  });
});
