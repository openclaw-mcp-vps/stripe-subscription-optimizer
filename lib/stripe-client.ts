import Stripe from "stripe";

import type { MonthlyTrendPoint, PlanBreakdown, StripeMetricsPayload } from "@/lib/types";

const MAX_SUBSCRIPTIONS = 1200;
const MAX_INVOICES = 2400;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthKeyFromUnix(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildLastMonthKeys(monthCount: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function labelFromMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function normalizeMonthlyAmount(unitAmount: number, interval: string, intervalCount: number, quantity: number): number {
  const amount = unitAmount / 100;
  const qty = quantity > 0 ? quantity : 1;
  const count = intervalCount > 0 ? intervalCount : 1;

  if (interval === "month") {
    return (amount * qty) / count;
  }

  if (interval === "year") {
    return (amount * qty) / (12 * count);
  }

  if (interval === "week") {
    return ((amount * qty) * 52) / (12 * count);
  }

  if (interval === "day") {
    return ((amount * qty) * 30) / count;
  }

  return amount * qty;
}

function resolvePlanName(price: Stripe.Price): string {
  if (price.nickname) {
    return price.nickname;
  }

  if (typeof price.product === "string") {
    return `Plan ${price.product.slice(0, 8)}`;
  }

  if (price.product && "name" in price.product && typeof price.product.name === "string") {
    return price.product.name;
  }

  return `Plan ${price.id.slice(0, 8)}`;
}

function toPlanIntervalLabel(interval: string | null, intervalCount: number | null): string {
  if (!interval) {
    return "custom";
  }

  const count = intervalCount ?? 1;
  if (count === 1) {
    return interval;
  }

  return `${count}-${interval}`;
}

function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    typescript: true
  });
}

async function listSubscriptions(stripe: Stripe): Promise<Stripe.Subscription[]> {
  const result: Stripe.Subscription[] = [];
  // Expand price and product once to avoid N+1 fetches while computing plan-level metrics.
  for await (const subscription of stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.items.data.price.product"]
  })) {
    result.push(subscription);
    if (result.length >= MAX_SUBSCRIPTIONS) {
      break;
    }
  }

  return result;
}

async function listPaidInvoices(stripe: Stripe, minCreated: number): Promise<Stripe.Invoice[]> {
  const result: Stripe.Invoice[] = [];
  for await (const invoice of stripe.invoices.list({
    status: "paid",
    created: { gte: minCreated },
    limit: 100
  })) {
    result.push(invoice);
    if (result.length >= MAX_INVOICES) {
      break;
    }
  }

  return result;
}

export async function fetchStripeMetrics(secretKey: string, lookbackMonths = 6): Promise<StripeMetricsPayload> {
  const stripe = createStripeClient(secretKey);
  const safeLookbackMonths = Math.min(Math.max(Math.floor(lookbackMonths), 3), 18);
  const lookbackDays = safeLookbackMonths * 30;
  const nowUnix = Math.floor(Date.now() / 1000);
  const lookbackUnix = nowUnix - lookbackDays * 24 * 60 * 60;

  const [subscriptions, invoices] = await Promise.all([
    listSubscriptions(stripe),
    listPaidInvoices(stripe, lookbackUnix)
  ]);

  const currency = (invoices[0]?.currency ?? subscriptions[0]?.currency ?? "usd").toUpperCase();

  let activeSubscriptions = 0;
  let trialSubscriptions = 0;
  let scheduledCancellations = 0;
  let monthlyRecurringRevenue = 0;
  let convertedTrials = 0;
  let completedTrials = 0;
  let canceledInWindow = 0;

  const planMap = new Map<
    string,
    {
      planId: string;
      planName: string;
      interval: string;
      subscribers: number;
      mrr: number;
      cancelCandidates: number;
    }
  >();

  for (const subscription of subscriptions) {
    const status = subscription.status;
    const isActiveLike = status === "active" || status === "trialing" || status === "past_due";

    if (isActiveLike) {
      activeSubscriptions += 1;
    }

    if (status === "trialing") {
      trialSubscriptions += 1;
    }

    if (subscription.cancel_at_period_end) {
      scheduledCancellations += 1;
    }

    if (subscription.canceled_at && subscription.canceled_at >= lookbackUnix) {
      canceledInWindow += 1;
    }

    if (subscription.trial_end && subscription.trial_end >= lookbackUnix && subscription.trial_end <= nowUnix) {
      completedTrials += 1;
      if (status === "active" || status === "past_due") {
        convertedTrials += 1;
      }
    }

    if (!isActiveLike) {
      continue;
    }

    for (const item of subscription.items.data) {
      if (!item.price || item.price.unit_amount === null || !item.price.recurring) {
        continue;
      }

      const recurring = item.price.recurring;
      const normalized = normalizeMonthlyAmount(
        item.price.unit_amount,
        recurring.interval,
        recurring.interval_count ?? 1,
        item.quantity ?? 1
      );

      monthlyRecurringRevenue += normalized;

      const planId = item.price.id;
      const existing = planMap.get(planId) ?? {
        planId,
        planName: resolvePlanName(item.price),
        interval: toPlanIntervalLabel(recurring.interval, recurring.interval_count ?? 1),
        subscribers: 0,
        mrr: 0,
        cancelCandidates: 0
      };

      existing.subscribers += 1;
      existing.mrr += normalized;

      if (subscription.cancel_at_period_end || status === "past_due") {
        existing.cancelCandidates += 1;
      }

      planMap.set(planId, existing);
    }
  }

  const keys = buildLastMonthKeys(safeLookbackMonths);
  const revenueByMonth = new Map<string, number>();
  const cancellationsByMonth = new Map<string, number>();
  const trialsByMonth = new Map<string, number>();
  const conversionsByMonth = new Map<string, number>();

  for (const key of keys) {
    revenueByMonth.set(key, 0);
    cancellationsByMonth.set(key, 0);
    trialsByMonth.set(key, 0);
    conversionsByMonth.set(key, 0);
  }

  for (const invoice of invoices) {
    if (!invoice.created) {
      continue;
    }

    const key = monthKeyFromUnix(invoice.created);
    if (!revenueByMonth.has(key)) {
      continue;
    }

    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + (invoice.amount_paid ?? 0) / 100);

    if (invoice.billing_reason === "subscription_create") {
      trialsByMonth.set(key, (trialsByMonth.get(key) ?? 0) + 1);
    }

    if (invoice.billing_reason === "subscription_cycle") {
      conversionsByMonth.set(key, (conversionsByMonth.get(key) ?? 0) + 1);
    }
  }

  for (const subscription of subscriptions) {
    if (subscription.canceled_at && subscription.canceled_at >= lookbackUnix) {
      const key = monthKeyFromUnix(subscription.canceled_at);
      if (cancellationsByMonth.has(key)) {
        cancellationsByMonth.set(key, (cancellationsByMonth.get(key) ?? 0) + 1);
      }
    }
  }

  const trend: MonthlyTrendPoint[] = keys.map((key) => {
    const revenue = round(revenueByMonth.get(key) ?? 0);
    const cancellations = cancellationsByMonth.get(key) ?? 0;
    const newTrials = trialsByMonth.get(key) ?? 0;
    const conversions = conversionsByMonth.get(key) ?? 0;
    const churnRate = activeSubscriptions > 0 ? round((cancellations / Math.max(activeSubscriptions, 1)) * 100) : 0;

    return {
      month: labelFromMonthKey(key),
      revenue,
      newTrials,
      conversions,
      cancellations,
      churnRate
    };
  });

  const firstRevenue = trend[0]?.revenue ?? 0;
  const lastRevenue = trend[trend.length - 1]?.revenue ?? 0;
  const monthOverMonthGrowthRate =
    firstRevenue > 0 ? round(((lastRevenue - firstRevenue) / firstRevenue) * 100) : lastRevenue > 0 ? 100 : 0;

  const trialToPaidRate = completedTrials > 0 ? round((convertedTrials / completedTrials) * 100) : 0;
  const churnRate = activeSubscriptions > 0 ? round((canceledInWindow / activeSubscriptions) * 100) : 0;
  const averageRevenuePerUser = activeSubscriptions > 0 ? round(monthlyRecurringRevenue / activeSubscriptions) : 0;

  const planBreakdown: PlanBreakdown[] = [...planMap.values()]
    .map((plan) => {
      const avgRevenuePerSubscriber = plan.subscribers > 0 ? round(plan.mrr / plan.subscribers) : 0;
      const cancellationRisk = plan.subscribers > 0 ? round((plan.cancelCandidates / plan.subscribers) * 100) : 0;

      return {
        planId: plan.planId,
        planName: plan.planName,
        interval: plan.interval,
        subscribers: plan.subscribers,
        mrr: round(plan.mrr),
        avgRevenuePerSubscriber,
        cancellationRisk
      };
    })
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 8);

  const riskSignals: string[] = [];
  if (churnRate > 5) {
    riskSignals.push(`Churn is elevated at ${churnRate.toFixed(1)}%. Pricing and packaging should be re-tested.`);
  }
  if (trialToPaidRate > 0 && trialToPaidRate < 35) {
    riskSignals.push(`Trial-to-paid conversion is ${trialToPaidRate.toFixed(1)}%, which is below healthy SaaS benchmarks.`);
  }
  if (scheduledCancellations > 0) {
    riskSignals.push(`${scheduledCancellations} subscriptions are set to cancel at period end and need an intervention sequence.`);
  }
  if (riskSignals.length === 0) {
    riskSignals.push("No critical risks detected in the latest billing window. Focus on controlled pricing experiments.");
  }

  const assumptions = [
    `MRR is normalized across mixed billing intervals to a monthly baseline in ${currency}.`,
    `Analysis window uses the last ${lookbackDays} days of Stripe subscriptions and paid invoices.`,
    `Trial conversion and churn are computed from observed subscription states and invoice reasons.`
  ];

  return {
    currency,
    metrics: {
      activeSubscriptions,
      trialSubscriptions,
      scheduledCancellations,
      monthlyRecurringRevenue: round(monthlyRecurringRevenue),
      annualRecurringRevenue: round(monthlyRecurringRevenue * 12),
      averageRevenuePerUser,
      churnRate,
      trialToPaidRate,
      monthOverMonthGrowthRate
    },
    trend,
    planBreakdown,
    assumptions,
    riskSignals
  };
}

export function getStripeSecretFromEnv(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}
