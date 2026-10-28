import {
  buildProposal,
  createStrategy,
  InvalidWeightsError,
  type DistributionSnapshot,
  type ProposalResult,
  type RankedOrder,
  type RuleStrategyName,
  type Weights,
} from './engine';

/**
 * Typed messages between the page and the distribution Web Worker.
 * run → progress (every `progressEvery` served orders) → result | error.
 * cancel drops a run that is still queued; a running computation is
 * synchronous, so a hard stop is done by terminating the worker (EngineClient).
 */
export interface RunRequest {
  type: 'run';
  requestId: number;
  snapshot: DistributionSnapshot;
  strategy: RuleStrategyName;
  weights?: Weights;
  progressEvery?: number;
  /**
   * 'summary' sends back the summary and the first `top` orders only: a
   * 20,000-order plan would otherwise cost a long structured clone on the
   * main thread when the result arrives.
   */
  detail?: 'full' | 'summary';
  top?: number;
}

export interface CancelRequest {
  type: 'cancel';
  requestId: number;
}

export type EngineRequest = RunRequest | CancelRequest;

/** What a run returns: the whole plan, or its summary and head of the ranking. */
export interface EngineResult {
  summary: ProposalResult['summary'];
  ranking: RankedOrder[];
  lines?: ProposalResult['lines'];
}

export type EngineResponse =
  | { type: 'progress'; requestId: number; served: number; total: number }
  | { type: 'result'; requestId: number; result: EngineResult; durationMs: number }
  | {
      type: 'error';
      requestId: number;
      code: 'INVALID_WEIGHTS' | 'ENGINE_ERROR';
      message: string;
    };

export const DEFAULT_PROGRESS_EVERY = 500;

/** Shapes the result as the request asked (full plan or summary + top). */
export function toEngineResult(
  result: ProposalResult,
  detail: RunRequest['detail'] = 'full',
  top = 10,
): EngineResult {
  return detail === 'full'
    ? { summary: result.summary, ranking: result.ranking, lines: result.lines }
    : { summary: result.summary, ranking: result.ranking.slice(0, top) };
}

/**
 * The worker's message handler, as a plain function: the worker file only
 * wires it to `self`, and tests call it directly.
 */
export function createEngineHandler(
  post: (response: EngineResponse) => void,
  { now = () => performance.now() }: { now?: () => number } = {},
): (request: EngineRequest) => void {
  const cancelled = new Set<number>();

  return (request) => {
    if (request.type === 'cancel') {
      cancelled.add(request.requestId);
      return;
    }
    const { requestId } = request;
    // Cancelled while queued: never runs.
    if (cancelled.delete(requestId)) return;
    try {
      const strategy = createStrategy(request.strategy, request.weights);
      const started = now();
      const result = buildProposal(request.snapshot, strategy, {
        now,
        progressEvery: request.progressEvery ?? DEFAULT_PROGRESS_EVERY,
        onProgress: (served, total) => {
          post({ type: 'progress', requestId, served, total });
        },
      });
      post({
        type: 'result',
        requestId,
        result: toEngineResult(result, request.detail, request.top),
        durationMs: Math.round((now() - started) * 100) / 100,
      });
    } catch (error) {
      post({
        type: 'error',
        requestId,
        code: error instanceof InvalidWeightsError ? 'INVALID_WEIGHTS' : 'ENGINE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
