import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { WarehousePreview } from './warehouse-preview';

export function Hero() {
  const t = useTranslations('Landing.hero');

  return (
    <section className="relative overflow-hidden">
      {/* Soft organic backdrop, purely decorative. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 size-80 rounded-full bg-brand-200/50 blur-3xl dark:bg-brand-900/40" />
        <div className="absolute -right-16 top-40 size-72 rounded-full bg-expiry-200/50 blur-3xl dark:bg-expiry-900/20" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:pb-24">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {t('eyebrow')}
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted text-pretty">{t('subtitle')}</p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary-hover"
            >
              {t('cta')}
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-7 font-semibold transition-colors hover:bg-surface-muted"
            >
              {t('secondaryCta')}
            </a>
          </div>
        </div>

        <WarehousePreview />
      </div>
    </section>
  );
}
