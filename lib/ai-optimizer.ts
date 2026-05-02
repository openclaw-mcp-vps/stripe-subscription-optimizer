import OpenAI from "openai";
import { z } from "zod";

import type { OptimizationRecommendation, StripeMetricsPayload } from "@/lib/types";

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(8),
      summary: z.string().min(24),
      impact: z.enum(["high", "medium", "low"]),
      confidence: z.number().min(0).max(100),
      projectedMonthlyLift: z.number().nonnegative(),
      actionSteps: z.array(z.string().min(8)).min(2),
      reasoning: z.string().min(20)
    })
  )
});

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function heuristicRecommendations(metricsPayload: StripeMetricsPayload): OptimizationRecommendation[] {
  const mrr = metricsPayload.metrics.monthlyRecurringRevenue;
  const churn = metricsPayload.metrics.churnRate;
  const trialToPaid = metricsPayload.metrics.trialToPaidRate;
  const arpu = metricsPayload.metrics.averageRevenuePerUser;
  const growth = metricsPayload.metrics.monthOverMonthGrowthRate;
  const scheduledCancels = metricsPayload.metrics.scheduledCancellations;

  const recommendations: OptimizationRecommendation[] = [];

  recommendations.push({
    id: "annual-discount-test",
    title: "Launch an annual prepay option with a controlled discount",
    summary:
      "Offer a 12-month commitment at 12-18% discount for new and renewing customers to increase cash collection and reduce monthly churn exposure.",
    impact: churn >= 4 ? "high" : "medium",
    confidence: 82,
    projectedMonthlyLift: round(mrr * 0.08),
    actionSteps: [
      "Clone your top plan into an annual SKU and price it at 12-18% below equivalent monthly total.",
      "Expose annual billing on upgrade and cancellation screens first.",
      "Track net MRR uplift and support-ticket impact for 21 days before rolling out globally."
    ],
    reasoning:
      "High-churn SaaS cohorts usually respond well to annual prepay because commitment lowers involuntary and impulsive cancellations."
  });

  if (trialToPaid < 35) {
    recommendations.push({
      id: "trial-activation",
      title: "Shorten trial and gate premium features behind activation milestones",
      summary:
        "Long free trials often delay intent. Move to a 7-10 day trial with clear activation tasks and contextual nudges inside the product.",
      impact: "high",
      confidence: 79,
      projectedMonthlyLift: round(mrr * 0.06),
      actionSteps: [
        "Reduce trial length to 7-10 days for new signups while preserving a grandfathered window for current trials.",
        "Define 2 activation milestones and trigger in-app nudges plus lifecycle emails.",
        "Offer a one-click 3-day extension only after milestone completion to retain serious evaluators."
      ],
      reasoning:
        "When trial conversion is low, the issue is usually delayed time-to-value rather than top-of-funnel quality."
    });
  }

  if (scheduledCancels > 0) {
    recommendations.push({
      id: "cancel-save-flow",
      title: "Deploy a cancellation save flow with plan downgrade and pause",
      summary:
        "Capture cancellation intent with frictionless alternatives: downgrade, usage-based add-on removal, and one-cycle pause.",
      impact: "high",
      confidence: 76,
      projectedMonthlyLift: round(mrr * 0.05),
      actionSteps: [
        "Insert a cancellation intercept screen that offers downgrade and one-cycle pause as first actions.",
        "Attach reason codes and route each to a targeted save offer.",
        "Run a 50/50 experiment to compare saved MRR against direct cancellation baseline."
      ],
      reasoning:
        "At-risk subscriptions already signaled intent; lightweight retention options can preserve revenue without hurting trust."
    });
  }

  if (arpu < 100) {
    recommendations.push({
      id: "tier-repackaging",
      title: "Repackage pricing tiers around outcome-based feature limits",
      summary:
        "Current ARPU suggests under-monetized packaging. Separate plans by value outcomes and usage thresholds instead of broad feature bundles.",
      impact: "medium",
      confidence: 71,
      projectedMonthlyLift: round(mrr * 0.07),
      actionSteps: [
        "Create a clear three-tier ladder: Starter, Growth, and Scale with visible value jumps.",
        "Move one high-value automation into Growth and one team capability into Scale.",
        "Introduce overage pricing for usage above included limits to reduce upgrade friction."
      ],
      reasoning:
        "Outcome-based packaging increases willingness to pay by aligning price with realized business value."
    });
  }

  if (growth < 0) {
    recommendations.push({
      id: "price-floor-experiment",
      title: "Run a guarded +8% headline price experiment on new signups",
      summary:
        "Negative MoM movement indicates pricing power may be underused. Test modest price lift on inbound traffic while monitoring conversion elasticity.",
      impact: "medium",
      confidence: 68,
      projectedMonthlyLift: round(mrr * 0.04),
      actionSteps: [
        "Ship an A/B test with +8% monthly price on new signups only.",
        "Stop the experiment if checkout conversion drops by more than 15%.",
        "If net revenue per visitor improves, roll forward in 2% increments."
      ],
      reasoning:
        "Price increases often outperform acquisition optimizations when demand is relatively inelastic in a defined niche."
    });
  }

  return recommendations.slice(0, 5);
}

async function aiRecommendations(metricsPayload: StripeMetricsPayload): Promise<OptimizationRecommendation[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = [
    "You are a SaaS pricing strategist.",
    "Use the provided Stripe metrics to generate practical, experiment-ready recommendations.",
    "Return strict JSON with shape: { recommendations: Recommendation[] } where Recommendation fields are:",
    "id, title, summary, impact(high|medium|low), confidence(0-100), projectedMonthlyLift(number), actionSteps(string[]), reasoning.",
    "Focus on tier structure, billing cycle optimization, and trial design.",
    "Avoid generic advice."
  ].join(" ");

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: JSON.stringify(metricsPayload)
      }
    ]
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return null;
  }

  const parsedJson = JSON.parse(content);
  const parsed = recommendationSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.recommendations.slice(0, 5).map((item) => ({
    ...item,
    projectedMonthlyLift: round(item.projectedMonthlyLift)
  }));
}

export async function generateOptimizationRecommendations(
  metricsPayload: StripeMetricsPayload
): Promise<OptimizationRecommendation[]> {
  try {
    const aiResult = await aiRecommendations(metricsPayload);
    if (aiResult && aiResult.length > 0) {
      return aiResult;
    }
  } catch {
    // Fall back to deterministic heuristics if AI is unavailable.
  }

  return heuristicRecommendations(metricsPayload);
}
