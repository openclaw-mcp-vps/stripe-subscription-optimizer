import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ACCESS_COOKIE_NAME, STRIPE_KEY_COOKIE_NAME, verifyAccessCookieToken, verifyStripeKeyCookieToken } from "@/lib/auth";
import { generateOptimizationRecommendations } from "@/lib/ai-optimizer";
import { fetchStripeMetrics, getStripeSecretFromEnv } from "@/lib/stripe-client";
import type { AnalyzeRequestBody, SubscriptionAnalysis } from "@/lib/types";

const requestSchema = z.object({
  lookbackMonths: z.number().int().min(3).max(18).optional()
});

function resolveStripeSecret(request: NextRequest): string | null {
  const envKey = getStripeSecretFromEnv();
  if (envKey) {
    return envKey;
  }

  const cookieValue = request.cookies.get(STRIPE_KEY_COOKIE_NAME)?.value;
  return verifyStripeKeyCookieToken(cookieValue);
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const access = verifyAccessCookieToken(accessToken);

  if (!access) {
    return NextResponse.json({ error: "Access required. Complete checkout to unlock analysis." }, { status: 401 });
  }

  const parsedBody = requestSchema.safeParse((await request.json().catch(() => ({}))) as AnalyzeRequestBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const stripeSecret = resolveStripeSecret(request);
  if (!stripeSecret) {
    return NextResponse.json(
      {
        error:
          "No Stripe API key available. Set STRIPE_SECRET_KEY in environment variables or connect a key in the dashboard."
      },
      { status: 400 }
    );
  }

  try {
    const lookbackMonths = parsedBody.data.lookbackMonths ?? 6;
    const metricsPayload = await fetchStripeMetrics(stripeSecret, lookbackMonths);
    const recommendations = await generateOptimizationRecommendations(metricsPayload);

    const response: SubscriptionAnalysis = {
      generatedAt: new Date().toISOString(),
      windowDays: lookbackMonths * 30,
      currency: metricsPayload.currency,
      metrics: metricsPayload.metrics,
      trend: metricsPayload.trend,
      planBreakdown: metricsPayload.planBreakdown,
      assumptions: metricsPayload.assumptions,
      riskSignals: metricsPayload.riskSignals,
      recommendations
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
