'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import type { DemoAccount } from '@/features/auth/demo-accounts';

interface DemoAccountsCardProps {
  accounts: readonly DemoAccount[];
  /** The same sign-in the form uses (same errors, lockout and redirect). */
  onSignIn: (account: DemoAccount) => void;
  disabled: boolean;
}

function CopyRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  const t = useTranslations('Login.demo');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // Clipboard blocked: the value is visible and selectable anyway.
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-background/70 px-3 py-1.5 ring-1 ring-border">
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
        <dd className="truncate font-mono text-sm" title={value}>
          {value}
        </dd>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copyLabel}
        className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
      >
        <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
      </button>
    </div>
  );
}

/**
 * "Here to evaluate the project?": public demo accounts with one-click sign-in.
 * There is no public sign-up (internal tool); these accounts are for exploring.
 */
export function DemoAccountsCard({ accounts, onSignIn, disabled }: DemoAccountsCardProps) {
  const t = useTranslations('Login.demo');
  if (accounts.length === 0) return null;

  return (
    <section
      aria-labelledby="demo-accounts-title"
      className="mt-8 rounded-2xl bg-lagoon-50/70 p-4 ring-1 ring-lagoon-200 sm:p-5 dark:bg-lagoon-900/20 dark:ring-lagoon-800"
    >
      <h2 id="demo-accounts-title" className="font-display text-lg font-semibold">
        {t('title')}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('note')}</p>

      <ul className="mt-4 grid gap-3">
        {accounts.map((account) => (
          <li key={account.role} className="space-y-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onSignIn(account);
              }}
              className={`w-full ${buttonClass(account.role === 'admin' ? 'lagoon' : 'secondary')}`}
            >
              {t(account.role === 'admin' ? 'asAdmin' : 'asOperator')}
            </button>
            <dl className="grid gap-1.5">
              <CopyRow
                label={t('email')}
                value={account.email}
                copyLabel={t('copyEmail', { role: t(`roles.${account.role}`) })}
              />
              <CopyRow
                label={t('password')}
                value={account.password}
                copyLabel={t('copyPassword', { role: t(`roles.${account.role}`) })}
              />
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
