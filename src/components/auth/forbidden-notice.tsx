import { useTranslations } from 'next-intl';

/** Shown by <RequireRole> when the user's role is not allowed. */
export function ForbiddenNotice() {
  const t = useTranslations('Auth.forbidden');

  return (
    <div className="flex gap-3 rounded-xl border border-critical-200 bg-critical-50 p-4 text-critical-800 dark:border-critical-800 dark:bg-critical-900/30 dark:text-critical-200">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="mt-0.5 size-5 shrink-0 fill-none stroke-current stroke-2"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-semibold">{t('title')}</p>
        <p className="mt-1 text-sm">{t('description')}</p>
      </div>
    </div>
  );
}
