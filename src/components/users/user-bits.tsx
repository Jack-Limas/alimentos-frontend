'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, fieldAria, inputClass } from '@/components/ui/field';
import { Icon } from '@/components/ui/icons';
import { generateTemporaryPassword } from '@/features/users/password-policy';
import type { UserErrorView } from '@/features/users/user-errors';

/** "Protegida" with a lock: seed accounts (real and demo), never editable from the app. */
export function ProtectedBadge() {
  const t = useTranslations('Users');
  return (
    <span
      title={t('protectedHint')}
      className="inline-flex items-center gap-1 rounded-full bg-lagoon-100 px-2 py-0.5 text-xs font-semibold text-lagoon-800 dark:bg-lagoon-900/50 dark:text-lagoon-200"
    >
      <Icon name="lock" className="size-3.5" />
      {t('protected')}
    </span>
  );
}

/** Active / inactive, always with text (never color alone). */
export function StatusChip({ active }: { active: boolean }) {
  const t = useTranslations('Users');
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        active
          ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200'
          : 'bg-sand-200 text-sand-800 dark:bg-sand-700 dark:text-sand-100'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${active ? 'bg-brand-600' : 'bg-sand-500'}`}
      />
      {active ? t('active') : t('inactive')}
    </span>
  );
}

/** Translated failure of a users request, announced to screen readers. */
export function UserErrorBanner({ error }: { error: UserErrorView }) {
  const t = useTranslations('Users.errors');
  const message =
    error.kind === 'userLimitReached'
      ? error.limit === undefined
        ? t('userLimitReachedUnknown')
        : t('userLimitReached', { limit: error.limit })
      : error.kind === 'tooManyAttempts'
        ? error.retryAfterSeconds === undefined
          ? t('tooManyAttemptsUnknown')
          : t('tooManyAttempts', { seconds: error.retryAfterSeconds })
        : t(error.kind);
  return (
    <p
      role="alert"
      className="rounded-2xl border border-critical-200 bg-critical-50 px-4 py-3 text-sm font-semibold text-critical-800 dark:border-critical-800 dark:bg-critical-900/30 dark:text-critical-200"
    >
      {message}
    </p>
  );
}

/**
 * Temporary password with "Generate" (readable, random, passes the policy) and
 * "Copy". Shown in clear text: the ADMIN has to read it to hand it over.
 */
export function TemporaryPasswordField({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
}) {
  const t = useTranslations('Users.form');
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the value is visible and selectable anyway.
    }
  }

  return (
    <Field id={id} label={t('temporaryPassword')} error={error} hint={t('temporaryHint')}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          {...fieldAria(id, error, t('temporaryHint'))}
          type="text"
          value={value}
          maxLength={72}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setCopied(false);
            onChange(event.target.value);
          }}
          className={`${inputClass} font-mono tracking-wide`}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="h-11 flex-1 sm:flex-none"
            aria-label={t('generateLabel')}
            icon={<Icon name="sparkle" className="size-4" />}
            onClick={() => {
              setCopied(false);
              onChange(generateTemporaryPassword());
            }}
          >
            {t('generate')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-11 flex-1 sm:flex-none"
            aria-label={t('copyLabel')}
            disabled={!value}
            icon={<Icon name={copied ? 'check' : 'copy'} className="size-4" />}
            onClick={() => void copy()}
          >
            <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
          </Button>
        </div>
      </div>
    </Field>
  );
}
