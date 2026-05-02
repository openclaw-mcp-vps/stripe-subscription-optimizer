export type RecommendationImpact = "high" | "medium" | "low";

export interface MonthlyTrendPoint {
  month: string;
  revenue: number;
  newTrials: number;
  conversions: number;
  cancellations: number;
  churnRate: number;
}

export interface PlanBreakdown {
  planId: string;
  planName: string;
  interval: string;
  subscribers: number;
  mrr: number;
  avgRevenuePerSubscriber: number;
  cancellationRisk: number;
}

export interface OptimizationRecommendation {
  id: string;
  title: string;
  summary: string;
  impact: RecommendationImpact;
  confidence: number;
  projectedMonthlyLift: number;
  actionSteps: string[];
  reasoning: string;
}

export interface CoreMetrics {
  activeSubscriptions: number;
  trialSubscriptions: number;
  scheduledCancellations: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  trialToPaidRate: number;
  monthOverMonthGrowthRate: number;
}

export interface SubscriptionAnalysis {
  generatedAt: string;
  windowDays: number;
  currency: string;
  metrics: CoreMetrics;
  trend: MonthlyTrendPoint[];
  planBreakdown: PlanBreakdown[];
  recommendations: OptimizationRecommendation[];
  assumptions: string[];
  riskSignals: string[];
}

export interface StripeMetricsPayload {
  currency: string;
  metrics: CoreMetrics;
  trend: MonthlyTrendPoint[];
  planBreakdown: PlanBreakdown[];
  assumptions: string[];
  riskSignals: string[];
}

export interface AnalyzeRequestBody {
  lookbackMonths?: number;
}

export interface SimulatorScenario {
  label: string;
  priceChangePct: number;
  conversionDeltaPct: number;
  churnDeltaPct: number;
}
