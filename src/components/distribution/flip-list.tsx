'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * FLIP (First, Last, Invert, Play): after a re-render, each item that moved
 * starts at its old position and slides to the new one with the Web
 * Animations API. Items are matched by `data-flip-key`. With reduced motion
 * the list simply jumps to the new order.
 */
export function FlipList({
  order,
  className = '',
  label,
  children,
}: {
  /** Keys in display order; the animation runs when it changes. */
  order: readonly string[];
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  const reduced = useReducedMotion();
  const signature = order.join('|');

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const next = new Map<string, number>();
    for (const item of list.querySelectorAll<HTMLElement>('[data-flip-key]')) {
      const key = item.dataset.flipKey ?? '';
      const top = item.getBoundingClientRect().top;
      next.set(key, top);
      const previous = positions.current.get(key);
      if (reduced || previous === undefined || previous === top) continue;
      item.animate(
        [{ transform: `translateY(${String(previous - top)}px)` }, { transform: 'translateY(0)' }],
        { duration: 360, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    }
    positions.current = next;
  }, [signature, reduced]);

  return (
    <ol ref={listRef} aria-label={label} className={className}>
      {children}
    </ol>
  );
}
