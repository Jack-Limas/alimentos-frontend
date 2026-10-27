import { describe, expect, it } from 'vitest';
import {
  hasActiveFilters,
  parseProductFilters,
  serializeProductFilters,
  toProductsApiQuery,
  withFilter,
  type ProductFilters,
} from '@/features/products/filters';

const parse = (query: string) => parseProductFilters(new URLSearchParams(query));

describe('product filters and the URL', () => {
  it('round-trips every filter', () => {
    const filters: ProductFilters = {
      search: 'leche',
      category: 'DAIRY',
      stockStatus: 'LOW',
      expiringWithinDays: 7,
      status: 'ACTIVE',
      page: 3,
    };
    const query = serializeProductFilters(filters);
    expect(query).toBe(
      'search=leche&category=DAIRY&stockStatus=LOW&expiringWithinDays=7&status=ACTIVE&page=3',
    );
    expect(parse(query)).toEqual(filters);
  });

  it('gives page 1 and nothing else for an empty URL, and serializes it as ""', () => {
    expect(parse('')).toEqual({ page: 1 });
    expect(serializeProductFilters({ page: 1 })).toBe('');
  });

  it('drops invalid values instead of sending them to the API', () => {
    expect(
      parse('category=CANDY&stockStatus=OK&expiringWithinDays=-1&page=0&status=GONE&wasteRisk=LOW'),
    ).toEqual({ page: 1 });
    expect(parse('expiringWithinDays=7.5&page=abc')).toEqual({ page: 1 });
    expect(parse('expiringWithinDays=9999')).toEqual({ page: 1 });
  });

  it('trims the search and ignores a blank one', () => {
    expect(parse('search=%20%20arroz%20')).toEqual({ search: 'arroz', page: 1 });
    expect(parse('search=%20%20')).toEqual({ page: 1 });
  });

  it('keeps expiringWithinDays=0 (expires today) and the waste filter', () => {
    expect(parse('expiringWithinDays=0').expiringWithinDays).toBe(0);
    expect(serializeProductFilters({ page: 1, expiringWithinDays: 0 })).toBe(
      'expiringWithinDays=0',
    );
    expect(parse('wasteRisk=HIGH')).toEqual({ wasteRisk: 'HIGH', page: 1 });
  });

  it('goes back to page 1 when a filter changes and removes cleared filters', () => {
    const start: ProductFilters = { search: 'pan', category: 'BAKERY', page: 4 };
    expect(withFilter(start, { category: undefined })).toEqual({ search: 'pan', page: 1 });
    expect(withFilter(start, { page: 5 })).toEqual({ ...start, page: 5 });
    expect(withFilter(start, { search: '' })).toEqual({ category: 'BAKERY', page: 1 });
  });

  it('knows when any filter is active, ignoring the page', () => {
    expect(hasActiveFilters({ page: 2 })).toBe(false);
    expect(hasActiveFilters({ page: 1, stockStatus: 'OUT' })).toBe(true);
  });
});

describe('toProductsApiQuery', () => {
  it('sends the API filters with the page and page size', () => {
    expect(toProductsApiQuery({ category: 'FISH', page: 2 }, 12)).toBe(
      'category=FISH&page=2&pageSize=12',
    );
  });

  it('asks for every product when filtering by waste risk in the browser', () => {
    expect(toProductsApiQuery({ wasteRisk: 'HIGH', page: 3 }, 12)).toBe('page=1&pageSize=100');
  });
});
