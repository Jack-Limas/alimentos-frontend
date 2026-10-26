/** Text logo: brand name only, no external image (keeps COEP simple). */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0">
        <circle cx="12" cy="12" r="11" className="fill-brand-600 dark:fill-brand-400" />
        <path
          d="M7.5 14.5c0-4 3.2-7 9-7.5-.4 5.6-3.4 9-7.4 9-.6 0-1.1-.1-1.6-.3"
          className="fill-none stroke-white stroke-[1.8] dark:stroke-brand-950"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 17.5c1.6-2.4 3.6-4.3 6-5.6"
          className="fill-none stroke-white stroke-[1.8] dark:stroke-brand-950"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">
        Alimenta<span className="text-primary">IQ</span>
      </span>
    </span>
  );
}
