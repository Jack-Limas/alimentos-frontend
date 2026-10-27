import type { ReactNode } from 'react';

export type Tone = 'brand' | 'expiry' | 'critical' | 'berry' | 'lagoon' | 'sand' | 'forest';

const tones: Record<Tone, string> = {
  brand:
    'bg-brand-100 text-brand-800 ring-brand-200 dark:bg-brand-900/50 dark:text-brand-200 dark:ring-brand-800',
  expiry:
    'bg-expiry-100 text-expiry-800 ring-expiry-200 dark:bg-expiry-900/40 dark:text-expiry-200 dark:ring-expiry-800',
  critical:
    'bg-critical-100 text-critical-800 ring-critical-200 dark:bg-critical-900/40 dark:text-critical-200 dark:ring-critical-800',
  berry:
    'bg-berry-100 text-berry-800 ring-berry-200 dark:bg-berry-900/40 dark:text-berry-200 dark:ring-berry-800',
  lagoon:
    'bg-lagoon-100 text-lagoon-800 ring-lagoon-200 dark:bg-lagoon-900/40 dark:text-lagoon-200 dark:ring-lagoon-800',
  sand: 'bg-sand-100 text-sand-700 ring-sand-200 dark:bg-sand-800 dark:text-sand-200 dark:ring-sand-700',
  forest:
    'bg-forest-100 text-forest-800 ring-forest-200 dark:bg-forest-900/60 dark:text-forest-100 dark:ring-forest-700',
};

const dots: Record<Tone, string> = {
  brand: 'bg-brand-500',
  expiry: 'bg-expiry-500',
  critical: 'bg-critical-500',
  berry: 'bg-berry-500',
  lagoon: 'bg-lagoon-500',
  sand: 'bg-sand-400',
  forest: 'bg-forest-500',
};

interface ChipProps {
  tone: Tone;
  children: ReactNode;
  /** A small dot before the text; the text always carries the meaning. */
  dot?: boolean;
  title?: string;
}

export function Chip({ tone, children, dot = true, title }: ChipProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      {dot ? <span aria-hidden="true" className={`size-1.5 rounded-full ${dots[tone]}`} /> : null}
      {children}
    </span>
  );
}
