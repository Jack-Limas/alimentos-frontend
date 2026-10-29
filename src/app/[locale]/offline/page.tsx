import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { RetryButton } from '@/components/pwa/retry-button';
import { Icon } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

interface OfflinePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: OfflinePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Offline' });
  return { title: t('metaTitle') };
}

/**
 * Static (SSG) for es and en. The service worker precaches it, with its
 * assets, and serves it when a navigation fails without network.
 */
export default function OfflinePage({ params }: OfflinePageProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations('Offline');

  return (
    <section className="px-3 py-10 sm:px-6 sm:py-16">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 px-6 py-12 text-center text-forest-50 ring-1 ring-forest-800 sm:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 size-64 rounded-full bg-lagoon-500/25 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 size-64 rounded-full bg-expiry-400/25 blur-3xl" />
        </div>
        <div className="relative">
          <span className="mx-auto inline-flex size-16 items-center justify-center rounded-2xl bg-expiry-300 text-forest-950 shadow-[0_5px_0_0_var(--color-expiry-600)]">
            <Icon name="bell" className="size-8" />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-expiry-200">
            {t('eyebrow')}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white text-balance">
            {t('title')}
          </h1>
          <p className="mt-3 text-forest-100/85">{t('body')}</p>
          <p className="mt-2 text-sm text-forest-200/80">{t('hint')}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <RetryButton label={t('retry')} />
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/10"
            >
              {t('home')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
