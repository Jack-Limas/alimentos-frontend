import type { routing } from '@/i18n/routing';
import type messages from '../../messages/es.json';

// Type-safe locales and message keys: a missing or misspelled key fails typecheck.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
