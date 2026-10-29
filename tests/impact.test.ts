import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { countUpValue } from '@/components/ui/count-up';
import {
  fetchImpact,
  IMPACT_REVALIDATE_S,
  impactApiOrigin,
  type Impact,
} from '@/features/impact/impact';

const impact: Impact = {
  windowDays: 30,
  from: '2026-09-30',
  to: '2026-10-29',
  dispatched: { KG: 1250.5, UNIT: 300 },
  rescued: { KG: 410.25 },
  rescueDays: 7,
  deliveries: { total: 40, onTime: 37, onTimePct: 92.5 },
  customersServed: { total: 9, byType: { FOOD_BANK: 4, SCHOOL: 5 } },
  generatedAt: '2026-10-29T15:00:00.000Z',
};

const ok = (body: unknown) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));

describe('impact data for ISR', () => {
  it('prefers API_URL_INTERNAL and falls back to NEXT_PUBLIC_API_URL', () => {
    expect(
      impactApiOrigin({
        API_URL_INTERNAL: 'http://backend.internal:4000',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      }),
    ).toBe('http://backend.internal:4000');
    expect(impactApiOrigin({ NEXT_PUBLIC_API_URL: 'https://api.example.com' })).toBe(
      'https://api.example.com',
    );
    expect(
      impactApiOrigin({
        API_URL_INTERNAL: 'not a url',
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      }),
    ).toBe('https://api.example.com');
    expect(impactApiOrigin({})).toBeNull();
  });

  it('fetches /api/v1/public/impact with hourly revalidation', async () => {
    const fetchImpl = ok({ data: impact });
    await expect(fetchImpact({ origin: 'https://api.example.com', fetchImpl })).resolves.toEqual(
      impact,
    );
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit & { next: unknown },
    ];
    expect(url).toBe('https://api.example.com/api/v1/public/impact');
    expect(init.next).toEqual({ revalidate: IMPACT_REVALIDATE_S });
    expect(IMPACT_REVALIDATE_S).toBe(3600);
  });

  it('returns the fallback (null) instead of throwing when the backend fails', async () => {
    const origin = 'https://api.example.com';
    await expect(
      fetchImpact({ origin, fetchImpl: () => Promise.reject(new TypeError('fetch failed')) }),
    ).resolves.toBeNull();
    await expect(
      fetchImpact({ origin, fetchImpl: () => Promise.resolve(new Response('', { status: 503 })) }),
    ).resolves.toBeNull();
    await expect(fetchImpact({ origin, fetchImpl: ok({ data: { nope: 1 } }) })).resolves.toBeNull();
    await expect(
      fetchImpact({ origin, fetchImpl: () => Promise.resolve(new Response('<html>')) }),
    ).resolves.toBeNull();
    await expect(
      fetchImpact({ origin: null, fetchImpl: ok({ data: impact }) }),
    ).resolves.toBeNull();
  });

  it('the page exports revalidate = 3600 and static params for es and en', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/[locale]/impact/page.tsx'), 'utf8');
    expect(page).toMatch(/export const revalidate = 3600;/);
    expect(page).toMatch(/export function generateStaticParams\(\)/);
    expect(page).toMatch(/routing\.locales\.map/);
  });
});

describe('animated counters', () => {
  it('count up with decimals and land on the exact value', () => {
    expect(countUpValue(92.5, 1, 1)).toBe(92.5);
    expect(countUpValue(1250.5, 0, 1)).toBe(0);
    expect(countUpValue(1250.5, 0.5, 1)).toBeCloseTo(1094.2, 1);
    expect(countUpValue(300, 1)).toBe(300);
  });
});
