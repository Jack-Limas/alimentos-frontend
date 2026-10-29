import {
  buildProposal,
  createStrategy,
  type DistributionSnapshot,
  type RuleStrategyName,
  type Weights,
} from './engine';
import { scoreRange } from './parallel';
import { toEngineResult, type EngineResult } from './worker-protocol';

/** Page → pool worker. Typed arrays over SharedArrayBuffers are shared, not copied. */
export type PoolRequest =
  | {
      type: 'score';
      runId: number;
      snapshot: DistributionSnapshot;
      strategy: RuleStrategyName;
      weights?: Weights;
      start: number;
      end: number;
      scores: Float64Array;
      control: Int32Array;
    }
  /** Worker 0 only, after every range is scored: the sequential heap + FEFO part. */
  | { type: 'allocate'; runId: number; scores: Float64Array; top: number };

export type PoolResponse =
  | { type: 'scored'; runId: number; outcome: 'done' | 'cancelled' }
  | { type: 'allocated'; runId: number; result: EngineResult; durationMs: number }
  | { type: 'error'; runId: number; message: string };

interface CurrentRun {
  runId: number;
  snapshot: DistributionSnapshot;
  strategy: RuleStrategyName;
  weights?: Weights;
}

/**
 * The pool worker's handler, as a plain function (tests call it directly).
 * It keeps the snapshot of the current run so worker 0 can allocate.
 */
export function createPoolHandler(
  post: (response: PoolResponse) => void,
  now: () => number = () => performance.now(),
): (request: PoolRequest) => void {
  let run: CurrentRun | null = null;

  return (request) => {
    try {
      if (request.type === 'score') {
        run = {
          runId: request.runId,
          snapshot: request.snapshot,
          strategy: request.strategy,
          ...(request.weights ? { weights: request.weights } : {}),
        };
        const outcome = scoreRange({
          snapshot: request.snapshot,
          strategy: createStrategy(request.strategy, request.weights),
          start: request.start,
          end: request.end,
          scores: request.scores,
          control: request.control,
        });
        post({ type: 'scored', runId: request.runId, outcome });
        return;
      }
      if (run?.runId !== request.runId) throw new Error('No scored snapshot for this run');
      const started = now();
      const result = buildProposal(run.snapshot, createStrategy(run.strategy, run.weights), {
        now,
        initialScores: request.scores,
      });
      post({
        type: 'allocated',
        runId: request.runId,
        result: toEngineResult(result, 'summary', request.top),
        durationMs: Math.round((now() - started) * 100) / 100,
      });
    } catch (error) {
      post({
        type: 'error',
        runId: request.runId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
