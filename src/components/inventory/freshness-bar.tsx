'use client';

import { useTranslations } from 'next-intl';
import { freshness, litSegments, type FreshnessLevel } from '@/features/inventory/freshness';

const SEGMENTS = 10;

const lit: Record<FreshnessLevel, string> = {
  fresh: 'bg-brand-500 dark:bg-brand-400',
  warning: 'bg-expiry-400 dark:bg-expiry-300',
  critical: 'bg-critical-500 dark:bg-critical-400',
  expired: '',
  unknown: '',
};

const text: Record<FreshnessLevel, string> = {
  fresh: 'text-brand-800 dark:text-brand-200',
  warning: 'text-expiry-800 dark:text-expiry-200',
  critical: 'text-critical-700 dark:text-critical-300',
  expired: 'text-muted',
  unknown: 'text-muted',
};

interface FreshnessBarProps {
  daysLeft: number | null;
  /** Days from reception to expiry, when known (lots); products use a default life. */
  lifeDays?: number | null;
  size?: 'sm' | 'md';
}

/**
 * "Health bar" of a lot: ten cells that go out as the expiry date gets
 * closer, green, then amber, then red. Expired is grey and striped. The days
 * are always written next to it, so the bar never depends on color alone.
 */
export function FreshnessBar({ daysLeft, lifeDays, size = 'md' }: FreshnessBarProps) {
  const t = useTranslations('Freshness');
  const state = freshness({ daysLeft, lifeDays });
  const on = litSegments(state, SEGMENTS);

  const caption =
    state.level === 'unknown'
      ? t('noLots')
      : state.level === 'expired'
        ? t('expired', { days: -(state.daysLeft ?? 0) })
        : t('daysLeft', { days: state.daysLeft ?? 0 });

  return (
    <div
      role="meter"
      aria-label={t('label', { status: t(`levels.${state.level}`) })}
      aria-valuemin={0}
      aria-valuemax={SEGMENTS}
      aria-valuenow={on}
      aria-valuetext={caption}
      className="flex min-w-0 items-center gap-2.5"
    >
      <div
        aria-hidden="true"
        className={`grid shrink-0 grid-cols-10 gap-[3px] rounded-md p-[3px] ring-1 ring-inset ring-border ${
          size === 'sm' ? 'h-3.5 w-24' : 'h-4.5 w-32'
        } ${state.level === 'expired' ? 'bg-stripes' : 'bg-surface-muted'}`}
      >
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            style={{ animationDelay: `${index * 35}ms` }}
            className={`origin-left rounded-[2px] ${
              index < on ? `${lit[state.level]} motion-safe:animate-bar-fill` : ''
            }`}
          />
        ))}
      </div>
      <span className={`truncate text-xs font-semibold ${text[state.level]}`}>{caption}</span>
    </div>
  );
}
