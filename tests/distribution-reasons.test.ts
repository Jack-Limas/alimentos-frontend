import { describe, expect, it } from 'vitest';
import { PLAN_REASON_PARAMS, planReasonMessage } from '@/features/distribution/reasons';
import en from '../messages/en.json';
import es from '../messages/es.json';

describe('planReasonMessage', () => {
  it('turns a plan reason into a key, its params and the translated unit', () => {
    expect(
      planReasonMessage(
        { code: 'PARTIAL_STOCK', params: { requested: 18, allocated: 12.5 } },
        'kg',
      ),
    ).toEqual({ key: 'PARTIAL_STOCK', values: { unit: 'kg', requested: 18, allocated: 12.5 } });
    expect(planReasonMessage({ code: 'OVERDUE', params: { days: 2 } }, 'kg').values.days).toBe(2);
  });

  it('never shows an unknown server code as sent', () => {
    expect(planReasonMessage({ code: 'SOMETHING_NEW', params: { x: 1 } }, 'kg')).toEqual({
      key: 'UNKNOWN',
      values: {},
    });
  });

  it.each(Object.entries({ es, en }))('%s translates every plan reason', (_locale, messages) => {
    for (const code of [...Object.keys(PLAN_REASON_PARAMS), 'UNKNOWN']) {
      expect(messages.Distribution.reasons).toHaveProperty(code);
    }
  });
});
