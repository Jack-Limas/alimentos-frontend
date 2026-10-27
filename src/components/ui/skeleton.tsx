/** Grey block that pulses while data loads. Purely decorative: pair it with a status text. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none ${className}`}
    />
  );
}
