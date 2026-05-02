import Link from "next/link";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string;

const faqItems = [
  {
    question: "How does this connect to my Stripe account?",
    answer:
      "You can analyze with your server Stripe key (`STRIPE_SECRET_KEY`) or connect a restricted key inside the dashboard. The app reads subscriptions and invoices, then computes MRR, churn, and plan-level performance."
  },
  {
    question: "Will this change pricing in Stripe automatically?",
    answer:
      "No automatic write actions happen. You get experiment-ready recommendations, projected impact, and an interactive simulator so your team can approve changes before execution."
  },
  {
    question: "What kind of lift should I expect?",
    answer:
      "Most teams first recover revenue by reducing trial leakage and cancellation intent. The dashboard prioritizes high-impact tests first so you can ship changes in days, not quarters."
  },
  {
    question: "Is this only for startups?",
    answer:
      "It works for any SaaS using Stripe subscriptions, from early-stage founders to mature teams that need faster pricing iteration and measurable ROI."
  }
];

export default function HomePage() {
  return (
    <main className="grid-surface min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-24 pt-12 sm:px-8 lg:px-12">
        <header className="glass-card accent-ring rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-5">
              <p className="inline-flex items-center rounded-full border border-[#2b3a53] bg-[#111a28] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#7ac7ff]">
                Invoice Billing
              </p>
              <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
                Optimize Stripe subscription pricing for maximum revenue
              </h1>
              <p className="max-w-xl text-base text-[#9ba6b5] sm:text-lg">
                SaaS companies quietly lose up to 30% of subscription revenue because pricing, trial design, and billing cadence are never
                stress-tested. This dashboard turns raw Stripe activity into specific, testable growth moves.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto">
              <a
                href={paymentLink}
                className="rounded-lg bg-[#3dd9b2] px-6 py-3 text-center text-sm font-semibold text-[#081014] transition hover:bg-[#2fcb9e]"
              >
                Buy Now - $19/mo
              </a>
              <Link
                href="/dashboard"
                className="rounded-lg border border-[#32435f] px-6 py-3 text-center text-sm font-semibold text-[#d8e2ed] transition hover:border-[#4a638b]"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="glass-card rounded-xl p-5">
            <h2 className="text-lg font-semibold">The Problem</h2>
            <p className="mt-3 text-sm text-[#9ba6b5]">
              Most SaaS pricing is set once and then ignored. Trial leakage, poorly segmented tiers, and the wrong billing cycle silently reduce
              expansion and retention.
            </p>
          </article>
          <article className="glass-card rounded-xl p-5">
            <h2 className="text-lg font-semibold">The Solution</h2>
            <p className="mt-3 text-sm text-[#9ba6b5]">
              Pull in Stripe metrics, benchmark conversion and churn patterns, and generate AI-backed recommendations that are ready for
              implementation and A/B testing.
            </p>
          </article>
          <article className="glass-card rounded-xl p-5">
            <h2 className="text-lg font-semibold">Who It Is For</h2>
            <p className="mt-3 text-sm text-[#9ba6b5]">
              SaaS founders and growth teams who run subscription billing on Stripe and need a practical way to improve net MRR with limited
              engineering bandwidth.
            </p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-card rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">What You Get Inside</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#2a384f] bg-[#111927] p-4">
                <h3 className="font-medium">Subscription Health Snapshot</h3>
                <p className="mt-2 text-sm text-[#9ba6b5]">Live MRR, ARR, ARPU, churn, and trial conversion from your Stripe data.</p>
              </div>
              <div className="rounded-xl border border-[#2a384f] bg-[#111927] p-4">
                <h3 className="font-medium">Plan-by-Plan Breakdown</h3>
                <p className="mt-2 text-sm text-[#9ba6b5]">See which plans drive profit and which ones carry high cancellation risk.</p>
              </div>
              <div className="rounded-xl border border-[#2a384f] bg-[#111927] p-4">
                <h3 className="font-medium">AI Optimization Engine</h3>
                <p className="mt-2 text-sm text-[#9ba6b5]">Get ranked pricing, trial, and billing-cycle recommendations with projected lift.</p>
              </div>
              <div className="rounded-xl border border-[#2a384f] bg-[#111927] p-4">
                <h3 className="font-medium">Pricing Simulator</h3>
                <p className="mt-2 text-sm text-[#9ba6b5]">Model price and conversion changes before publishing any update to customers.</p>
              </div>
            </div>
          </div>

          <aside className="glass-card rounded-2xl p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-[#8f9fb5]">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold">$19/month</h2>
            <p className="mt-3 text-sm text-[#9ba6b5]">
              One plan. Full dashboard access. Built for founders who need clear revenue actions from Stripe data without a BI team.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[#d6dce6]">
              <li>AI-driven recommendations with expected impact</li>
              <li>Interactive metrics and trend charts</li>
              <li>Pricing + churn simulation workflows</li>
              <li>Cookie-gated private dashboard</li>
            </ul>
            <a
              href={paymentLink}
              className="mt-8 inline-block w-full rounded-lg bg-[#3dd9b2] px-5 py-3 text-center text-sm font-semibold text-[#071015] transition hover:bg-[#35c9a7]"
            >
              Start Optimizing Revenue
            </a>
          </aside>
        </section>

        <section className="glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <div className="mt-6 grid gap-4">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-xl border border-[#2a384f] bg-[#0f1724] p-4">
                <h3 className="text-base font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm text-[#9ba6b5]">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
