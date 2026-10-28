import type { RankedOrder, RuleStrategyName } from './engine';

export interface CompareCell {
  orderId: string;
  rank: number;
  /** Places gained versus BALANCED (positive = earlier); null in the BALANCED column. */
  shift: number | null;
  /** The order sits at another place in at least one other strategy. */
  changed: boolean;
}

export type Comparison = Record<RuleStrategyName, CompareCell[]>;

/**
 * Top `top` of each strategy, side by side, marking the orders that change
 * place between strategies (positions are taken from the full rankings).
 */
export function compareRankings(
  rankings: Record<RuleStrategyName, readonly RankedOrder[]>,
  top = 10,
): Comparison {
  const names = Object.keys(rankings) as RuleStrategyName[];
  const positions = Object.fromEntries(
    names.map((name) => [
      name,
      new Map(rankings[name].map((entry) => [entry.orderId, entry.rank])),
    ]),
  ) as Record<RuleStrategyName, Map<string, number>>;

  return Object.fromEntries(
    names.map((name) => [
      name,
      rankings[name].slice(0, top).map((entry) => {
        const balanced = positions.BALANCED.get(entry.orderId);
        return {
          orderId: entry.orderId,
          rank: entry.rank,
          shift: name === 'BALANCED' || balanced === undefined ? null : balanced - entry.rank,
          changed: names.some(
            (other) => other !== name && positions[other].get(entry.orderId) !== entry.rank,
          ),
        };
      }),
    ]),
  ) as Comparison;
}
