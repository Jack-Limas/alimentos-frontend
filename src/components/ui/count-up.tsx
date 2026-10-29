'use client';

import { useFormatter } from 'next-intl';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const DURATION_MS = 900;

/** Ease-out cubic: fast start, gentle landing. `progress` goes from 0 to 1. */
export function countUpValue(target: number, progress: number, decimals = 0): number {
  const clamped = Math.min(1, Math.max(0, progress));
  const factor = 10 ** decimals;
  return Math.round(target * (1 - (1 - clamped) ** 3) * factor) / factor;
}

/**
 * A number that counts up from 0 when it appears (whole by default). With
 * reduced motion it shows the final value at once. Screen readers always get
 * the final value.
 */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const format = useFormatter();
  const reducedMotion = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = (now - start) / DURATION_MS;
      setAnimated(countUpValue(value, progress, decimals));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion, decimals]);

  const shown = reducedMotion ? value : animated;
  const options = { maximumFractionDigits: decimals };
  return (
    <>
      <span aria-hidden="true" className="tabular-nums">
        {format.number(shown, options)}
      </span>
      <span className="sr-only">{format.number(value, options)}</span>
    </>
  );
}
