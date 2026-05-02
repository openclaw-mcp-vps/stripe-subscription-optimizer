import Link from "next/link";
import { cookies } from "next/headers";

import DashboardWorkspace from "@/components/DashboardWorkspace";
import StripeConnect from "@/components/StripeConnect";
import { ACCESS_COOKIE_NAME, verifyAccessCookieToken } from "@/lib/auth";
import { getStripeSecretFromEnv } from "@/lib/stripe-client";

export const dynamic = "force-dynamic";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const hasAccess = Boolean(verifyAccessCookieToken(accessToken));
  const hasServerKey = Boolean(getStripeSecretFromEnv());

  if (!hasAccess) {
    return (
      <main className="grid-surface min-h-screen">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-16 pt-12 sm:px-8">
          <Link href="/" className="text-sm text-[#9cb2ca] hover:text-[#d8e4f1]">
            ← Back to landing page
          </Link>

          <section className="glass-card rounded-2xl p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8ca0ba]">Dashboard Locked</p>
            <h1 className="mt-2 text-3xl font-bold">Complete checkout to unlock Stripe optimization insights</h1>
            <p className="mt-3 text-sm text-[#9ba6b5]">
              Your dashboard is protected behind purchase access. After successful checkout, Stripe should redirect back with a
              <code className="mx-1 rounded bg-[#1a2435] px-1.5 py-0.5">session_id</code>
              so access can be granted automatically.
            </p>

            <a
              href={paymentLink}
              className="mt-6 inline-block rounded-lg bg-[#3dd9b2] px-6 py-3 text-sm font-semibold text-[#071014] transition hover:bg-[#34cb9f]"
            >
              Unlock for $19/month
            </a>

            <div className="mt-6 rounded-xl border border-[#2b3a52] bg-[#101a28] p-4 text-sm text-[#a7b7c9]">
              <p className="font-medium text-[#dce6f2]">Required Stripe Payment Link redirect</p>
              <p className="mt-2">
                <code className="rounded bg-[#1a2435] px-2 py-1 text-[#bcd0e4]">/api/stripe/connect?session_id={"{CHECKOUT_SESSION_ID}"}</code>
              </p>
              <p className="mt-2 text-xs text-[#8fa3bd]">This lets the app verify checkout and set the signed access cookie.</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="grid-surface min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-16 pt-10 sm:px-8 lg:px-12">
        <header className="glass-card rounded-2xl p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8ea3bc]">Subscription Optimizer</p>
              <h1 className="mt-2 text-3xl font-bold">Stripe Revenue Intelligence Dashboard</h1>
              <p className="mt-2 text-sm text-[#9ba6b5]">
                Analyze subscription health, identify pricing gaps, and execute retention-aware growth experiments.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#33435f] px-4 text-sm font-medium text-[#d3dfeb] transition hover:border-[#4a6289]"
            >
              View Marketing Page
            </Link>
          </div>
        </header>

        <StripeConnect hasServerKey={hasServerKey} />
        <DashboardWorkspace />
      </div>
    </main>
  );
}
