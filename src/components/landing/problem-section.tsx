import { useTranslations } from 'next-intl';

const problems = [
  { key: 'expired', accent: 'border-t-expiry-500', marker: 'bg-expiry-500' },
  { key: 'waste', accent: 'border-t-critical-500', marker: 'bg-critical-500' },
  { key: 'shortages', accent: 'border-t-critical-400', marker: 'bg-critical-400' },
  { key: 'late', accent: 'border-t-expiry-400', marker: 'bg-expiry-400' },
] as const;

export function ProblemSection() {
  const t = useTranslations('Landing.problem');

  return (
    <section aria-labelledby="problem-title" className="bg-surface-muted/60">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-critical-600 dark:text-critical-400">
          {t('eyebrow')}
        </p>
        <h2
          id="problem-title"
          className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          {t('title')}
        </h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(({ key, accent, marker }, index) => (
            <li
              key={key}
              className={`rounded-card border border-t-4 border-border bg-surface p-6 ${accent}`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-muted">
                <span className={`size-2 rounded-full ${marker}`} aria-hidden="true" />
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{t(`${key}Title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t(`${key}Body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
