'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatCountdown, mapLoginError, type LoginErrorKey } from '@/features/auth/login-errors';
import {
  EMAIL_MAX_LENGTH,
  hasFieldErrors,
  validateLoginForm,
  type LoginFieldErrors,
} from '@/features/auth/login-validation';
import { getSafeNextPath, privateHome } from '@/features/auth/safe-next';
import { useAuth } from '@/features/auth/use-auth';
import { useCountdown } from '@/hooks/use-countdown';
import { buttonClass } from '@/components/ui/button';
import { PasswordField } from './password-field';

const inputClass =
  'h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-ring/30 aria-invalid:border-critical-500 aria-invalid:focus:ring-critical-500/30';
const fieldErrorClass = 'text-sm text-critical-700 dark:text-critical-300';

/**
 * Where to go after logging in: a validated ?next= or the private home. Read
 * from window.location at that moment instead of useSearchParams, so the
 * login page stays statically rendered without a Suspense boundary.
 */
function destinationAfterLogin(locale: string): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return getSafeNextPath(next) ?? privateHome(locale);
}

export function LoginForm() {
  const t = useTranslations('Login');
  const locale = useLocale();
  const router = useRouter();
  const { status, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<LoginErrorKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { secondsLeft, start } = useCountdown();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const locked = formError === 'tooManyAttempts' && secondsLeft > 0;
  // The 429 message disappears by itself when the countdown reaches zero.
  const visibleError = formError === 'tooManyAttempts' && !locked ? null : formError;
  const authenticated = status === 'authenticated';

  useEffect(() => {
    // Covers a successful submit, an existing session and a login in another tab.
    if (authenticated) router.replace(destinationAfterLogin(locale));
  }, [authenticated, router, locale]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || locked) return;

    const credentials = { email: email.trim(), password };
    const errors = validateLoginForm(credentials);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) {
      (errors.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      await login(credentials);
      // Stay in the submitting state: the effect above redirects.
    } catch (error) {
      const view = mapLoginError(error);
      setFormError(view.key);
      if (view.retryAfterSeconds !== undefined) start(view.retryAfterSeconds);
      setSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold">
          {t('email')}
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={EMAIL_MAX_LENGTH}
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldErrors.email) setFieldErrors(({ password: p }) => ({ password: p }));
          }}
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className={inputClass}
        />
        {fieldErrors.email && (
          <p id="email-error" className={fieldErrorClass}>
            {t(`validation.${fieldErrors.email}`)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-semibold">
          {t('password')}
        </label>
        <PasswordField
          ref={passwordRef}
          id="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password) setFieldErrors(({ email: e }) => ({ email: e }));
          }}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          inputClassName={inputClass}
        />
        {fieldErrors.password && (
          <p id="password-error" className={fieldErrorClass}>
            {t(`validation.${fieldErrors.password}`)}
          </p>
        )}
      </div>

      {visibleError && (
        <div
          role="alert"
          className="rounded-xl border border-critical-200 bg-critical-50 px-4 py-3 text-sm text-critical-800 dark:border-critical-800 dark:bg-critical-900/30 dark:text-critical-200"
        >
          {visibleError === 'tooManyAttempts'
            ? t.rich('errors.tooManyAttempts', {
                time: formatCountdown(secondsLeft),
                // Not re-announced every second by screen readers.
                countdown: (chunks) => (
                  <span aria-live="off" className="font-semibold tabular-nums">
                    {chunks}
                  </span>
                ),
              })
            : t(`errors.${visibleError}`)}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || locked}
        className={`w-full ${buttonClass('primary', 'lg')}`}
      >
        {submitting && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {submitting ? t('submitting') : t('submit')}
      </button>

      <p role="status" className="sr-only">
        {authenticated ? t('redirecting') : ''}
      </p>
    </form>
  );
}
