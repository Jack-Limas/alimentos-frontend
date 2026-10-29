import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/ui/icons';

const solutions: { key: 'fefo' | 'priority' | 'alerts' | 'ai'; icon: IconName; tone: string }[] = [
  { key: 'fefo', icon: 'leaf', tone: 'from-brand-500 to-brand-700' },
  { key: 'priority', icon: 'flag', tone: 'from-expiry-400 to-expiry-600' },
  { key: 'alerts', icon: 'bell', tone: 'from-lagoon-500 to-lagoon-700' },
  { key: 'ai', icon: 'flame', tone: 'from-berry-500 to-berry-700' },
];

export function SolutionSection() {
  const t = useTranslations('Landing.solution');

  return (
    <section
      id="how-it-works"
      aria-labelledby="solution-title"
      className="scroll-mt-20 px-3 sm:px-6"
    >
      <div className="mx-auto grid max-w-6xl gap-10 rounded-[2rem] bg-surface-muted/70 px-5 py-14 ring-1 ring-border sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-14 lg:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            {t('eyebrow')}
          </p>
          <h2
            id="solution-title"
            className="mt-3 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {t('title')}
          </h2>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2">
          {solutions.map(({ key, icon, tone }, index) => (
            <li key={key} className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-[0_3px_0_0_rgba(0,0,0,0.18)]`}
                >
                  <Icon name={icon} className="size-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t(`${key}Title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t(`${key}Body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
