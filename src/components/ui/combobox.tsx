'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { inputClass } from './field';
import { Icon } from './icons';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary line (type, stock…). */
  hint?: string;
  /** Small element at the end of the row (a badge). */
  aside?: ReactNode;
}

/** Lowercase without accents, so "pina" finds "Piña". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

interface ComboboxProps {
  id: string;
  options: readonly ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyText: string;
  invalid?: boolean;
  describedBy?: string | undefined;
  /** At most this many matches are listed. */
  limit?: number;
}

/**
 * Searchable select following the ARIA combobox pattern: type to filter,
 * arrows to move, Enter to choose, Escape to close.
 */
export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  invalid = false,
  describedBy,
  limit = 8,
}: ComboboxProps) {
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const needle = normalizeSearch(query);
    return options
      .filter((option) => normalizeSearch(option.label).includes(needle))
      .slice(0, limit);
  }, [options, query, limit]);

  function choose(option: ComboboxOption | undefined) {
    if (!option) return;
    onChange(option.value);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.min(current + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Icon
        name="search"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted"
      />
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${String(active)}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={open ? query : (selected?.label ?? '')}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery('');
          setActive(0);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className={`${inputClass} pl-10`}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-card motion-safe:animate-pop-in"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">{emptyText}</li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${String(index)}`}
                role="option"
                aria-selected={option.value === value}
                // mousedown keeps the focus in the input, so blur does not close the list first.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActive(index)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                  index === active ? 'bg-forest-50 dark:bg-forest-900/60' : ''
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{option.label}</span>
                  {option.hint ? (
                    <span className="block truncate text-xs text-muted">{option.hint}</span>
                  ) : null}
                </span>
                {option.aside}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
