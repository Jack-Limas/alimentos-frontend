import { useTranslations } from 'next-intl';
import { buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';

export function ClosingCta() {
  const t = useTranslations('Landing.closing');

  return (
    <section className="px-3 py-16 sm:px-6 lg:py-20">
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest-900 via-forest-800 to-lagoon-800 px-6 py-12 text-forest-50 ring-1 ring-forest-700 sm:px-12 lg:flex-row lg:items-center lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-16 size-64 rounded-full bg-expiry-400/25 blur-3xl" />
          <div className="absolute -bottom-20 left-10 size-64 rounded-full bg-berry-500/20 blur-3xl" />
        </div>
        <div className="relative space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-balance text-white sm:text-3xl">
            {t('title')}
          </h2>
          <p className="text-forest-100/85">{t('body')}</p>
        </div>
        <Link href="/login" className={`relative shrink-0 ${buttonClass('citrus', 'lg')}`}>
          {t('cta')}
          <Icon name="chevron" className="size-5" />
        </Link>
      </div>
    </section>
  );
}
