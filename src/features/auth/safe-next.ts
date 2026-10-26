import { routing } from '@/i18n/routing';

const PRIVATE_SEGMENT = 'app';
// Any origin works: it only serves to resolve the path; the result must keep it.
const PROBE_ORIGIN = 'https://alimentaiq.invalid';

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Path of the private area for a locale, e.g. "/es/app". */
export function privateHome(locale: string): string {
  return `/${locale}/${PRIVATE_SEGMENT}`;
}

/**
 * Validates the ?next= login parameter to avoid an open redirect. Only an
 * internal path inside the private area of a supported locale is accepted:
 * "/es/app" or "/es/app/...", with an optional query or hash. Absolute URLs,
 * protocol-relative "//host", backslashes, control characters and paths that
 * normalize elsewhere ("/es/app/../login") return null.
 */
export function getSafeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  // Browsers treat "\" like "/" ("/\evil.com" is protocol-relative); control characters are never valid.
  if (raw.includes('\\') || hasControlCharacter(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN) return null;

  const [, locale, segment] = url.pathname.split('/');
  const isLocale = (routing.locales as readonly string[]).includes(locale ?? '');
  if (!isLocale || segment !== PRIVATE_SEGMENT) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Login URL that sends the user back to `currentPath` after logging in. */
export function loginPathWithNext(locale: string, currentPath: string): string {
  const next = getSafeNextPath(currentPath);
  const login = `/${locale}/login`;
  return next === null ? login : `${login}?next=${encodeURIComponent(next)}`;
}
