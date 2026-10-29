import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { LoginForm } from '@/components/auth';
import { Icon, type IconName } from '@/components/ui/icons';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Login' });
  return { title: t('metaTitle') };
}

const points: { key: 'fefo' | 'plan' | 'alerts'; icon: IconName; tile: string }[] = [
  { key: 'fefo', icon: 'leaf', tile: 'bg-brand-500 shadow-[0_3px_0_0_var(--color-brand-700)]' },
  { key: 'plan', icon: 'truck', tile: 'bg-lagoon-500 shadow-[0_3px_0_0_var(--color-lagoon-700)]' },
  { key: 'alerts', icon: 'bell', tile: 'bg-berry-500 shadow-[0_3px_0_0_var(--color-berry-700)]' },
];

/**
 * Static shell (SSG); the form and the session run in the browser. Two
 * columns on large screens: the same dark forest brand panel as the app
 * shell, and the form card. On a phone the panel shrinks to a header.
 */
export default function LoginPage({ params }: LoginPageProps) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations('Login');

  return (
    <section className="px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-surface shadow-[0_30px_80px_-35px_rgba(16,40,28,0.55)] ring-1 ring-border lg:grid-cols-[1fr_1.05fr]">
        <aside className="relative overflow-hidden bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 px-6 py-8 text-forest-50 sm:px-10 lg:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-20 size-72 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -right-10 size-72 rounded-full bg-expiry-400/25 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px]" />
          </div>
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-forest-100 ring-1 ring-white/15">
              <span className="size-1.5 rounded-full bg-expiry-300" />
              {t('panel.eyebrow')}
            </p>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight text-white text-balance lg:text-4xl">
              {t('panel.title')}
            </h2>
            <p className="mt-3 hidden max-w-sm text-forest-100/85 sm:block">{t('panel.body')}</p>
            <ul className="mt-8 hidden space-y-4 lg:block">
              {points.map((point) => (
                <li key={point.key} className="flex items-start gap-3">
                  <span
                    className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${point.tile}`}
                  >
                    <Icon name={point.icon} className="size-4.5" />
                  </span>
                  <span className="pt-1.5 text-sm text-forest-50">
                    {t(`panel.points.${point.key}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="px-6 py-8 sm:px-10 lg:py-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-muted">{t('subtitle')}</p>

          <LoginForm />

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <Icon name="chevron" className="size-4 rotate-180" />
            {t('backHome')}
          </Link>
        </div>
      </div>
    </section>
  );
}
