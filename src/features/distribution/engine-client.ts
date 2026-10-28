import type { EngineRequest, EngineResponse, EngineResult, RunRequest } from './worker-protocol';

/** The part of `Worker` the client uses, so tests can pass a fake one. */
export interface WorkerLike {
  postMessage(message: EngineRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<EngineResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export type RunJob = Omit<RunRequest, 'type' | 'requestId'>;

export type RunOutcome =
  | { status: 'done'; result: EngineResult; durationMs: number }
  /** A newer run on the same channel replaced this one: its result is dropped. */
  | { status: 'superseded' }
  /** cancel() or terminate() stopped it. */
  | { status: 'cancelled' };

export class EngineRunError extends Error {
  constructor(
    public readonly code: 'INVALID_WEIGHTS' | 'ENGINE_ERROR' | 'WORKER_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'EngineRunError';
  }
}

interface Pending {
  channel: string;
  resolve: (outcome: RunOutcome) => void;
  reject: (error: EngineRunError) => void;
  onProgress: ((served: number, total: number) => void) | undefined;
}

/**
 * Talks to the distribution worker with request ids. On each channel only the
 * latest run counts: an older one resolves as "superseded" at once and its
 * result, if it still arrives, is ignored. The worker is created lazily and
 * re-created after cancel()/terminate(), so the client survives React's
 * double effects in development.
 */
export class EngineClient {
  private worker: WorkerLike | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly latest = new Map<string, number>();

  constructor(private readonly createWorker: () => WorkerLike) {}

  run(
    job: RunJob,
    {
      channel = 'default',
      onProgress,
    }: { channel?: string; onProgress?: (served: number, total: number) => void } = {},
  ): Promise<RunOutcome> {
    const requestId = this.nextId++;
    const previous = this.latest.get(channel);
    if (previous !== undefined) this.supersede(previous);
    this.latest.set(channel, requestId);

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { channel, resolve, reject, onProgress });
      this.ensureWorker().postMessage({ type: 'run', requestId, ...job });
    });
  }

  /** Hard stop: a synchronous run cannot be interrupted, so the worker is terminated. */
  cancel(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const [id, pending] of this.pending) {
      this.pending.delete(id);
      pending.resolve({ status: 'cancelled' });
    }
    this.latest.clear();
  }

  /** On unmount. Same as cancel(); a later run starts a new worker. */
  terminate(): void {
    this.cancel();
  }

  private supersede(requestId: number): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    this.pending.delete(requestId);
    // Still queued in the worker? Then it will not run at all.
    this.worker?.postMessage({ type: 'cancel', requestId });
    pending.resolve({ status: 'superseded' });
  }

  private ensureWorker(): WorkerLike {
    if (this.worker) return this.worker;
    const worker = this.createWorker();
    worker.onmessage = (event) => {
      this.receive(event.data);
    };
    worker.onerror = (event) => {
      // The worker script failed (load error, crash): every run on it fails.
      for (const [id, pending] of this.pending) {
        this.pending.delete(id);
        pending.reject(new EngineRunError('WORKER_ERROR', event.message || 'Worker error'));
      }
      this.worker?.terminate();
      this.worker = null;
    };
    this.worker = worker;
    return worker;
  }

  private receive(message: EngineResponse): void {
    // Unknown id: superseded or cancelled; the stale message is dropped.
    const pending = this.pending.get(message.requestId);
    if (!pending) return;
    switch (message.type) {
      case 'progress':
        pending.onProgress?.(message.served, message.total);
        return;
      case 'result':
        this.settle(message.requestId, pending);
        pending.resolve({
          status: 'done',
          result: message.result,
          durationMs: message.durationMs,
        });
        return;
      case 'error':
        this.settle(message.requestId, pending);
        pending.reject(new EngineRunError(message.code, message.message));
        return;
    }
  }

  private settle(requestId: number, pending: Pending): void {
    this.pending.delete(requestId);
    if (this.latest.get(pending.channel) === requestId) this.latest.delete(pending.channel);
  }
}
