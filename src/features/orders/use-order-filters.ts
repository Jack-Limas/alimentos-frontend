'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { parseOrderFilters, serializeOrderFilters, type OrderFilters } from './filters';

/** Order filters live in the URL: reloadable, shareable, undone with the back button. */
export function useOrderFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseOrderFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: OrderFilters) => {
      const query = serializeOrderFilters(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return { filters, setFilters };
}
