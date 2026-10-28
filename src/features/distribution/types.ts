import type { CustomerType } from '@/features/customers/types';
import type { OrderPriority, OrderStatus } from '@/features/orders/types';
import type {
  DistributionReason,
  DistributionSnapshot,
  FulfillmentStatus,
  ProposalSummary,
  ScoreComponents,
  StrategyName,
  Weights,
} from './engine';

export type Unit = 'KG' | 'L' | 'UNIT' | 'BOX';
export type ProposalStatus = 'DRAFT' | 'CONFIRMED' | 'DISCARDED';
export const PROPOSAL_STRATEGIES = [
  'BALANCED',
  'URGENCY_FIRST',
  'WASTE_FIRST',
  'AI_ASSISTED',
] as const satisfies readonly StrategyName[];

/** GET /distribution/snapshot: the engine input plus display fields. */
export interface SnapshotDto extends DistributionSnapshot {
  orders: (DistributionSnapshot['orders'][number] & {
    code: string;
    customerName: string;
    customerType: CustomerType;
  })[];
  products: (DistributionSnapshot['products'][number] & { name: string })[];
  strategies: Record<'BALANCED' | 'URGENCY_FIRST' | 'WASTE_FIRST', Weights>;
  rules: {
    minDaysToDispatch: number;
    deadlineHorizonDays: number;
    expiryHorizonDays: number;
    maxRescores: number;
  };
}

/** Stored AI explanation of a plan (aiInsight). */
export interface AiInsight {
  summary: string;
  highlights: string[];
  tieBreakOrder?: string[];
  locale: 'es' | 'en';
  model: string;
  promptVersion?: string;
  latencyMs: number;
  generatedAt: string;
}

export interface ProposalDto {
  id: string;
  strategy: StrategyName;
  status: ProposalStatus;
  weights: Weights;
  businessDate: string;
  processingMs: number;
  itemsProcessed: number;
  /** AI_ASSISTED fell back to BALANCED because the AI did not answer. */
  degraded: boolean;
  summary: ProposalSummary & { tieGroups?: number; aiError?: string };
  aiInsight: AiInsight | null;
  createdById: string;
  confirmedById: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface ProposalLineDto {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  unit: Unit;
  lotId: string | null;
  lotCode: string | null;
  lotExpiryDate: string | null;
  requestedQty: number;
  availableQty: number;
  recommendedQty: number;
  reasons: DistributionReason[];
}

export interface ProposalOrderDto {
  orderId: string;
  code: string;
  customerName: string;
  customerType: CustomerType;
  priority: OrderPriority;
  dueDate: string;
  orderStatus: OrderStatus;
  rank: number;
  score: number;
  components: ScoreComponents | null;
  fulfillment: FulfillmentStatus | null;
  rescores: number;
  lines: ProposalLineDto[];
}

export interface ProposalDetailDto extends ProposalDto {
  orders: ProposalOrderDto[];
}

/** POST /distribution/proposals: the client sends a choice, never figures. */
export interface ProposalInput {
  strategy: StrategyName;
  weights?: Weights;
  locale?: 'es' | 'en';
}

/** POST /ai/proposals/:id/explanation */
export interface ExplanationResponse {
  data: AiInsight;
  meta: { model: string | null; latencyMs: number; cached: boolean };
}
