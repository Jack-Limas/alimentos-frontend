import { useTranslations } from 'next-intl';

type Tone = 'expiry' | 'critical' | 'healthy';

const toneStyles: Record<Tone, { dot: string; badge: string; bar: string }> = {
  expiry: {
    dot: 'bg-expiry-500',
    badge: 'bg-expiry-100 text-expiry-800 dark:bg-expiry-900/40 dark:text-expiry-200',
    bar: 'bg-expiry-400',
  },
  critical: {
    dot: 'bg-critical-500',
    badge: 'bg-critical-100 text-critical-800 dark:bg-critical-900/40 dark:text-critical-200',
    bar: 'bg-critical-500',
  },
  healthy: {
    dot: 'bg-brand-500',
    badge: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
    bar: 'bg-brand-500',
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
    <figure
      aria-label={t('label')}
      className="relative rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <p className="font-display text-lg font-semibold">{t('title')}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
          <span className="size-1.5 animate-pulse rounded-full bg-brand-500" aria-hidden="true" />
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
              <div className="h-1.5 rounded-full bg-surface-muted" aria-hidden="true">
                <div className={`h-full rounded-full ${tone.bar} ${lot.fill}`} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 px-4 py-3 text-sm dark:border-brand-800 dark:bg-brand-950/40">
        <span className="font-semibold">{t('order')}</span>
        <span className="text-right text-brand-700 dark:text-brand-300">{t('orderStatus')}</span>
      </div>
    </figure>
  );
}
