import { NextRequest, NextResponse } from "next/server";

import { initializeLemonSqueezy, parseLemonWebhookEvent, verifyLemonWebhookSignature } from "@/lib/lemonsqueezy";

initializeLemonSqueezy();

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-signature");
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook signature configuration is missing." }, { status: 400 });
  }

  if (!verifyLemonWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const event = parseLemonWebhookEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  return NextResponse.json(
    {
      received: true,
      event: event.meta?.event_name ?? "unknown"
    },
    { status: 200 }
  );
}
