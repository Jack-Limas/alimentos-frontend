import type { ReactNode } from 'react';

type Illustration = 'crate' | 'search' | 'ledger';

/** Small hand-drawn style scenes made of the theme tokens (no external images). */
function Art({ kind }: { kind: Illustration }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 120" className="h-28 w-36">
      <ellipse cx="80" cy="108" rx="58" ry="7" className="fill-sand-200 dark:fill-sand-800" />
      {kind === 'ledger' ? (
        <>
          <rect
            x="42"
            y="18"
            width="76"
            height="86"
            rx="8"
            className="fill-surface stroke-sand-300 dark:stroke-sand-600"
            strokeWidth="3"
          />
          {[38, 52, 66, 80].map((y, index) => (
            <g key={y}>
              <circle
                cx="56"
                cy={y}
                r="4"
                className={index % 2 ? 'fill-berry-300' : 'fill-brand-300'}
              />
              <rect
                x="66"
                y={y - 3}
                width={index === 3 ? 26 : 38}
                height="6"
                rx="3"
                className="fill-sand-200 dark:fill-sand-700"
              />
            </g>
          ))}
        </>
      ) : (
        <>
          {/* Wooden crate */}
          <path
            d="M34 58h92l-8 46H42z"
            className="fill-expiry-200 stroke-expiry-600 dark:fill-expiry-800/60 dark:stroke-expiry-400"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M38 74h84M40 89h80"
            className="stroke-expiry-600/60 dark:stroke-expiry-400/60"
            strokeWidth="3"
          />
          {/* Leaves sticking out */}
          <path
            d="M64 58c-6-18 4-30 18-34-2 14-6 26-18 34z"
            className="fill-brand-400 dark:fill-brand-500"
          />
          <path
            d="M82 58c4-14 16-20 28-18-6 10-14 17-28 18z"
            className="fill-forest-400 dark:fill-forest-300"
          />
          <path
            d="M72 58c0-8 2-15 8-22"
            className="stroke-forest-700 dark:stroke-forest-200"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === 'search' ? (
        <g>
          <circle
            cx="112"
            cy="40"
            r="17"
            className="fill-lagoon-100 stroke-lagoon-600 dark:fill-lagoon-900/60 dark:stroke-lagoon-300"
            strokeWidth="4"
          />
          <path
            d="M124 53l14 14"
            className="stroke-lagoon-600 dark:stroke-lagoon-300"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
      ) : null}
    </svg>
  );
}

interface EmptyStateProps {
  illustration?: Illustration;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  illustration = 'crate',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-border bg-surface/70 px-6 py-10 text-center">
      <Art kind={illustration} />
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
