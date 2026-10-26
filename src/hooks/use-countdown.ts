'use client';

import { useCallback, useEffect, useState } from 'react';
import { secondsUntil } from '@/features/auth/login-errors';

const TICK_MS = 250;

/**
 * Seconds left until a deadline set with `start(seconds)`. Ticks a few times
 * per second and recomputes from the clock, so it does not drift when the tab
 * is throttled in the background.
 */
export function useCountdown(): { secondsLeft: number; start: (seconds: number) => void } {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => {
      const left = secondsUntil(deadline, Date.now());
      setSecondsLeft(left);
      if (left === 0) setDeadline(null);
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [deadline]);

  const start = useCallback((seconds: number) => {
    setSecondsLeft(seconds);
    setDeadline(Date.now() + seconds * 1000);
  }, []);

  return { secondsLeft, start };
}
