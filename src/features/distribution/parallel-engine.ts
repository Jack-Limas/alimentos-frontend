import type { DistributionSnapshot, RuleStrategyName, Weights } from './engine';
import { CONTROL, createControl, partition, waitForWorkers } from './parallel';
import type { PoolRequest, PoolResponse } from './pool-protocol';
import type { EngineResult } from './worker-protocol';

export interface PoolWorkerLike {
  postMessage(message: PoolRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<PoolResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export type ParallelOutcome =
  | { status: 'done'; result: EngineResult; scoreMs: number; allocateMs: number; workers: number }
  | { status: 'cancelled'; workers: number };

export interface ParallelRun {
  /** Read it with Atomics.load in each frame for the progress ring. */
  control: Int32Array;
  done: Promise<ParallelOutcome>;
}

interface Waiter {
  resolve: (response: PoolResponse) => void;
  reject: (error: Error) => void;
}

/**
 * N workers score parts of the snapshot in parallel into a shared
 * Float64Array; then worker 0 runs the sequential part (heap, lazy re-scoring,
 * FEFO) with those scores. The page waits with Atomics.waitAsync (or once
 * per frame), never with Atomics.wait. cancel() sets the shared flag that
 * every worker checks before each order.
 */
export class ParallelEngine {
  private workers: PoolWorkerLike[] = [];
  private nextRunId = 1;
  private readonly waiting = new Map<number, Waiter>();
  /** Fails the run in progress (a worker crashed or answered something unexpected). */
  private failCurrentRun: ((error: Error) => void) | null = null;

  constructor(
    private readonly createWorker: () => PoolWorkerLike,
    readonly size: number,
    private readonly now: () => number = () => performance.now(),
  ) {}

  run({
    snapshot,
    strategy,
    weights,
    top = 10,
  }: {
    snapshot: DistributionSnapshot;
    strategy: RuleStrategyName;
    weights?: Weights;
    top?: number;
  }): ParallelRun {
    const runId = this.nextRunId++;
    const { scores, control } = createControl(snapshot.orders.length);
    const ranges = partition(snapshot.orders.length, this.size);
    const workers = this.ensureWorkers(ranges.length);

    // A worker that crashes or answers the wrong protocol must end the run, never hang it.
    const failed = new Promise<never>((_, reject) => {
      this.failCurrentRun = (error) => {
        Atomics.store(control, CONTROL.CANCEL, 1);
        reject(error);
      };
    });
    failed.catch(() => undefined);

    const done = (async (): Promise<ParallelOutcome> => {
      const started = this.now();
      ranges.forEach(([start, end], index) => {
        workers[index]?.postMessage({
          type: 'score',
          runId,
          snapshot,
          strategy,
          ...(weights ? { weights } : {}),
          start,
          end,
          scores,
          control,
        });
      });
      await Promise.race([waitForWorkers(control, ranges.length), failed]);
      if (Atomics.load(control, CONTROL.CANCEL) === 1) {
        return { status: 'cancelled', workers: ranges.length };
      }
      const scored = this.now();

      const answer = this.expect(runId);
      workers[0]?.postMessage({ type: 'allocate', runId, scores, control, top });
      const response = await Promise.race([answer, failed]);
      if (response.type === 'cancelled') return { status: 'cancelled', workers: ranges.length };
      if (response.type !== 'allocated') throw new Error('Unexpected pool response');
      return {
        status: 'done',
        result: response.result,
        scoreMs: Math.round((scored - started) * 10) / 10,
        allocateMs: response.durationMs,
        workers: ranges.length,
      };
    })().finally(() => {
      this.failCurrentRun = null;
    });

    return { control, done };
  }

  /** Start the workers now, so a measured run does not include their start-up. */
  warm(): void {
    this.ensureWorkers(this.size);
  }

  /** Mid-run: every worker sees the flag before its next order. */
  cancel(control: Int32Array): void {
    Atomics.store(control, CONTROL.CANCEL, 1);
  }

  terminate(): void {
    for (const worker of this.workers) worker.terminate();
    this.workers = [];
    for (const [id, waiter] of this.waiting) {
      this.waiting.delete(id);
      waiter.reject(new Error('Pool terminated'));
    }
  }

  private expect(runId: number): Promise<PoolResponse> {
    return new Promise((resolve, reject) => {
      this.waiting.set(runId, { resolve, reject });
    });
  }

  private ensureWorkers(count: number): PoolWorkerLike[] {
    while (this.workers.length < count) {
      const worker = this.createWorker();
      worker.onmessage = (event) => {
        const message = event.data;
        // Only "allocated" and "error" are awaited; scoring is tracked through Atomics.
        if (message.type === 'scored') return;
        const waiter = this.waiting.get(message.runId);
        if (!waiter) {
          // An error while scoring, or a message from another protocol: end the run.
          if (message.type === 'error') this.failCurrentRun?.(new Error(message.message));
          else if (typeof message.runId !== 'number') {
            this.failCurrentRun?.(new Error('Unexpected pool response'));
          }
          return;
        }
        this.waiting.delete(message.runId);
        if (message.type === 'error') waiter.reject(new Error(message.message));
        else waiter.resolve(message);
      };
      worker.onerror = (event) => {
        this.failCurrentRun?.(new Error(event.message || 'Pool worker error'));
        for (const [id, waiter] of this.waiting) {
          this.waiting.delete(id);
          waiter.reject(new Error(event.message || 'Pool worker error'));
        }
      };
      this.workers.push(worker);
    }
    return this.workers.slice(0, count);
  }
}
