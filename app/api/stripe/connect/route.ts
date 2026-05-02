import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import {
  ACCESS_COOKIE_NAME,
  STRIPE_KEY_COOKIE_NAME,
  createAccessCookieToken,
  createStripeKeyCookieToken,
  verifyStripeKeyCookieToken
} from "@/lib/auth";
import { getStripeSecretFromEnv } from "@/lib/stripe-client";

const connectSchema = z.object({
  stripeSecretKey: z.string().min(16)
});

function secureCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds
  };
}

function getStripeSecretFromRequest(request: NextRequest): string | null {
  const envKey = getStripeSecretFromEnv();
  if (envKey) {
    return envKey;
  }

  const cookieValue = request.cookies.get(STRIPE_KEY_COOKIE_NAME)?.value;
  return verifyStripeKeyCookieToken(cookieValue);
}

async function verifyCheckoutSession(sessionId: string, secretKey: string): Promise<boolean> {
  const stripe = new Stripe(secretKey, { typescript: true });
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const paid = session.payment_status === "paid";
  const complete = session.status === "complete";
  const hasSubscription = typeof session.subscription === "string" || Boolean(session.subscription);

  return paid || (complete && hasSubscription);
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/dashboard?unlock=missing-session", request.url));
  }

  const stripeSecret = getStripeSecretFromRequest(request);

  try {
    let canUnlock = false;

    if (stripeSecret) {
      canUnlock = await verifyCheckoutSession(sessionId, stripeSecret);
    } else {
      // Fallback for setups where only hosted Payment Link redirect is configured.
      canUnlock = sessionId.startsWith("cs_");
    }

    if (!canUnlock) {
      return NextResponse.redirect(new URL("/dashboard?unlock=payment-not-verified", request.url));
    }

    const response = NextResponse.redirect(new URL("/dashboard?unlock=success", request.url));
    response.cookies.set(ACCESS_COOKIE_NAME, createAccessCookieToken(sessionId), secureCookieOptions(60 * 60 * 24 * 30));
    return response;
  } catch {
    return NextResponse.redirect(new URL("/dashboard?unlock=verification-error", request.url));
  }
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = connectSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Stripe secret key payload." }, { status: 400 });
  }

  const { stripeSecretKey } = parsed.data;
  if (!/^sk_(test|live)_/.test(stripeSecretKey)) {
    return NextResponse.json({ error: "Stripe key must begin with sk_test_ or sk_live_." }, { status: 400 });
  }

  try {
    const stripe = new Stripe(stripeSecretKey, { typescript: true });
    await stripe.accounts.retrieve();

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      STRIPE_KEY_COOKIE_NAME,
      createStripeKeyCookieToken(stripeSecretKey),
      secureCookieOptions(60 * 60 * 24 * 14)
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to validate Stripe key. Use a key with subscription and invoice read access." },
      { status: 401 }
    );
  }
}
