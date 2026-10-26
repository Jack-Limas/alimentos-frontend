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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label={t('homeLabel')} className="rounded-md">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <HeaderSessionActions />
        </div>
      </div>
    </header>
  );
}
