import type { PoolWorkerLike } from './parallel-engine';

/** Keep the literal `new Worker(new URL(...), { type: 'module' })`: Turbopack bundles it. */
export function createPoolWorker(): PoolWorkerLike {
  return new Worker(new URL('../../workers/score-pool.worker.ts', import.meta.url), {
    type: 'module',
    name: 'distribution-pool',
  }) as unknown as PoolWorkerLike;
}
