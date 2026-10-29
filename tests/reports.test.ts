import { describe, expect, it, vi } from 'vitest';
import {
  downloadReport,
  fallbackFileName,
  parseContentDisposition,
  rangeDays,
  reportPath,
} from '@/features/reports/reports';

describe('Content-Disposition', () => {
  it('reads the quoted file name the backend sends', () => {
    expect(
      parseContentDisposition('attachment; filename="alimentaiq-orders-2026-10-01_2026-10-29.csv"'),
    ).toBe('alimentaiq-orders-2026-10-01_2026-10-29.csv');
  });

  it('prefers filename* (UTF-8) and decodes it', () => {
    expect(
      parseContentDisposition(
        `attachment; filename="informe.pdf"; filename*=UTF-8''informe%20de%20mermas%20%C3%B1.pdf`,
      ),
    ).toBe('informe de mermas ñ.pdf');
  });

  it('accepts unquoted names, escaped quotes and any case', () => {
    expect(parseContentDisposition('attachment; FILENAME=report.csv')).toBe('report.csv');
    expect(parseContentDisposition('attachment; filename="a \\"b\\".csv"')).toBe('a "b".csv');
  });

  it('never returns a path and handles missing or broken headers', () => {
    expect(parseContentDisposition('attachment; filename="../../etc/passwd"')).toBe(
      '.._.._etc_passwd',
    );
    expect(parseContentDisposition('attachment')).toBeNull();
    expect(parseContentDisposition(null)).toBeNull();
    expect(
      parseContentDisposition(`attachment; filename*=UTF-8''%E0%A4%A; filename="ok.csv"`),
    ).toBe('ok.csv');
  });
});

describe('report requests', () => {
  it('sends the range only to the reports that have one', () => {
    expect(
      reportPath({
        kind: 'inventory',
        format: 'pdf',
        locale: 'en',
        from: '2026-10-01',
        to: '2026-10-29',
      }),
    ).toBe('/reports/inventory?format=pdf&locale=en');
    expect(
      reportPath({
        kind: 'waste',
        format: 'csv',
        locale: 'es',
        from: '2026-10-01',
        to: '2026-10-29',
      }),
    ).toBe('/reports/waste?format=csv&locale=es&from=2026-10-01&to=2026-10-29');
  });

  it('counts the days of a range, both ends included', () => {
    expect(rangeDays('2026-10-01', '2026-10-31')).toBe(31);
    expect(rangeDays('2026-10-02', '2026-10-01')).toBeNull();
    expect(rangeDays('nope', '2026-10-01')).toBeNull();
  });

  it('downloads with the session, saves with the server name and measures the times', async () => {
    const body = new Blob(['﻿a;b\n1;2\n'], { type: 'text/csv' });
    const authRequest = vi.fn(() =>
      Promise.resolve(
        new Response(body, {
          headers: {
            'Content-Disposition': 'attachment; filename="alimentaiq-inventory-2026-10-29.csv"',
            'X-Generation-Time-Ms': '42.5',
          },
        }),
      ),
    );
    const save = vi.fn();
    let clock = 1_000;
    const result = await downloadReport(
      { kind: 'inventory', format: 'csv', locale: 'es' },
      { authRequest, save, now: () => (clock += 60), today: '2026-10-29' },
    );
    expect(authRequest).toHaveBeenCalledWith('/reports/inventory?format=csv&locale=es', {
      headers: { Accept: 'text/csv' },
    });
    expect(save).toHaveBeenCalledWith(expect.any(Blob), 'alimentaiq-inventory-2026-10-29.csv');
    expect(result).toMatchObject({
      fileName: 'alimentaiq-inventory-2026-10-29.csv',
      serverMs: 42.5,
      totalMs: 60,
    });
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('falls back to a generated name when the header cannot be read', async () => {
    const save = vi.fn();
    const result = await downloadReport(
      { kind: 'waste', format: 'pdf', locale: 'en' },
      {
        authRequest: () => Promise.resolve(new Response('%PDF-1.7')),
        save,
        today: '2026-10-29',
      },
    );
    expect(result.fileName).toBe(
      fallbackFileName({ kind: 'waste', format: 'pdf', locale: 'en' }, '2026-10-29'),
    );
    expect(result.fileName).toBe('alimentaiq-waste-2026-10-29.pdf');
    expect(result.serverMs).toBeNull();
  });
});
