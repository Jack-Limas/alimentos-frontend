/** Each ping waits at most this long: a sleeping Render service needs up to ~1 minute. */
export const WAKE_TIMEOUT_MS = 55_000;
/** A short, fixed list: the backend /health, its /health/ready (wakes Neon too) and the AI. */
export const MAX_WAKE_URLS = 5;

/**
 * WAKE_URLS (server only): full URLs separated by commas. Invalid entries
 * and anything that is not http(s) are ignored; duplicates count once.
 */
export function parseWakeUrls(raw: string | undefined): string[] {
  const urls = new Set<string>();
  for (const part of (raw ?? '').split(',')) {
    const value = part.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') urls.add(url.href);
    } catch {
      // Not a URL: ignored.
    }
  }
  return [...urls].slice(0, MAX_WAKE_URLS);
}

/**
 * Pings every URL at the same time and waits for all of them (each one ends
 * by itself after WAKE_TIMEOUT_MS). Failures are expected while a service
 * boots and are ignored: the goal is only to start the wake-up.
 */
export async function wakeAll(
  urls: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const results = await Promise.allSettled(
    urls.map((url) =>
      fetchImpl(url, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(WAKE_TIMEOUT_MS),
      }),
    ),
  );
  return results.filter((result) => result.status === 'fulfilled').length;
}
