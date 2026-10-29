import type { ReactNode } from 'react';
import { Chip, type Tone } from '@/components/ui/chip';
import type { VitalRating } from '@/features/metrics/vitals';

/** A titled card of the metrics screen. */
export function MetricsSection({
  id,
  title,
  intro,
  action,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-card bg-surface p-5 shadow-card ring-1 ring-border sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="font-display text-xl font-semibold">
            {title}
          </h2>
          {intro ? <p className="mt-1 max-w-2xl text-sm text-muted">{intro}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A label + value tile. */
export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted/70 p-4 ring-1 ring-border">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</dd>
      {detail ? <dd className="mt-0.5 text-xs text-muted">{detail}</dd> : null}
    </div>
  );
}

const RATING_TONE: Record<VitalRating, Tone> = {
  good: 'brand',
  'needs-improvement': 'expiry',
  poor: 'critical',
};

/** Color + text: the rating is never shown by color alone. */
export function RatingChip({ rating, label }: { rating: VitalRating; label: string }) {
  return <Chip tone={RATING_TONE[rating]}>{label}</Chip>;
}
