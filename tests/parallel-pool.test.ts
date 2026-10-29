import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildProposal,
  createStrategy,
  type DistributionSnapshot,
  type PrioritizationStrategy,
  type RuleStrategyName,
  type Weights,
} from '@/features/distribution/engine';
import {
  CONTROL,
  createControl,
  partition,
  poolAvailable,
  poolSize,
  progressOf,
  scoreRange,
  waitForWorkers,
} from '@/features/distribution/parallel';
import { ParallelEngine, type PoolWorkerLike } from '@/features/distribution/parallel-engine';
import {
  createPoolHandler,
  type PoolRequest,
  type PoolResponse,
} from '@/features/distribution/pool-protocol';
import { generateSnapshot } from '@/features/distribution/synthetic';
import { toEngineResult } from '@/features/distribution/worker-protocol';

interface ParityFixture {
  strategy: RuleStrategyName;
  weights?: Weights;
  snapshot: DistributionSnapshot;
  expected: Record<string, unknown>;
}

const dir = join(import.meta.dirname, 'fixtures', 'distribution-parity');
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => [f, JSON.parse(readFileSync(join(dir, f), 'utf8')) as ParityFixture] as const);

/** Scores the snapshot the way the pool does: `parts` ranges into one shared array. */
function scoreInParts(
  snapshot: DistributionSnapshot,
  strategy: PrioritizationStrategy,
  parts: number,
) {
  const { scores, control } = createControl(snapshot.orders.length);
  for (const [start, end] of partition(snapshot.orders.length, parts)) {
    scoreRange({ snapshot, strategy, start, end, scores, control });
  }
  return { scores, control };
}

describe('pool sizing and partition', () => {
  it('uses hardwareConcurrency - 1 workers, between 1 and 4', () => {
    expect(poolSize(8)).toBe(4);
    expect(poolSize(4)).toBe(3);
    expect(poolSize(2)).toBe(1);
    expect(poolSize(1)).toBe(1);
    expect(poolSize(undefined)).toBe(1);
  });

  it('is available only on a cross-origin isolated page with SharedArrayBuffer', () => {
    expect(poolAvailable({ crossOriginIsolated: true, SharedArrayBuffer })).toBe(true);
    expect(poolAvailable({ crossOriginIsolated: false, SharedArrayBuffer })).toBe(false);
    expect(poolAvailable({ crossOriginIsolated: true })).toBe(false);
  });

  it('splits the orders into contiguous ranges that cover them all once', () => {
    expect(partition(10, 3)).toEqual([
      [0, 4],
      [4, 7],
      [7, 10],
    ]);
    expect(partition(2, 4)).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(partition(0, 4)).toEqual([[0, 0]]);
    const ranges = partition(10_001, 4);
    expect(ranges.at(-1)?.[1]).toBe(10_001);
    expect(ranges.every(([start], i) => i === 0 || start === ranges[i - 1]?.[1])).toBe(true);
  });
});

describe('parity: the pool gives exactly the single-worker plan', () => {
  it.each(fixtures)('%s', (_file, fixture) => {
    const strategy = createStrategy(fixture.strategy, fixture.weights);
    for (const parts of [1, 2, 3, 4]) {
      const { scores, control } = scoreInParts(fixture.snapshot, strategy, parts);
      const pooled = buildProposal(fixture.snapshot, strategy, {
        now: () => 0,
        initialScores: scores,
      });
      const single = buildProposal(fixture.snapshot, strategy, { now: () => 0 });
      expect(pooled).toEqual(single);
      const summary = { ...pooled.summary, processingMs: undefined };
      expect({ ranking: pooled.ranking, lines: pooled.lines, summary }).toEqual(fixture.expected);
      expect(progressOf(control)).toBe(0.5);
      expect(Atomics.load(control, CONTROL.DONE)).toBe(
        Math.min(parts, fixture.snapshot.orders.length),
      );
    }
  });

  // 3,000 orders scored twice: seconds on a busy machine, so it gets more than the default 5 s.
  it('holds on a large synthetic snapshot too', { timeout: 30_000 }, () => {
    const snapshot = generateSnapshot({ orders: 3_000, seed: 9 });
    const strategy = createStrategy('WASTE_FIRST');
    const { scores } = scoreInParts(snapshot, strategy, 4);
    expect(buildProposal(snapshot, strategy, { now: () => 0, initialScores: scores })).toEqual(
      buildProposal(snapshot, strategy, { now: () => 0 }),
    );
  });
});

describe('cancellation with the shared flag', () => {
  const snapshot = generateSnapshot({ orders: 1_000, seed: 3 });

  it('stops before scoring when the flag is already set, and still signals DONE', () => {
    const { scores, control } = createControl(snapshot.orders.length);
    Atomics.store(control, CONTROL.CANCEL, 1);
    const outcome = scoreRange({
      snapshot,
      strategy: createStrategy('BALANCED'),
      start: 0,
      end: 1_000,
      scores,
      control,
    });
    expect(outcome).toBe('cancelled');
    expect(Atomics.load(control, CONTROL.PROGRESS)).toBe(0);
    expect(Atomics.load(control, CONTROL.DONE)).toBe(1);
  });

  it('stops in the middle of a range when the flag is set while it runs', () => {
    const { scores, control } = createControl(snapshot.orders.length);
    const base = createStrategy('BALANCED');
    let scored = 0;
    // Another thread would set the flag; here the strategy does it after 250 orders.
    const strategy: PrioritizationStrategy = {
      name: base.name,
      weights: base.weights,
      score: (...args) => {
        scored += 1;
        if (scored === 250) Atomics.store(control, CONTROL.CANCEL, 1);
        return base.score(...args);
      },
    };
    expect(scoreRange({ snapshot, strategy, start: 0, end: 1_000, scores, control })).toBe(
      'cancelled',
    );
    expect(Atomics.load(control, CONTROL.PROGRESS)).toBe(250);
    // Half the ring is the scoring: 250 of 1,000 scored = 12.5 %.
    expect(progressOf(control)).toBe(0.125);
  });
});

describe('waiting without blocking the page', () => {
  it('waits with Atomics.waitAsync until every worker is done', async () => {
    const { control } = createControl(10);
    setTimeout(() => {
      Atomics.add(control, CONTROL.DONE, 1);
      Atomics.notify(control, CONTROL.DONE);
    }, 10);
    setTimeout(() => {
      Atomics.add(control, CONTROL.DONE, 1);
      Atomics.notify(control, CONTROL.DONE);
    }, 20);
    await expect(waitForWorkers(control, 2)).resolves.toBeUndefined();
  });

  it('falls back to checking once per frame without Atomics.waitAsync', async () => {
    const { control } = createControl(10);
    let frames = 0;
    const nextFrame = () =>
      new Promise<void>((resolve) => {
        frames += 1;
        if (frames === 3) Atomics.add(control, CONTROL.DONE, 1);
        setTimeout(resolve, 0);
      });
    await waitForWorkers(control, 1, { waitAsync: null, nextFrame });
    expect(frames).toBe(3);
  });
});

/** Fake workers that run the real pool handler asynchronously, like a thread would. */
function fakeWorkers() {
  const created: PoolWorkerLike[] = [];
  const create = (): PoolWorkerLike => {
    const worker: PoolWorkerLike = {
      onmessage: null,
      onerror: null,
      terminate: () => undefined,
      postMessage: (message: PoolRequest) => {
        setTimeout(() => {
          handler(message);
        }, 1);
      },
    };
    const handler = createPoolHandler(
      (response: PoolResponse) =>
        worker.onmessage?.({ data: response } as MessageEvent<PoolResponse>),
      () => 0,
    );
    created.push(worker);
    return worker;
  };
  return { create, created };
}

describe('ParallelEngine', () => {
  const snapshot = generateSnapshot({ orders: 2_000, seed: 11 });

  it('scores in N workers and allocates in one, with the single-worker result', async () => {
    const fake = fakeWorkers();
    const engine = new ParallelEngine(fake.create, 3, () => 0);
    const run = engine.run({ snapshot, strategy: 'BALANCED', top: 10 });
    const outcome = await run.done;

    expect(fake.created).toHaveLength(3);
    expect(outcome.status).toBe('done');
    if (outcome.status !== 'done') return;
    const single = toEngineResult(
      buildProposal(snapshot, createStrategy('BALANCED'), { now: () => 0 }),
      'summary',
      10,
    );
    expect(outcome.result).toEqual(single);
    expect(outcome.workers).toBe(3);
    expect(progressOf(run.control)).toBe(1);
  });

  it('can also be cancelled during the sequential allocation', async () => {
    const fake = fakeWorkers();
    const engine = new ParallelEngine(fake.create, 2, () => 0);
    const run = engine.run({ snapshot, strategy: 'BALANCED' });
    // Cancel once the scoring is done, while worker 0 allocates.
    const watcher = setInterval(() => {
      if (Atomics.load(run.control, CONTROL.DONE) === 2) {
        engine.cancel(run.control);
        clearInterval(watcher);
      }
    }, 0);
    await expect(run.done).resolves.toEqual({ status: 'cancelled', workers: 2 });
    clearInterval(watcher);
  });

  it('reports the allocation in the second half of the progress', () => {
    const { control } = createControl(100);
    Atomics.store(control, CONTROL.PROGRESS, 100);
    Atomics.store(control, CONTROL.ALLOCATED, 50);
    expect(progressOf(control)).toBe(0.75);
  });

  it('cancels a run in the middle and reports it', async () => {
    const fake = fakeWorkers();
    const engine = new ParallelEngine(fake.create, 4, () => 0);
    const run = engine.run({ snapshot, strategy: 'BALANCED' });
    engine.cancel(run.control);

    await expect(run.done).resolves.toEqual({ status: 'cancelled', workers: 4 });
    expect(Atomics.load(run.control, CONTROL.DONE)).toBe(4);
  });
});
