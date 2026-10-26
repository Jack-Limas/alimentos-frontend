import { describe, expect, it } from 'vitest';
import { initialsOf } from '@/components/layout/initials';

describe('initialsOf', () => {
  it.each([
    ['Ana María López', 'AM'],
    ['Operador AlimentaIQ', 'OA'],
    ['administrador', 'A'],
    ['  ñandú   veloz ', 'ÑV'],
    ['', '?'],
    ['   ', '?'],
  ])('%j → %s', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});
