import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EngineClient,
  EngineRunError,
  type WorkerLike,
} from '@/features/distribution/engine-client';
import type { DistributionSnapshot } from '@/features/distribution/engine';
import {
  createEngineHandler,
  type EngineRequest,
  type EngineResponse,
} from '@/features/distribution/worker-protocol';
import { generateSnapshot } from '@/features/distribution/synthetic';

const fixture = JSON.parse(
  readFileSync(
    join(import.meta.dirname, 'fixtures', 'distribution-parity', '01-balanced-rescoring.json'),
    'utf8',
  ),
) as { snapshot: DistributionSnapshot; expected: { ranking: unknown[] } };

function runHandler(...requests: EngineRequest[]) {
  const out: EngineResponse[] = [];
  const handle = createEngineHandler((message) => out.push(message), { now: () => 0 });
  requests.forEach(handle);
  return out;
}

describe('worker protocol (the handler the worker runs)', () => {
  it('run → progress … → result with the same plan as the engine', () => {
    const out = runHandler({
      type: 'run',
      requestId: 7,
      snapshot: fixture.snapshot,
      strategy: 'BALANCED',
      progressEvery: 2,
    });

    const types = out.map((m) => m.type);
    expect(types.at(-1)).toBe('result');
    expect(types.slice(0, -1).every((t) => t === 'progress')).toBe(true);
    expect(out.every((m) => m.requestId === 7)).toBe(true);
    const result = out.at(-1) as Extract<EngineResponse, { type: 'result' }>;
    expect(result.result.ranking).toEqual(fixture.expected.ranking);
    expect(result.result.lines?.length).toBeGreaterThan(0);
    expect(result.durationMs).toBe(0);
  });

  it('answers a summary and the top orders only when asked', () => {
    const snapshot = generateSnapshot({ orders: 1000, seed: 1 });
    const [result] = runHandler({
      type: 'run',
      requestId: 1,
      snapshot,
      strategy: 'WASTE_FIRST',
      detail: 'summary',
      top: 5,
      progressEvery: 10_000,
    }).filter((m) => m.type === 'result') as Extract<EngineResponse, { type: 'result' }>[];

    expect(result?.result.ranking).toHaveLength(5);
    expect(result?.result.lines).toBeUndefined();
    expect(result?.result.summary.itemsProcessed).toBeGreaterThan(1000);
  });

  it('answers an error message for invalid weights', () => {
    const [message] = runHandler({
      type: 'run',
      requestId: 3,
      snapshot: fixture.snapshot,
      strategy: 'BALANCED',
      weights: { priority: 50, deadlineUrgency: 50, expiryPressure: 50 },
    });
    expect(message).toMatchObject({ type: 'error', requestId: 3, code: 'INVALID_WEIGHTS' });
  });

  it('never runs a request cancelled while it was queued', () => {
    const out = runHandler(
      { type: 'cancel', requestId: 4 },
      { type: 'run', requestId: 4, snapshot: fixture.snapshot, strategy: 'BALANCED' },
    );
    expect(out).toEqual([]);
  });
});

/** A fake worker that keeps the requests and lets the test answer them. */
function fakeWorker() {
  const sent: EngineRequest[] = [];
  let terminated = 0;
  const workers: WorkerLike[] = [];
  const create = (): WorkerLike => {
    const worker: WorkerLike = {
      postMessage: (message) => sent.push(message),
      terminate: () => {
        terminated += 1;
      },
      onmessage: null,
      onerror: null,
    };
    workers.push(worker);
    return worker;
  };
  const reply = (message: EngineResponse) =>
    workers.at(-1)?.onmessage?.({ data: message } as MessageEvent<EngineResponse>);
  return { create, sent, reply, workers, terminated: () => terminated };
}

const job = { snapshot: fixture.snapshot, strategy: 'BALANCED' as const };
const result = (requestId: number) =>
  ({
    type: 'result',
    requestId,
    durationMs: 3,
    result: { summary: {} as never, ranking: [] },
  }) satisfies EngineResponse;

describe('EngineClient', () => {
  it('drops the result of an older run on the same channel', async () => {
    const fake = fakeWorker();
    const client = new EngineClient(fake.create);

    const first = client.run(job, { channel: 'sim' });
    const second = client.run(job, { channel: 'sim' });

    await expect(first).resolves.toEqual({ status: 'superseded' });
    expect(fake.sent.map((m) => [m.type, m.requestId])).toEqual([
      ['run', 1],
      ['cancel', 1],
      ['run', 2],
    ]);
    // The stale answer still arrives from the worker: ignored.
    fake.reply(result(1));
    fake.reply(result(2));
    await expect(second).resolves.toMatchObject({ status: 'done', durationMs: 3 });
  });

  it('keeps runs on different channels apart and reports progress', async () => {
    const fake = fakeWorker();
    const client = new EngineClient(fake.create);
    const progress: number[] = [];

    const a = client.run(job, {
      channel: 'BALANCED',
      onProgress: (served) => progress.push(served),
    });
    const b = client.run(job, { channel: 'WASTE_FIRST' });
    fake.reply({ type: 'progress', requestId: 1, served: 500, total: 1000 });
    fake.reply(result(2));
    fake.reply(result(1));

    await expect(a).resolves.toMatchObject({ status: 'done' });
    await expect(b).resolves.toMatchObject({ status: 'done' });
    expect(progress).toEqual([500]);
    expect(fake.workers).toHaveLength(1);
  });

  it('rejects with the engine error code', async () => {
    const fake = fakeWorker();
    const client = new EngineClient(fake.create);
    const run = client.run(job);
    fake.reply({ type: 'error', requestId: 1, code: 'INVALID_WEIGHTS', message: 'bad' });

    await expect(run).rejects.toEqual(new EngineRunError('INVALID_WEIGHTS', 'bad'));
  });

  it('terminates the worker on cancel/unmount and starts a new one for the next run', async () => {
    const fake = fakeWorker();
    const client = new EngineClient(fake.create);
    const running = client.run(job);

    client.terminate();
    await expect(running).resolves.toEqual({ status: 'cancelled' });
    expect(fake.terminated()).toBe(1);

    const next = client.run(job);
    expect(fake.workers).toHaveLength(2);
    fake.reply(result(2));
    await expect(next).resolves.toMatchObject({ status: 'done' });
  });

  it('fails every pending run when the worker script errors', async () => {
    const fake = fakeWorker();
    const client = new EngineClient(fake.create);
    const run = client.run(job);
    fake.workers[0]?.onerror?.({ message: 'load failed' } as ErrorEvent);

    await expect(run).rejects.toMatchObject({ code: 'WORKER_ERROR' });
  });
});
