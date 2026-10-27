import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { BUSINESS_TIME_ZONE } from '@/lib/dates';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    // Date-times (createdAt, receivedAt) are shown in the business time zone, never the browser's.
    timeZone: BUSINESS_TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
