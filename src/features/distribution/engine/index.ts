// Client copy of the pure distribution engine (alimentos-backend, contract 4.7).
// It runs in the Web Worker for the simulator and the lab; the server always recomputes.
export {
  buildProposal,
  MAX_RESCORES,
  type BuildOptions,
  type FulfillmentStatus,
  type ProposalLineDraft,
  type ProposalResult,
  type ProposalSummary,
  type RankedOrder,
} from './build-proposal';
export { addDays, daysBetween, type CalendarDate } from './calendar';
export { allocateFefo, compareFefo, type FefoLot } from './fefo';
export { isDispatchable, LotBook, MIN_DAYS_TO_DISPATCH } from './lot-book';
export { MinHeap } from './min-heap';
export {
  DEADLINE_HORIZON_DAYS,
  EXPIRY_HORIZON_DAYS,
  PRIORITY_VALUE,
  scoreOrder,
  type DistributionReason,
  type DistributionReasonCode,
  type OrderScore,
  type ScoreComponents,
} from './score';
export type {
  DistributionSnapshot,
  OrderPriority,
  SnapshotItem,
  SnapshotLot,
  SnapshotOrder,
  SnapshotProduct,
} from './snapshot';
export {
  BalancedStrategy,
  createStrategy,
  InvalidWeightsError,
  UrgencyFirstStrategy,
  WasteFirstStrategy,
  type PrioritizationStrategy,
} from './strategies';
export {
  checkWeights,
  RULE_STRATEGIES,
  STRATEGY_WEIGHTS,
  type RuleStrategyName,
  type StrategyName,
  type Weights,
  type WeightsProblem,
} from './weights';
