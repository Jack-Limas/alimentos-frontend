import type { CustomerType } from '@/features/customers/types';
import type { Unit } from '@/features/inventory/types';
import { API_PREFIX } from '@/lib/api/client';
import { parseApiOrigin } from '@/lib/env';

/** GET /public/impact (contract 4.11): aggregates only, no personal data. */
export interface Impact {
  windowDays: number;
  from: string;
  to: string;
  /** Quantity dispatched per unit; units are never added together. */
  dispatched: Partial<Record<Unit, number>>;
  /** Of that, what came from lots at most `rescueDays` from expiring. */
  rescued: Partial<Record<Unit, number>>;
  rescueDays: number;
  deliveries: { total: number; onTime: number; onTimePct: number | null };
  customersServed: { total: number; byType: Partial<Record<CustomerType, number>> };
  generatedAt: string;
}

/** The page is regenerated at most once an hour (ISR). */
export const IMPACT_REVALIDATE_S = 3600;
/** A slow backend must not hold the build or a regeneration for long. */
export const IMPACT_TIMEOUT_MS = 8_000;

/**
 * Where the Next server reaches the API: API_URL_INTERNAL (a private address,
 * server only) or the public NEXT_PUBLIC_API_URL. null when neither is valid.
 */
export function impactApiOrigin(
  vars: { API_URL_INTERNAL?: string; NEXT_PUBLIC_API_URL?: string } = {
    API_URL_INTERNAL: process.env.API_URL_INTERNAL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
): string | null {
  for (const raw of [vars.API_URL_INTERNAL, vars.NEXT_PUBLIC_API_URL]) {
    if (!raw?.trim()) continue;
    try {
      return parseApiOrigin(raw);
    } catch {
      // Invalid value: try the next one.
    }
  }
  return null;
}

function isImpact(value: unknown): value is Impact {
  if (typeof value !== 'object' || value === null) return false;
  const impact = value as Partial<Impact>;
  return (
    typeof impact.generatedAt === 'string' &&
    typeof impact.dispatched === 'object' &&
    typeof impact.rescued === 'object' &&
    typeof impact.deliveries?.total === 'number' &&
    typeof impact.customersServed?.total === 'number'
  );
}

export interface FetchImpactDeps {
  origin?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * The figures for the public impact page, or null when the backend cannot be
 * reached, answers an error or sends something unexpected. Never throws: a
 * backend that is down during `next build` must not break the build, the page
 * shows "data not available" and the next regeneration tries again.
 */
export async function fetchImpact({
  origin = impactApiOrigin(),
  fetchImpl = fetch,
  timeoutMs = IMPACT_TIMEOUT_MS,
}: FetchImpactDeps = {}): Promise<Impact | null> {
  if (!origin) return null;
  try {
    const response = await fetchImpl(`${origin}${API_PREFIX}/public/impact`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: IMPACT_REVALIDATE_S },
    } as RequestInit);
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: unknown };
    return isImpact(body.data) ? body.data : null;
  } catch {
    return null;
  }
}
