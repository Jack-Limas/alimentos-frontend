import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildProposal,
  createStrategy,
  type DistributionSnapshot,
  type RuleStrategyName,
  type Weights,
} from '@/features/distribution/engine';

// Copies of alimentos-backend/tests/fixtures/distribution-parity (see README for the source
// commit). Same input, same strategy → exactly the backend's plan (processingMs aside).
const dir = join(import.meta.dirname, 'fixtures', 'distribution-parity');

interface ParityFixture {
  description: string;
  strategy: RuleStrategyName;
  weights?: Weights;
  snapshot: DistributionSnapshot;
  expected: Record<string, unknown>;
}

const fixtures = readdirSync(dir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map(
    (file) => [file, JSON.parse(readFileSync(join(dir, file), 'utf8')) as ParityFixture] as const,
  );

describe('distribution engine parity with the backend', () => {
  it('has the three fixtures, one per rule strategy', () => {
    expect(fixtures).toHaveLength(3);
    expect(new Set(fixtures.map(([, f]) => f.strategy))).toEqual(
      new Set(['BALANCED', 'URGENCY_FIRST', 'WASTE_FIRST']),
    );
  });

  it.each(fixtures)('%s gives exactly the expected plan', (_file, fixture) => {
    const result = buildProposal(
      fixture.snapshot,
      createStrategy(fixture.strategy, fixture.weights),
      {
        now: () => 0,
      },
    );
    // processingMs is a timing, not part of the plan (toEqual ignores undefined keys).
    const summary = { ...result.summary, processingMs: undefined };
    expect({ ranking: result.ranking, lines: result.lines, summary }).toEqual(fixture.expected);
  });

  it('reports progress without changing the result', () => {
    const [, fixture] = fixtures[0]!;
    const calls: [number, number][] = [];
    const strategy = createStrategy(fixture.strategy, fixture.weights);
    const plain = buildProposal(fixture.snapshot, strategy, { now: () => 0 });
    const withProgress = buildProposal(fixture.snapshot, strategy, {
      now: () => 0,
      progressEvery: 1,
      onProgress: (served, total) => calls.push([served, total]),
    });

    expect(withProgress).toEqual(plain);
    const total = fixture.snapshot.orders.length;
    expect(calls.at(-1)).toEqual([total, total]);
    expect(calls.length).toBe(total + 1);
  });
});
