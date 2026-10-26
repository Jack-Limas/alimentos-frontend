import { describe, expect, it } from 'vitest';
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
