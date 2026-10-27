'use client';

import type { ReactNode } from 'react';
import { CountUp } from '@/components/ui/count-up';
import { Link } from '@/i18n/navigation';

export type KpiTone = 'forest' | 'expiry' | 'critical' | 'citrus' | 'berry';

const tones: Record<KpiTone, { card: string; badge: string; number: string }> = {
  forest: {
    card: 'bg-forest-900 text-forest-50 ring-forest-800 dark:bg-forest-950',
    badge: 'bg-forest-700 text-forest-50',
    number: 'text-white',
  },
  expiry: {
    card: 'bg-surface text-foreground ring-expiry-200 dark:ring-expiry-800',
    badge: 'bg-expiry-100 text-expiry-800 dark:bg-expiry-900/50 dark:text-expiry-200',
    number: 'text-expiry-700 dark:text-expiry-300',
  },
  critical: {
    card: 'bg-surface text-foreground ring-critical-200 dark:ring-critical-800',
    badge: 'bg-critical-100 text-critical-800 dark:bg-critical-900/50 dark:text-critical-200',
    number: 'text-critical-700 dark:text-critical-300',
  },
  citrus: {
    card: 'bg-expiry-200 text-forest-950 ring-expiry-300 dark:bg-expiry-300',
    badge: 'bg-white/60 text-forest-900',
    number: 'text-forest-950',
  },
  berry: {
    card: 'bg-surface text-foreground ring-berry-200 dark:ring-berry-800',
    badge: 'bg-berry-100 text-berry-800 dark:bg-berry-900/50 dark:text-berry-200',
    number: 'text-berry-700 dark:text-berry-300',
  },
};

interface KpiCardProps {
  href: string;
  value: number;
  label: string;
  hint: string;
  tone: KpiTone;
  icon: ReactNode;
  openLabel: string;
}

/** A figure that counts up and opens the filtered product list. */
export function KpiCard({ href, value, label, hint, tone, icon, openLabel }: KpiCardProps) {
  const style = tones[tone];
  return (
    <Link
      href={href}
      className={`group relative flex min-h-36 flex-col justify-between overflow-hidden rounded-card p-5 shadow-card ring-1 transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ${style.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span
          className={`inline-flex size-9 items-center justify-center rounded-xl ${style.badge}`}
        >
          {icon}
        </span>
      </div>
      <p className={`mt-3 font-display text-5xl font-semibold leading-none ${style.number}`}>
        <CountUp value={value} />
      </p>
      <p className="mt-3 flex items-center justify-between text-xs opacity-80">
        <span>{hint}</span>
        <span
          aria-hidden="true"
          className="translate-x-0 transition group-hover:translate-x-1 motion-reduce:transition-none"
        >
          →
        </span>
        <span className="sr-only">{openLabel}</span>
      </p>
    </Link>
  );
}
