import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/icons';

const problems: {
  key: 'expired' | 'waste' | 'shortages' | 'late';
  icon: IconName;
  tile: string;
  edge: string;
}[] = [
  {
    key: 'expired',
    icon: 'clock',
    tile: 'bg-expiry-400 text-forest-950',
    edge: 'var(--color-expiry-600)',
  },
  {
    key: 'waste',
    icon: 'trash',
    tile: 'bg-critical-500 text-white',
    edge: 'var(--color-critical-700)',
  },
  {
    key: 'shortages',
    icon: 'boxes',
    tile: 'bg-berry-500 text-white',
    edge: 'var(--color-berry-700)',
  },
  { key: 'late', icon: 'truck', tile: 'bg-lagoon-500 text-white', edge: 'var(--color-lagoon-700)' },
];

export function ProblemSection() {
  const t = useTranslations('Landing.problem');

  return (
    <section aria-labelledby="problem-title">
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
          {problems.map(({ key, icon, tile, edge }, index) => (
            <li
              key={key}
              style={{ animationDelay: `${String(index * 60)}ms` }}
              className="group rounded-card bg-surface p-6 shadow-card ring-1 ring-border transition motion-safe:animate-rise-in motion-safe:hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex size-12 items-center justify-center rounded-2xl ${tile}`}
                  style={{ boxShadow: `0 4px 0 0 ${edge}` }}
                >
                  <Icon name={icon} className="size-6" />
                </span>
                <span className="font-display text-3xl font-semibold text-border">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{t(`${key}Title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t(`${key}Body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
