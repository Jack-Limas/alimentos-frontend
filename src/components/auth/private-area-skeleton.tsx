import { useTranslations } from 'next-intl';

const block = 'animate-pulse rounded-xl bg-surface-muted';

/** Placeholder shown while the session is being resolved in the browser. */
export function PrivateAreaSkeleton() {
  const t = useTranslations('Auth');

  return (
    <section aria-busy="true" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p role="status" className="sr-only">
        {t('loadingSession')}
      </p>
      <div aria-hidden="true">
        <div className={`${block} h-4 w-28`} />
        <div className={`${block} mt-4 h-9 w-64 max-w-full`} />
        <div className={`${block} mt-3 h-5 w-96 max-w-full`} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-card border border-border bg-surface p-6 shadow-card"
            >
              <div className={`${block} h-5 w-32`} />
              <div className={`${block} mt-4 h-4 w-full`} />
              <div className={`${block} mt-2 h-4 w-3/4`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
