import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

/**
 * Public pages (landing, login, /impact) may be indexed; the private area never
 * (its pages also send `robots: noindex`). Static: generated at build time.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        ...routing.locales.map((locale) => `/${locale}/app`),
        ...routing.locales.map((locale) => `/${locale}/system-check`),
      ],
    },
  };
}
