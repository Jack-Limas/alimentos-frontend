import type { ReactNode } from 'react';

export const inputClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgb(0_0_0/0.03)] transition placeholder:text-muted/80 hover:border-sand-300 focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 aria-invalid:border-critical-500 dark:hover:border-sand-600';

export const selectClass = `${inputClass} appearance-none bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23847764' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")]`;

interface FieldProps {
  id: string;
  label: string;
  /** Translated error text, linked to the input with aria-describedby. */
  error?: string | undefined;
  hint?: string | undefined;
  optional?: string | undefined;
  children: ReactNode;
}

/** Label, control, hint and error. The control must use `${id}-error` / `${id}-hint`. */
export function Field({ id, label, error, hint, optional, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-sm font-semibold"
      >
        {label}
        {optional ? <span className="text-xs font-normal text-muted">{optional}</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-1.5 text-xs font-semibold text-critical-700 dark:text-critical-300"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export function fieldAria(id: string, error: string | undefined, hint?: string) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  } as const;
}
