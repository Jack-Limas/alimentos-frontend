import { RULE_STRATEGIES, STRATEGY_WEIGHTS, type RuleStrategyName, type Weights } from './engine';

export const WEIGHT_KEYS = ['priority', 'deadlineUrgency', 'expiryPressure'] as const;
export type WeightKey = (typeof WEIGHT_KEYS)[number];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Whole-number weights that add up to exactly 100 (largest remainder), from
 * any non-negative numbers. All zeros (or invalid input) gives BALANCED.
 */
export function normalizeWeights(weights: Weights): Weights {
  const values = WEIGHT_KEYS.map((key) => {
    const value = weights[key];
    return Number.isFinite(value) && value > 0 ? value : 0;
  });
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return { ...STRATEGY_WEIGHTS.BALANCED };

  const exact = values.map((value) => (value * 100) / total);
  const floors = exact.map(Math.floor);
  let missing = 100 - floors.reduce((sum, value) => sum + value, 0);
  // Give the missing points to the largest remainders (ties: first key), so the sum is 100.
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (missing <= 0) break;
    floors[index] = (floors[index] ?? 0) + 1;
    missing -= 1;
  }
  const [priority = 0, deadlineUrgency = 0, expiryPressure = 0] = floors;
  return { priority, deadlineUrgency, expiryPressure };
}

/**
 * Moves one slider and rebalances the other two so the total stays 100: the
 * remainder is shared in proportion to their current values (evenly when both
 * are 0). Whole numbers only, so the server accepts them as they are.
 */
export function setWeight(weights: Weights, key: WeightKey, value: number): Weights {
  const next = clamp(Math.round(Number.isFinite(value) ? value : 0), 0, 100);
  const [first, second] = WEIGHT_KEYS.filter((candidate) => candidate !== key) as [
    WeightKey,
    WeightKey,
  ];
  const rest = 100 - next;
  const shared = weights[first] + weights[second];
  const firstValue = clamp(
    Math.round(shared > 0 ? (rest * weights[first]) / shared : rest / 2),
    0,
    rest,
  );
  return {
    ...weights,
    [key]: next,
    [first]: firstValue,
    [second]: rest - firstValue,
  };
}

/** The rule strategy whose preset equals these weights, or null for custom weights. */
export function presetOf(weights: Weights): RuleStrategyName | null {
  return (
    RULE_STRATEGIES.find((name) =>
      WEIGHT_KEYS.every((key) => STRATEGY_WEIGHTS[name][key] === weights[key]),
    ) ?? null
  );
}
