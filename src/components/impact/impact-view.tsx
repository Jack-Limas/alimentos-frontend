import { useFormatter, useTranslations } from 'next-intl';
import { buttonClass } from '@/components/ui/button';
import { CountUp } from '@/components/ui/count-up';
import { Icon, type IconName } from '@/components/ui/icons';
import { CUSTOMER_TYPES } from '@/features/customers/types';
import type { Impact } from '@/features/impact/impact';
import type { Unit } from '@/features/inventory/types';
import { Link } from '@/i18n/navigation';
import { BUSINESS_TIME_ZONE } from '@/lib/dates';

const UNITS: readonly Unit[] = ['KG', 'L', 'UNIT', 'BOX'];
/** kg and L can be fractional; units and boxes are whole. */
const decimalsOf = (unit: Unit) => (unit === 'KG' || unit === 'L' ? 1 : 0);

function Tile({ icon, tone }: { icon: IconName; tone: string }) {
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}
    >
      <Icon name={icon} className="size-5" />
    </span>
  );
}

/**
 * The public impact page. Server rendered at build time and by ISR; only the
 * counters are client components. `impact` is null when the backend could not
 * be reached: the page still renders, with a "data not available" notice.
 */
export function ImpactView({ impact }: { impact: Impact | null }) {
  const t = useTranslations('Impact');
  const units = useTranslations('Catalog.units.short');
  const types = useTranslations('OrderMeta.customerTypes');
  const format = useFormatter();
  const calendar = (date: string) =>
    format.dateTime(new Date(`${date}T00:00:00Z`), { dateStyle: 'long', timeZone: 'UTC' });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:py-14">
      <header className="relative overflow-hidden rounded-[2rem] bg-forest-950 px-6 py-10 text-white shadow-card sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-20 size-72 rounded-full bg-brand-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-expiry-400/15 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-expiry-300">
            {t('eyebrow', { days: impact?.windowDays ?? 30 })}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-base text-forest-100/90 sm:text-lg">{t('intro')}</p>
          {impact ? (
            <p className="mt-4 text-sm text-forest-200">
              {t('window', { from: calendar(impact.from), to: calendar(impact.to) })}
            </p>
          ) : null}
        </div>
      </header>

      {impact ? (
        <>
          <section aria-labelledby="impact-dispatched" className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
              <div className="flex items-center gap-3">
                <Tile icon="truck" tone="bg-brand-600 text-white" />
                <h2 id="impact-dispatched" className="font-display text-xl font-semibold">
                  {t('dispatched.title')}
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted">{t('dispatched.description')}</p>
              {UNITS.some((unit) => impact.dispatched[unit] !== undefined) ? (
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  {UNITS.filter((unit) => impact.dispatched[unit] !== undefined).map((unit) => (
                    <div key={unit} className="rounded-2xl bg-brand-50 p-4 dark:bg-brand-900/30">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-200">
                        {units(unit)}
                      </dt>
                      <dd className="mt-1 font-display text-3xl font-semibold">
                        <CountUp value={impact.dispatched[unit] ?? 0} decimals={decimalsOf(unit)} />
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-5 text-sm text-muted">{t('dispatched.empty')}</p>
              )}
            </div>

            <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
              <div className="flex items-center gap-3">
                <Tile icon="leaf" tone="bg-expiry-400 text-forest-950" />
                <h2 className="font-display text-xl font-semibold">{t('rescued.title')}</h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                {t('rescued.description', { days: impact.rescueDays })}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3">
                {UNITS.filter((unit) => impact.dispatched[unit] !== undefined).map((unit) => {
                  const rescued = impact.rescued[unit] ?? 0;
                  const dispatched = impact.dispatched[unit] ?? 0;
                  const pct = dispatched > 0 ? Math.round((rescued / dispatched) * 1000) / 10 : 0;
                  return (
                    <div key={unit} className="rounded-2xl bg-expiry-50 p-4 dark:bg-expiry-900/25">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-expiry-800 dark:text-expiry-200">
                        {units(unit)}
                      </dt>
                      <dd className="mt-1 font-display text-3xl font-semibold">
                        <CountUp value={rescued} decimals={decimalsOf(unit)} />
                      </dd>
                      <dd className="mt-2">
                        <span className="block h-2 overflow-hidden rounded-full bg-expiry-100 dark:bg-expiry-900/60">
                          <span
                            className="block h-full rounded-full bg-expiry-500"
                            style={{ width: `${String(Math.min(100, pct))}%` }}
                          />
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {t('rescued.share', { pct: format.number(pct) })}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_3fr]">
            <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
              <div className="flex items-center gap-3">
                <Tile icon="clock" tone="bg-lagoon-500 text-white" />
                <h2 className="font-display text-xl font-semibold">{t('deliveries.title')}</h2>
              </div>
              {impact.deliveries.onTimePct === null ? (
                <p className="mt-5 text-sm text-muted">{t('deliveries.none')}</p>
              ) : (
                <>
                  <p className="mt-5 font-display text-5xl font-semibold text-lagoon-700 dark:text-lagoon-300">
                    <CountUp value={impact.deliveries.onTimePct} decimals={1} />
                    <span className="ml-1 text-3xl">%</span>
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {t('deliveries.detail', {
                      onTime: impact.deliveries.onTime,
                      total: impact.deliveries.total,
                    })}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-border">
              <div className="flex items-center gap-3">
                <Tile icon="users" tone="bg-berry-500 text-white" />
                <div>
                  <h2 className="font-display text-xl font-semibold">{t('customers.title')}</h2>
                  <p className="text-sm text-muted">
                    {t('customers.total', { count: impact.customersServed.total })}
                  </p>
                </div>
              </div>
              {impact.customersServed.total === 0 ? (
                <p className="mt-5 text-sm text-muted">{t('customers.none')}</p>
              ) : (
                <ul className="mt-5 space-y-3">
                  {CUSTOMER_TYPES.filter((type) => impact.customersServed.byType[type]).map(
                    (type) => {
                      const count = impact.customersServed.byType[type] ?? 0;
                      const width = (count / impact.customersServed.total) * 100;
                      return (
                        <li key={type}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-semibold">{types(type)}</span>
                            <span className="font-display text-lg font-semibold">
                              <CountUp value={count} />
                            </span>
                          </div>
                          <span className="mt-1 block h-2 overflow-hidden rounded-full bg-berry-100 dark:bg-berry-900/50">
                            <span
                              className="block h-full rounded-full bg-berry-500"
                              style={{ width: `${String(width)}%` }}
                            />
                          </span>
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </div>
          </section>

          <footer className="space-y-1 text-sm text-muted">
            <p className="font-semibold text-foreground">
              {t('updated', {
                date: format.dateTime(new Date(impact.generatedAt), {
                  dateStyle: 'long',
                  timeStyle: 'short',
                  timeZone: BUSINESS_TIME_ZONE,
                }),
              })}
            </p>
            <p>{t('isr')}</p>
          </footer>
        </>
      ) : (
        <section
          role="status"
          className="rounded-card border border-dashed border-border bg-surface/70 px-6 py-10 text-center"
        >
          <h2 className="font-display text-xl font-semibold">{t('unavailable.title')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('unavailable.description')}</p>
          <p className="mx-auto mt-4 max-w-md text-xs text-muted">{t('isr')}</p>
        </section>
      )}

      <div className="text-center">
        <Link href="/" className={buttonClass('primary', 'lg')}>
          {t('cta')}
        </Link>
      </div>
    </div>
  );
}
