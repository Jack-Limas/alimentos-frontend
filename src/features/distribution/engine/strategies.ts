// COPY of alimentos-backend src/modules/distribution/domain/strategies.ts, rule strategies only.
import type { CalendarDate } from './inventory';
import type { LotBook } from './lot-book';
import { scoreOrder, type OrderScore } from './score';
import type { SnapshotOrder } from './snapshot';
import {
  checkWeights,
  STRATEGY_WEIGHTS,
  type RuleStrategyName,
  type StrategyName,
  type Weights,
} from './weights';

/**
 * Strategy pattern: how orders are ranked. The engine only knows this
 * interface; each strategy brings its own weights (the formula is shared).
 */
export interface PrioritizationStrategy {
  readonly name: StrategyName;
  readonly weights: Readonly<Weights>;
  score(order: SnapshotOrder, lots: LotBook, today: CalendarDate): OrderScore;
}

abstract class WeightedStrategy implements PrioritizationStrategy {
  abstract readonly name: StrategyName;
  readonly weights: Readonly<Weights>;

  constructor(weights?: Weights) {
    this.weights = Object.freeze({ ...(weights ?? this.defaultWeights()) });
  }

  protected abstract defaultWeights(): Weights;

  score(order: SnapshotOrder, lots: LotBook, today: CalendarDate): OrderScore {
    return scoreOrder(order, lots, today, this.weights);
  }
}

/** Priority, deadline and expiry together (40 / 35 / 25). */
export class BalancedStrategy extends WeightedStrategy {
  readonly name = 'BALANCED' as const;
  protected defaultWeights() {
    return { ...STRATEGY_WEIGHTS.BALANCED };
  }
}

/** Deliver on time first (20 / 70 / 10). */
export class UrgencyFirstStrategy extends WeightedStrategy {
  readonly name = 'URGENCY_FIRST' as const;
  protected defaultWeights() {
    return { ...STRATEGY_WEIGHTS.URGENCY_FIRST };
  }
}

/** Move the stock that expires first (20 / 20 / 60). */
export class WasteFirstStrategy extends WeightedStrategy {
  readonly name = 'WASTE_FIRST' as const;
  protected defaultWeights() {
    return { ...STRATEGY_WEIGHTS.WASTE_FIRST };
  }
}

export class InvalidWeightsError extends Error {
  constructor(public readonly problem: string) {
    super(`Invalid weights: ${problem}`);
    this.name = 'InvalidWeightsError';
  }
}

/** Builds a strategy, optionally with custom weights that must add up to 100. */
export function createStrategy(name: RuleStrategyName, weights?: Weights): PrioritizationStrategy {
  if (weights) {
    const problem = checkWeights(weights);
    if (problem) throw new InvalidWeightsError(problem);
  }
  switch (name) {
    case 'BALANCED':
      return new BalancedStrategy(weights);
    case 'URGENCY_FIRST':
      return new UrgencyFirstStrategy(weights);
    case 'WASTE_FIRST':
      return new WasteFirstStrategy(weights);
  }
}
