import { useTranslations } from 'next-intl';
import { Icon } from '@/components/ui/icons';

type Tone = 'expiry' | 'critical' | 'healthy';

const toneStyles: Record<Tone, { dot: string; badge: string; bar: string }> = {
  expiry: {
    dot: 'bg-expiry-500',
    badge: 'bg-expiry-100 text-expiry-800 dark:bg-expiry-900/40 dark:text-expiry-200',
    bar: 'bg-gradient-to-r from-expiry-300 to-expiry-500',
  },
  critical: {
    dot: 'bg-critical-500',
    badge: 'bg-critical-100 text-critical-800 dark:bg-critical-900/40 dark:text-critical-200',
    bar: 'bg-gradient-to-r from-critical-400 to-critical-600',
  },
  healthy: {
    dot: 'bg-brand-500',
    badge: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
    bar: 'bg-gradient-to-r from-brand-400 to-brand-600',
  },
};

/** Illustrative, static mock of the warehouse dashboard (not real data). */
export function WarehousePreview() {
  const t = useTranslations('Landing.preview');

  const lots: { name: string; status: string; tone: Tone; fill: string }[] = [
    { name: t('milk'), status: t('milkStatus'), tone: 'expiry', fill: 'w-4/5' },
    { name: t('apples'), status: t('applesStatus'), tone: 'critical', fill: 'w-11/12' },
    { name: t('rice'), status: t('riceStatus'), tone: 'healthy', fill: 'w-2/5' },
  ];

  return (
    <figure aria-label={t('label')} className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Floating chips around the card, decorative. */}
      <div
        aria-hidden="true"
        className="absolute -left-3 -top-5 z-10 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-forest-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] motion-safe:animate-float sm:-left-6"
      >
        <span className="inline-flex size-6 items-center justify-center rounded-lg bg-brand-500 text-white">
          <Icon name="leaf" className="size-3.5" />
        </span>
        {t('floatTop')}
      </div>
      <div
        aria-hidden="true"
        className="absolute -bottom-5 -right-2 z-10 flex items-center gap-2 rounded-2xl bg-expiry-300 px-3 py-2 text-xs font-semibold text-forest-950 shadow-[0_4px_0_0_var(--color-expiry-600),0_14px_30px_-10px_rgba(0,0,0,0.45)] motion-safe:animate-float [animation-delay:-3s] sm:-right-5"
      >
        <Icon name="truck" className="size-4" />
        {t('floatBottom')}
      </div>

      <div className="relative rounded-[1.6rem] bg-surface p-5 text-foreground shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)] ring-1 ring-white/10 sm:p-6 lg:rotate-[1.5deg]">
        <div className="mb-5 flex items-center justify-between">
          <p className="font-display text-lg font-semibold">{t('title')}</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
            <span
              className="size-1.5 rounded-full bg-brand-500 motion-safe:animate-pulse"
              aria-hidden="true"
            />
            {t('badge')}
          </span>
        </div>

        <ul className="space-y-4">
          {lots.map((lot) => {
            const tone = toneStyles[lot.tone];
            return (
              <li key={lot.name} className="space-y-2">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className={`size-2 rounded-full ${tone.dot}`} aria-hidden="true" />
                    {lot.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tone.badge}`}
                  >
                    {lot.status}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted" aria-hidden="true">
                  <div
                    className={`h-full origin-left rounded-full ${tone.bar} ${lot.fill} motion-safe:animate-bar-fill`}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-forest-800 to-forest-700 px-4 py-3 text-sm text-white shadow-[0_3px_0_0_var(--color-forest-950)]">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="flag" className="size-4 text-expiry-300" />
            {t('order')}
          </span>
          <span className="text-right text-expiry-200">{t('orderStatus')}</span>
        </div>
        <figcaption className="mt-3 text-right text-[0.7rem] text-muted">
          {t('demoNote')}
        </figcaption>
      </div>
    </figure>
  );
}
