import type { WorkerLike } from './engine-client';

/**
 * The literal `new Worker(new URL(...), { type: 'module' })` is what Turbopack
 * (and webpack) recognize to bundle the worker as a separate entry point: keep
 * it in this exact shape.
 */
export function createDistributionWorker(): WorkerLike {
  return new Worker(new URL('../../workers/distribution.worker.ts', import.meta.url), {
    type: 'module',
    name: 'distribution-engine',
  }) as unknown as WorkerLike;
}
