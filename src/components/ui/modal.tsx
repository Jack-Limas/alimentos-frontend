'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Native <dialog> opened with showModal(): the browser traps focus, makes the
 * page inert and closes on Escape. A click on the backdrop closes it too.
 * On phones it slides up as a bottom sheet.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const t = useTranslations('Forms');
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[1.75rem] border border-border bg-surface p-0 text-foreground shadow-card backdrop:bg-forest-950/55 backdrop:backdrop-blur-[2px] open:animate-pop-in sm:m-auto sm:max-w-lg sm:rounded-card"
    >
      <div className="relative p-5 sm:p-7">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-border sm:hidden"
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground active:scale-95 motion-reduce:active:scale-100"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current stroke-2"
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mt-5">{open ? children : null}</div>
      </div>
    </dialog>
  );
}
