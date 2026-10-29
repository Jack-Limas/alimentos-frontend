import { useTranslations } from 'next-intl';
import { buttonClass } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';
import { WarehousePreview } from './warehouse-preview';

const chips: { key: 'fefo' | 'alerts' | 'ai'; icon: IconName; tone: string }[] = [
  { key: 'fefo', icon: 'leaf', tone: 'bg-brand-400/15 text-brand-200 ring-brand-300/30' },
  { key: 'alerts', icon: 'bell', tone: 'bg-expiry-300/15 text-expiry-200 ring-expiry-300/30' },
  { key: 'ai', icon: 'flame', tone: 'bg-berry-400/15 text-berry-200 ring-berry-300/30' },
];

/**
 * The same dark forest panel as the app shell and Missions, so the first
 * screen already looks like the product: glowing color blobs, a highlighted
 * phrase and 3D keycap buttons.
 */
export function Hero() {
  const t = useTranslations('Landing.hero');

  return (
    <section className="px-3 pt-4 sm:px-6 sm:pt-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 text-forest-50 shadow-[0_30px_80px_-30px_rgba(16,40,28,0.65)] ring-1 ring-forest-800">
        {/* Decorative glow and dot grid. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 size-96 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="absolute -right-20 top-10 size-80 rounded-full bg-expiry-400/25 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 size-96 rounded-full bg-berry-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
        </div>

        <div className="relative grid gap-12 px-5 pb-14 pt-10 sm:px-10 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:px-14 lg:pb-20 lg:pt-16">
          <div className="space-y-7 motion-safe:animate-rise-in">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-forest-100 ring-1 ring-white/15 sm:text-xs sm:tracking-[0.16em]">
              <span className="size-1.5 rounded-full bg-expiry-300 motion-safe:animate-pulse" />
              {t('eyebrow')}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-tight text-balance text-white sm:text-5xl lg:text-[3.6rem]">
              {t.rich('title', {
                hl: (chunks) => (
                  <span className="bg-gradient-to-r from-expiry-300 via-expiry-200 to-brand-300 bg-clip-text text-transparent">
                    {chunks}
                  </span>
                ),
              })}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-forest-100/85 text-pretty">
              {t('subtitle')}
            </p>
            <ul className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li
                  key={chip.key}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${chip.tone}`}
                >
                  <Icon name={chip.icon} className="size-4" />
                  {t(`chips.${chip.key}`)}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Link href="/login" className={buttonClass('citrus', 'lg')}>
                {t('cta')}
                <Icon name="chevron" className="size-5" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-14 items-center justify-center rounded-full px-7 text-base font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/10"
              >
                {t('secondaryCta')}
              </a>
            </div>
          </div>

          <WarehousePreview />
        </div>
      </div>
    </section>
  );
}
