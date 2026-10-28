'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/use-auth';
import { PRODUCT_WRITE_INVALIDATES, productKeys } from '@/features/inventory/query-keys';
import type { Unit } from '@/features/inventory/types';
import type { DataResponse, Paginated } from '@/lib/api';
import { PRODUCTS_PAGE_SIZE, toProductsApiQuery, type ProductFilters } from './filters';
import type { Product, ProductDetail, ProductInput, ProductPatch } from './types';

const MAX_PAGE_SIZE = 100;

/** Pages a list in the browser, with the same meta the API returns. */
export function pageLocally<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    meta: { page, pageSize, total: items.length },
  };
}

export function useProducts(filters: ProductFilters) {
  const { authFetch } = useAuth();
  const query = toProductsApiQuery(filters);
  return useQuery({
    queryKey: productKeys.list(query),
    queryFn: () => authFetch<Paginated<Product>>(`/products?${query}`),
    // Keeps the previous page on screen while the next one loads (no flicker).
    placeholderData: keepPreviousData,
    select: (body) =>
      filters.wasteRisk
        ? pageLocally(
            body.data.filter((product) => product.wasteRisk === filters.wasteRisk),
            filters.page,
            PRODUCTS_PAGE_SIZE,
          )
        : body,
  });
}

export function useProduct(id: string) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => (await authFetch<DataResponse<ProductDetail>>(`/products/${id}`)).data,
  });
}

export interface ProductIndexEntry {
  name: string;
  unit: Unit;
}

/** Names and units of every product (a handful of pages of 100), for the movements table. */
export function useProductIndex(enabled = true) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: productKeys.index(),
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const index = new Map<string, ProductIndexEntry>();
      for (let page = 1; ; page += 1) {
        const body = await authFetch<Paginated<Product>>(
          `/products?page=${page}&pageSize=${MAX_PAGE_SIZE}`,
        );
        for (const product of body.data) {
          index.set(product.id, { name: product.name, unit: product.unit });
        }
        if (page * MAX_PAGE_SIZE >= body.meta.total) return index;
      }
    },
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      PRODUCT_WRITE_INVALIDATES.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useCreateProduct() {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async (input: ProductInput) =>
      (await authFetch<DataResponse<Product>>('/products', { method: 'POST', json: input })).data,
    onSuccess: invalidate,
  });
}

export function useUpdateProduct(id: string) {
  const { authFetch } = useAuth();
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async (patch: ProductPatch) =>
      (
        await authFetch<DataResponse<Product>>(`/products/${id}`, {
          method: 'PATCH',
          json: patch,
        })
      ).data,
    onSuccess: invalidate,
  });
}

/** Every ACTIVE product with its metrics (pages of 100), for pickers such as the new order form. */
export function useActiveProducts(enabled = true) {
  const { authFetch } = useAuth();
  return useQuery({
    queryKey: [...productKeys.all, 'active-all'],
    enabled,
    queryFn: async () => {
      const products: Product[] = [];
      for (let page = 1; ; page += 1) {
        const body = await authFetch<Paginated<Product>>(
          `/products?status=ACTIVE&page=${page}&pageSize=${MAX_PAGE_SIZE}`,
        );
        products.push(...body.data);
        if (page * MAX_PAGE_SIZE >= body.meta.total) return products;
      }
    },
  });
}
