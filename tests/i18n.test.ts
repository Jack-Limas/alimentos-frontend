import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import es from '../messages/es.json';

type Messages = Record<string, unknown>;

/** Flattens nested messages into "Namespace.key" → value pairs. */
function flatten(messages: Messages, prefix = ''): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of flatten(value as Messages, path)) {
        entries.set(nestedKey, nestedValue);
      }
    } else {
      entries.set(path, value);
    }
  }
  return entries;
}

const catalogs = { es: flatten(es), en: flatten(en) };

function missingKeys(from: Map<string, unknown>, to: Map<string, unknown>): string[] {
  return [...from.keys()].filter((key) => !to.has(key)).sort();
}

describe('i18n messages', () => {
  it('en.json has every key of es.json', () => {
    expect(missingKeys(catalogs.es, catalogs.en), 'keys missing in en.json').toEqual([]);
  });

  it('es.json has every key of en.json', () => {
    expect(missingKeys(catalogs.en, catalogs.es), 'keys missing in es.json').toEqual([]);
  });

  it.each(Object.entries(catalogs))(
    '%s.json has no empty or non-string values',
    (_locale, flat) => {
      const invalid = [...flat.entries()]
        .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
        .map(([key]) => key);

      expect(invalid).toEqual([]);
    },
  );

  it.each(Object.entries(catalogs))('%s.json: every page title ends with the brand', (_l, flat) => {
    const titles = [...flat.entries()].filter(([key]) => key.endsWith('.metaTitle'));
    expect(titles.length).toBeGreaterThan(15);
    expect(titles.filter(([, value]) => !String(value).endsWith(' · AlimentaIQ'))).toEqual([]);
  });

  it.each(Object.entries(catalogs))(
    '%s.json: the site has a title and a description',
    (_l, flat) => {
      expect(String(flat.get('Metadata.title')).length).toBeGreaterThan(10);
      expect(String(flat.get('Metadata.description')).length).toBeGreaterThan(50);
      expect(String(flat.get('Impact.metaDescription')).length).toBeGreaterThan(50);
    },
  );
});
