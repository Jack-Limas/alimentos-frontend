'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { parseProductFilters, serializeProductFilters, type ProductFilters } from './filters';

/**
 * The product list filters live in the URL: they survive a reload, can be
 * shared and the back button undoes them. Updates replace the history entry
 * so typing in the search box does not flood the history.
 */
export function useProductFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseProductFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: ProductFilters) => {
      const query = serializeProductFilters(next);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  return { filters, setFilters };
}
