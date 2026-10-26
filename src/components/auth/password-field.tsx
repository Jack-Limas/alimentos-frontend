'use client';

import { useTranslations } from 'next-intl';
import { useState, type ComponentPropsWithRef } from 'react';

// React 19: `ref` is a regular prop and reaches the input through the spread.
interface PasswordFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  id: string;
  inputClassName: string;
}

/** Password input with a show/hide toggle. */
export function PasswordField({ id, inputClassName, ...inputProps }: PasswordFieldProps) {
  const t = useTranslations('Login');
  const [visible, setVisible] = useState(false);
  const label = visible ? t('hidePassword') : t('showPassword');

  return (
    <div className="relative">
      <input
        {...inputProps}
        id={id}
        type={visible ? 'text' : 'password'}
        className={`${inputClassName} pr-12`}
      />
      <button
        type="button"
        onClick={() => {
          setVisible((current) => !current);
        }}
        aria-controls={id}
        aria-pressed={visible}
        aria-label={label}
        title={label}
        className="absolute inset-y-0 right-1 my-1 inline-flex w-10 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        {visible ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5 fill-none stroke-current stroke-2"
          >
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7a12 12 0 0 1-3 4.2M6.1 6.1A12.5 12.5 0 0 0 2 12c1 2.5 5 7 10 7a9.6 9.6 0 0 0 4.2-1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5 fill-none stroke-current stroke-2"
          >
            <path
              d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
