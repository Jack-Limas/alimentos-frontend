import { useTranslations } from 'next-intl';

const solutions = ['fefo', 'priority', 'alerts', 'ai'] as const;

export function SolutionSection() {
  const t = useTranslations('Landing.solution');

  return (
    <section id="how-it-works" aria-labelledby="solution-title" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
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

        <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {solutions.map((key) => (
            <li key={key} className="border-l-2 border-brand-300 pl-5 dark:border-brand-700">
              <h3 className="text-lg font-semibold">{t(`${key}Title`)}</h3>
              <p className="mt-2 leading-relaxed text-muted">{t(`${key}Body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
