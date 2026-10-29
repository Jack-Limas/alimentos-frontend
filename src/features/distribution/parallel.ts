import { LotBook, type DistributionSnapshot, type PrioritizationStrategy } from './engine';

/**
 * Shared control block of a pool run (Int32Array over a SharedArrayBuffer):
 * - PROGRESS: orders scored so far (Atomics.add by each worker, read every frame).
 * - CANCEL: 1 asks every worker to stop (Atomics.store; workers Atomics.load it per order).
 * - DONE: workers that finished their part (Atomics.add + Atomics.notify).
 * - TOTAL: orders to score, for the progress ring.
 * - ALLOCATED: orders served by the sequential allocation that follows.
 */
export const CONTROL = { PROGRESS: 0, CANCEL: 1, DONE: 2, TOTAL: 3, ALLOCATED: 4 } as const;
export const CONTROL_LENGTH = 5;

/** Workers of the pool: one core is left for the page, at most 4. */
export function poolSize(hardwareConcurrency: number | undefined): number {
  const cores = Number.isFinite(hardwareConcurrency) ? (hardwareConcurrency as number) : 2;
  return Math.max(1, Math.min(cores - 1, 4));
}

/** The pool needs SharedArrayBuffer, which needs a cross-origin isolated page. */
export function poolAvailable(scope: {
  crossOriginIsolated?: boolean;
  SharedArrayBuffer?: unknown;
}): boolean {
  return scope.crossOriginIsolated === true && typeof scope.SharedArrayBuffer === 'function';
}

/** Contiguous [start, end) ranges, sizes differing by at most one. */
export function partition(total: number, parts: number): [number, number][] {
  const count = Math.max(1, Math.min(parts, Math.max(total, 1)));
  const base = Math.floor(total / count);
  const extra = total % count;
  const ranges: [number, number][] = [];
  let start = 0;
  for (let i = 0; i < count; i += 1) {
    const end = start + base + (i < extra ? 1 : 0);
    ranges.push([start, end]);
    start = end;
  }
  return ranges;
}

export function createControl(total: number): { scores: Float64Array; control: Int32Array } {
  const scores = new Float64Array(new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * total));
  const control = new Int32Array(
    new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * CONTROL_LENGTH),
  );
  Atomics.store(control, CONTROL.TOTAL, total);
  return { scores, control };
}

/**
 * The parallel part: the initial score of every order in [start, end), with
 * the lots as they are before any allocation (scores do not depend on each
 * other here, so ranges can run at the same time). Writes into the shared
 * scores, counts progress and checks the cancel flag before each order. The
 * worker always signals DONE, cancelled or not, so the page never hangs.
 */
export function scoreRange({
  snapshot,
  strategy,
  start,
  end,
  scores,
  control,
}: {
  snapshot: DistributionSnapshot;
  strategy: PrioritizationStrategy;
  start: number;
  end: number;
  scores: Float64Array;
  control: Int32Array;
}): 'done' | 'cancelled' {
  let outcome: 'done' | 'cancelled' = 'done';
  const lots = new LotBook(snapshot.lots, snapshot.businessDate);
  for (let i = start; i < end; i += 1) {
    if (Atomics.load(control, CONTROL.CANCEL) === 1) {
      outcome = 'cancelled';
      break;
    }
    const order = snapshot.orders[i];
    if (order) scores[i] = strategy.score(order, lots, snapshot.businessDate).score;
    Atomics.add(control, CONTROL.PROGRESS, 1);
  }
  Atomics.add(control, CONTROL.DONE, 1);
  Atomics.notify(control, CONTROL.DONE);
  return outcome;
}

/** Progress from 0 to 1, read with Atomics.load (no message per step). */
export function progressOf(control: Int32Array): number {
  const total = Atomics.load(control, CONTROL.TOTAL);
  if (total === 0) return 1;
  // Half the ring for the parallel scoring, half for the sequential allocation.
  const scored = Atomics.load(control, CONTROL.PROGRESS);
  const allocated = Atomics.load(control, CONTROL.ALLOCATED);
  return Math.min(1, (scored + allocated) / (2 * total));
}

/** Thrown inside the allocation when the shared cancel flag is set. */
export class PoolCancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'PoolCancelledError';
  }
}

/** Checked by the allocation every few orders: reports progress and honours Cancel. */
export function allocationTick(control: Int32Array, served: number): void {
  Atomics.store(control, CONTROL.ALLOCATED, served);
  if (Atomics.load(control, CONTROL.CANCEL) === 1) throw new PoolCancelledError();
}

type WaitAsync = (
  array: Int32Array,
  index: number,
  value: number,
) => { async: boolean; value: Promise<string> | string };

/**
 * Resolves when `expected` workers have signalled DONE. The page's main thread
 * must never block, so Atomics.wait is not used: Atomics.waitAsync when the
 * browser has it, otherwise a check on every animation frame.
 */
export async function waitForWorkers(
  control: Int32Array,
  expected: number,
  {
    // null (not undefined, which would take this default) means "not available".
    waitAsync = (Atomics as unknown as { waitAsync?: WaitAsync }).waitAsync ?? null,
    nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  }: { waitAsync?: WaitAsync | null; nextFrame?: () => Promise<void> } = {},
): Promise<void> {
  for (;;) {
    const done = Atomics.load(control, CONTROL.DONE);
    if (done >= expected) return;
    if (waitAsync) {
      const result = waitAsync(control, CONTROL.DONE, done);
      if (result.async) await result.value;
    } else {
      await nextFrame();
    }
  }
}
