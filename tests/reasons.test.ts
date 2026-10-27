import { describe, expect, it } from 'vitest';
import { REASON_PARAMS, reasonMessage } from '@/features/inventory/reasons';
import { REASON_CODES } from '@/features/inventory/types';
import en from '../messages/en.json';
import es from '../messages/es.json';

/** Top-level ICU argument names of a message ("{days, plural, ...}" → "days"). */
function placeholders(message: string): string[] {
  const names = new Set<string>();
  let depth = 0;
  for (let i = 0; i < message.length; i += 1) {
    if (message[i] === '{') {
      if (depth === 0) {
        const match = /^\{\s*([A-Za-z]+)/.exec(message.slice(i));
        if (match?.[1]) names.add(match[1]);
      }
      depth += 1;
    } else if (message[i] === '}') depth -= 1;
  }
  return [...names].sort();
}

const catalogs = { es: es.Reasons, en: en.Reasons } as const;

describe('reason messages', () => {
  it.each(Object.entries(catalogs))('%s has a message for every reason code', (_l, reasons) => {
    for (const code of [...REASON_CODES, 'UNKNOWN']) {
      expect(reasons[code as keyof typeof reasons], code).toBeTruthy();
    }
  });

  it.each(REASON_CODES)('%s uses the same placeholders in es and en', (code) => {
    expect(placeholders(es.Reasons[code])).toEqual(placeholders(en.Reasons[code]));
  });

  it.each(REASON_CODES)('%s only uses params the server sends, plus the unit', (code) => {
    const allowed = new Set([...REASON_PARAMS[code], 'unit']);
    for (const name of placeholders(es.Reasons[code])) expect(allowed).toContain(name);
    for (const param of REASON_PARAMS[code])
      expect(placeholders(es.Reasons[code])).toContain(param);
  });
});

describe('reasonMessage', () => {
  it('maps a known reason to its key, params and translated unit', () => {
    expect(
      reasonMessage(
        { code: 'BELOW_MIN_STOCK', params: { availableQty: 66.5, minStock: 150 } },
        'L',
      ),
    ).toEqual({ key: 'BELOW_MIN_STOCK', values: { unit: 'L', availableQty: 66.5, minStock: 150 } });
  });

  it('fills a missing param with 0 instead of breaking the message', () => {
    expect(reasonMessage({ code: 'EXPIRES_IN_DAYS', params: {} }, 'kg').values).toEqual({
      unit: 'kg',
      days: 0,
    });
  });

  it('maps an unknown code to the generic message, never to server text', () => {
    expect(reasonMessage({ code: 'SOMETHING_NEW', params: { x: 1 } }, 'kg')).toEqual({
      key: 'UNKNOWN',
      values: {},
    });
  });
});
