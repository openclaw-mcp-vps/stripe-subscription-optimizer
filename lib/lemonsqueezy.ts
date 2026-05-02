import crypto from "node:crypto";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

export interface LemonWebhookEvent {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, string>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
}

export function initializeLemonSqueezy(): void {
  if (process.env.LEMONSQUEEZY_API_KEY) {
    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY });
  }
}

export function verifyLemonWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export function parseLemonWebhookEvent(rawBody: string): LemonWebhookEvent | null {
  try {
    return JSON.parse(rawBody) as LemonWebhookEvent;
  } catch {
    return null;
  }
}
