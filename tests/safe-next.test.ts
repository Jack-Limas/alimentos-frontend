import { describe, expect, it, vi } from 'vitest';
import { getSafeNextPath, loginPathWithNext, privateHome } from '@/features/auth/safe-next';

describe('getSafeNextPath', () => {
  it.each([
    ['/es/app', '/es/app'],
    ['/es/app/x', '/es/app/x'],
    ['/en/app/inventory/lots', '/en/app/inventory/lots'],
    ['/es/app/x?tab=2#top', '/es/app/x?tab=2#top'],
    ['/es/app/', '/es/app/'],
  ])('accepts %s', (raw, expected) => {
    expect(getSafeNextPath(raw)).toBe(expected);
  });

  it.each([
    ['protocol-relative URL', '//evil.com'],
    ['protocol-relative URL into the app path', '//evil.com/es/app'],
    ['absolute URL', 'https://evil.com/es/app'],
    ['absolute URL of this host', 'http://localhost:3000/es/app'],
    ['javascript: URL', 'javascript:alert(1)'],
    ['backslash trick', '/\\evil.com'],
    ['backslash inside the path', '/es/app\\..\\..\\login'],
    ['path outside the private area', '/es/login'],
    ['landing page', '/es'],
    ['prefix that is not the app segment', '/es/application'],
    ['unsupported locale', '/fr/app'],
    ['missing locale', '/app'],
    ['dot segments that leave the app', '/es/app/../login'],
    ['encoded dot segments that leave the app', '/es/app/%2e%2e/login'],
    ['relative path', 'es/app'],
    ['control character', '/es/app\n/x'],
    ['tab character', '/es/app\t'],
    ['empty string', ''],
  ])('rejects %s', (_label, raw) => {
    expect(getSafeNextPath(raw)).toBeNull();
  });

  it('rejects missing values', () => {
    expect(getSafeNextPath(null)).toBeNull();
    expect(getSafeNextPath(undefined)).toBeNull();
  });

  it('rejects absurdly long values', () => {
    expect(getSafeNextPath(`/es/app/${'a'.repeat(3000)}`)).toBeNull();
  });
});

describe('loginPathWithNext', () => {
  it('keeps a valid private path encoded in ?next=', () => {
    expect(loginPathWithNext('es', '/es/app/x')).toBe('/es/login?next=%2Fes%2Fapp%2Fx');
  });

  it('drops an invalid path', () => {
    expect(loginPathWithNext('en', '/en/login')).toBe('/en/login');
  });
});

describe('privateHome', () => {
  it('points to the private area of the locale', () => {
    expect(privateHome('en')).toBe('/en/app');
  });
});

describe('destinationForRole (switching accounts)', () => {
  it('keeps ?next= when the new role may open it', async () => {
    const { destinationForRole } = await import('@/features/auth/safe-next');
    expect(destinationForRole('/es/app/distribution', 'es', 'OPERATOR')).toBe(
      '/es/app/distribution',
    );
    expect(destinationForRole('/es/app/lab/performance', 'es', 'ADMIN')).toBe(
      '/es/app/lab/performance',
    );
  });

  it('sends an operator home instead of to an ADMIN-only page', async () => {
    const { destinationForRole } = await import('@/features/auth/safe-next');
    for (const page of [
      '/es/app/lab/performance',
      '/es/app/metrics',
      '/es/app/users',
      '/es/app/reports',
    ]) {
      expect(destinationForRole(page, 'es', 'OPERATOR')).toBe('/es/app');
    }
  });

  it('falls back to the home for a missing or unsafe ?next=', async () => {
    const { destinationForRole } = await import('@/features/auth/safe-next');
    expect(destinationForRole(null, 'en', 'ADMIN')).toBe('/en/app');
    expect(destinationForRole('//evil.com', 'es', 'ADMIN')).toBe('/es/app');
  });

  it('remembers an explicit logout once per tab', async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const { consumeExplicitLogout, markExplicitLogout } = await import('@/features/auth/safe-next');
    expect(consumeExplicitLogout()).toBe(false);
    markExplicitLogout();
    expect(consumeExplicitLogout()).toBe(true);
    expect(consumeExplicitLogout()).toBe(false);
    vi.unstubAllGlobals();
  });
});
