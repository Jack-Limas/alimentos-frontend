'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  parseMovementFilters,
  serializeMovementFilters,
  type MovementFilters,
} from './movement-filters';

/** Movement filters live in the URL, like the product list filters. */
export function useMovementFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseMovementFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: MovementFilters) => {
      const query = serializeMovementFilters(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return { filters, setFilters };
}
