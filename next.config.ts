import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Cross-origin isolation from day 1.
 *
 * COOP same-origin + COEP require-corp make `window.crossOriginIsolated` true,
 * which is required to use SharedArrayBuffer + Atomics in the distribution
 * worker pool. Under COEP every cross-origin resource must opt in:
 * - The API sends `Cross-Origin-Resource-Policy: cross-origin` (helmet in the backend).
 * - External images (Cloudinary) must be loaded with `crossOrigin="anonymous"`.
 * - Fonts come from next/font, which self-hosts them on this origin.
 */
const securityHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
];

/**
 * Version of this build, for the service worker (/sw.js?v=<version>): each
 * deploy gets new caches and the old ones are deleted. On Vercel it is the
 * commit; locally the build time.
 */
const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: appVersion },
  poweredByHeader: false,
  // Do not let `next dev` generate AGENTS.md / CLAUDE.md agent-rules files.
  agentRules: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The browser must always check for a new service worker script.
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
