import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { HeaderSessionActions } from './header-session-actions';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  const t = useTranslations('Header');

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
      >
        {t('skipToContent')}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Link href="/" aria-label={t('homeLabel')} className="rounded-md">
          <Logo />
        </Link>
        {/* Tighter on 360 px phones: language, theme and the avatar must fit next to the logo. */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/impact"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground md:inline-flex"
          >
            {t('impact')}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
          <HeaderSessionActions />
        </div>
      </div>
    </header>
  );
}
