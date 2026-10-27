'use client';

import { useFormatter } from 'next-intl';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const DURATION_MS = 900;

/** Ease-out cubic: fast start, gentle landing. `progress` goes from 0 to 1. */
export function countUpValue(target: number, progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.round(target * (1 - (1 - clamped) ** 3));
}

/**
 * A whole number that counts up from 0 when it appears. With reduced motion
 * it shows the final value at once. Screen readers always get the final value.
 */
export function CountUp({ value }: { value: number }) {
  const format = useFormatter();
  const reducedMotion = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = (now - start) / DURATION_MS;
      setAnimated(countUpValue(value, progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);

  const shown = reducedMotion ? value : animated;
  return (
    <>
      <span aria-hidden="true" className="tabular-nums">
        {format.number(shown)}
      </span>
      <span className="sr-only">{format.number(value)}</span>
    </>
  );
}
