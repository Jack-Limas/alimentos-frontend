import type { ReactNode } from 'react';

export type StatusTone = 'ok' | 'warning' | 'critical' | 'pending';

const toneClass: Record<StatusTone, string> = {
  ok: 'bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200',
  warning: 'bg-expiry-100 text-expiry-800 dark:bg-expiry-900/40 dark:text-expiry-200',
  critical: 'bg-critical-100 text-critical-800 dark:bg-critical-900/40 dark:text-critical-200',
  pending: 'bg-surface-muted text-muted',
};

const dotClass: Record<StatusTone, string> = {
  ok: 'bg-brand-500',
  warning: 'bg-expiry-500',
  critical: 'bg-critical-500',
  pending: 'bg-sand-400 animate-pulse',
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dotClass[tone]}`} />
      {children}
    </span>
  );
}

/** One "label: value" row of a diagnostic panel. */
export function CheckRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-mono text-sm font-semibold break-all">{children}</dd>
    </div>
  );
}
