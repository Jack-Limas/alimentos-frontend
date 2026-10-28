'use client';

import type { CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const COLORS = [
  'var(--color-brand-400)',
  'var(--color-expiry-300)',
  'var(--color-berry-400)',
  'var(--color-lagoon-400)',
  'var(--color-forest-300)',
];
const PIECES = 18;

/** Pieces spread on a circle with a little jitter; deterministic, so renders match. */
function piece(index: number): CSSProperties {
  const angle = (index / PIECES) * Math.PI * 2;
  const distance = 70 + (index % 4) * 18;
  return {
    '--dx': `${String(Math.round(Math.cos(angle) * distance))}px`,
    '--dy': `${String(Math.round(Math.sin(angle) * distance - 30))}px`,
    '--rot': `${String((index * 47) % 360)}deg`,
    background: COLORS[index % COLORS.length],
    animationDelay: `${String((index % 3) * 30)}ms`,
  } as CSSProperties;
}

/**
 * A short confetti burst from the center of its parent (which must be
 * `relative`). Decorative only; with reduced motion nothing is drawn and the
 * toast alone tells the news.
 */
export function Celebration({ burstKey }: { burstKey: number }) {
  const reducedMotion = useReducedMotion();
  if (burstKey === 0 || reducedMotion) return null;

  return (
    <span
      key={burstKey}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      {Array.from({ length: PIECES }, (_, index) => (
        <span
          key={index}
          style={piece(index)}
          className={`absolute animate-confetti ${index % 2 ? 'size-2 rounded-full' : 'h-3 w-1.5 rounded-sm'}`}
        />
      ))}
    </span>
  );
}
