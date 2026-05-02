"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import type { OptimizationRecommendation, SubscriptionAnalysis } from "@/lib/types";

interface OptimizationRecommendationsProps {
  analysis: SubscriptionAnalysis | null;
  isLoading: boolean;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function impactStyle(impact: OptimizationRecommendation["impact"]): string {
  if (impact === "high") {
    return "border-[#3a5a2f] bg-[#182616] text-[#9af08a]";
  }
  if (impact === "medium") {
    return "border-[#5b4b20] bg-[#2a220f] text-[#f6d373]";
  }
  return "border-[#324058] bg-[#152033] text-[#9bb6d6]";
}

export default function OptimizationRecommendations({ analysis, isLoading }: OptimizationRecommendationsProps) {
  const [selected, setSelected] = useState<OptimizationRecommendation | null>(null);

  const headline = useMemo(() => {
    if (!analysis) {
      return null;
    }

    return analysis.recommendations[0] ?? null;
  }, [analysis]);

  if (isLoading) {
    return (
      <section className="glass-card rounded-xl p-6">
        <div className="h-28 animate-pulse rounded-xl bg-[#121d2e]" />
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-semibold">Optimization Recommendations</h2>
        <p className="mt-2 text-sm text-[#9ba6b5]">Recommendations appear after analysis runs.</p>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#8fa3bd]">AI Revenue Plan</p>
        <h2 className="text-2xl font-semibold">Priority Experiments</h2>
        <p className="text-sm text-[#9ba6b5]">Actionable pricing and billing moves ranked by expected revenue impact.</p>
      </div>

      {headline && (
        <div className="mt-5 rounded-xl border border-[#2d3b52] bg-[#0e1827] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#89a3c4]">Top Priority</p>
          <h3 className="mt-1 text-lg font-semibold">{headline.title}</h3>
          <p className="mt-2 text-sm text-[#9eb0c4]">{headline.summary}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {analysis.recommendations.map((recommendation) => (
          <article key={recommendation.id} className="rounded-xl border border-[#2b3951] bg-[#101b2b] p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold">{recommendation.title}</h3>
              <span
                className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${impactStyle(
                  recommendation.impact
                )}`}
              >
                {recommendation.impact}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#9fb1c5]">{recommendation.summary}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-[#9bc7f3]">Confidence {recommendation.confidence.toFixed(0)}%</span>
              <span className="text-[#89f0c9]">+{formatCurrency(recommendation.projectedMonthlyLift, analysis.currency)}/mo</span>
            </div>
            <button
              onClick={() => setSelected(recommendation)}
              className="mt-4 w-full rounded-lg border border-[#355179] px-3 py-2 text-sm font-medium text-[#d7e6f5] transition hover:border-[#4f78a8]"
              type="button"
            >
              View Implementation Playbook
            </button>
          </article>
        ))}
      </div>

      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[#05080fb8]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[#31425e] bg-[#0e1725] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold">{selected?.title}</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-[#9baec5]">{selected?.reasoning}</Dialog.Description>
              </div>
              <Dialog.Close className="rounded-md border border-[#2f4058] p-1.5 text-[#9db2cc] hover:border-[#4b678f]">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="mt-5 rounded-lg border border-[#2a3a52] bg-[#101b2d] p-4">
              <p className="text-sm text-[#9cb0c5]">Projected monthly lift</p>
              <p className="mt-1 text-2xl font-bold text-[#82efc5]">
                {selected ? `+${formatCurrency(selected.projectedMonthlyLift, analysis.currency)}` : "-"}
              </p>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8ea6c3]">Action Steps</p>
              <ol className="mt-3 space-y-2 text-sm text-[#c6d3e2]">
                {selected?.actionSteps.map((step) => (
                  <li key={step} className="rounded-md border border-[#283750] bg-[#0f1929] px-3 py-2">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
