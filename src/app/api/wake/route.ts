import { after } from 'next/server';
import { parseWakeUrls, wakeAll } from '@/features/wake/wake';

// Never cached or prerendered: every call must reach the server to start the pings.
export const dynamic = 'force-dynamic';
// after() keeps the function alive for the pings (up to 55 s each) once the 202 is sent.
export const maxDuration = 60;

/**
 * GET /api/wake: answers 202 at once and, after the response, pings the
 * Render services in WAKE_URLS (server-only variable) so a sleeping backend,
 * its database and the AI start booting while the visitor reads the page.
 * The answer never says anything about the services.
 */
export function GET(): Response {
  const urls = parseWakeUrls(process.env.WAKE_URLS);
  if (urls.length > 0) {
    after(async () => {
      await wakeAll(urls);
    });
  }
  return new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
