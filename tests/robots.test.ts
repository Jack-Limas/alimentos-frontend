import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('robots.txt', () => {
  it('lets crawlers index the public pages and keeps the private area out', () => {
    const { rules } = robots();
    const rule = Array.isArray(rules) ? rules[0] : rules;

    expect(rule?.userAgent).toBe('*');
    expect(rule?.allow).toBe('/');
    expect(rule?.disallow).toEqual(['/es/app', '/en/app', '/es/system-check', '/en/system-check']);
  });
});
