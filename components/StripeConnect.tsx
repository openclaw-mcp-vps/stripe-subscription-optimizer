"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, KeyRound, Link2, ShieldCheck } from "lucide-react";

interface StripeConnectProps {
  hasServerKey: boolean;
}

export default function StripeConnect({ hasServerKey }: StripeConnectProps) {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(
    hasServerKey ? "Using server-level Stripe key from environment." : null
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!stripeSecretKey.trim()) {
      setError("Enter a Stripe secret key to connect your account.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ stripeSecretKey: stripeSecretKey.trim() })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to validate Stripe key.");
      }

      setStripeSecretKey("");
      setMessage("Stripe key connected. Analysis requests now use your account data.");
    } catch (submitError) {
      const text = submitError instanceof Error ? submitError.message : "Unexpected connection error";
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-[#8ca1bc]">
          <ShieldCheck className="h-4 w-4" />
          <span>Private Stripe connection</span>
        </div>
        <h2 className="text-xl font-semibold">Connect Stripe Data Source</h2>
        <p className="text-sm text-[#9ba6b5]">
          Use a restricted key with read access to subscriptions, invoices, and prices. The key is stored in an HTTP-only cookie and never
          exposed to client-side JavaScript.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[#8f9fb5]">Stripe Secret Key</span>
          <div className="flex items-center rounded-lg border border-[#2d3b52] bg-[#111927] px-3">
            <KeyRound className="h-4 w-4 text-[#7e92ab]" />
            <input
              value={stripeSecretKey}
              onChange={(event) => setStripeSecretKey(event.target.value)}
              type="password"
              autoComplete="off"
              className="w-full bg-transparent px-3 py-2.5 text-sm text-[#dfe7f1] outline-none"
              placeholder="sk_live_..."
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-auto rounded-lg bg-[#3dd9b2] px-4 py-2.5 text-sm font-semibold text-[#081014] transition hover:bg-[#32caa2] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Connecting..." : "Connect Stripe"}
        </button>
      </form>

      {(message || error) && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            error ? "border-[#5a2d35] bg-[#2a161c] text-[#ffc4cc]" : "border-[#1f4b3d] bg-[#11271f] text-[#95f3c5]"
          }`}
        >
          {!error && <CheckCircle2 className="h-4 w-4" />}
          <span>{error ?? message}</span>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-[#2a384f] bg-[#0f1724] p-4 text-sm text-[#9fb0c5]">
        <p className="font-medium text-[#d7e1ed]">Post-checkout unlock setup</p>
        <p className="mt-2">
          Set your Stripe Payment Link success redirect to:
          <code className="ml-1 rounded bg-[#1a2435] px-2 py-0.5 text-[#b8c9dc]">/api/stripe/connect?session_id={"{CHECKOUT_SESSION_ID}"}</code>
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-[#8ea2bc]">
          <Link2 className="h-3.5 w-3.5" />
          This verifies checkout and grants dashboard access with a signed cookie.
        </p>
      </div>
    </section>
  );
}
