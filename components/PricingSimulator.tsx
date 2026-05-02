"use client";

import { useMemo, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import type { SimulatorScenario, SubscriptionAnalysis } from "@/lib/types";

interface PricingSimulatorProps {
  analysis: SubscriptionAnalysis | null;
  isLoading: boolean;
}

const scenarios: SimulatorScenario[] = [
  {
    label: "Conservative",
    priceChangePct: 5,
    conversionDeltaPct: -2,
    churnDeltaPct: 2
  },
  {
    label: "Balanced",
    priceChangePct: 8,
    conversionDeltaPct: -1,
    churnDeltaPct: 0
  },
  {
    label: "Aggressive",
    priceChangePct: 12,
    conversionDeltaPct: -4,
    churnDeltaPct: 4
  }
];

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function PricingSimulator({ analysis, isLoading }: PricingSimulatorProps) {
  const [priceChangePct, setPriceChangePct] = useState(8);
  const [conversionDeltaPct, setConversionDeltaPct] = useState(-1);
  const [churnDeltaPct, setChurnDeltaPct] = useState(0);
  const [billingMix, setBillingMix] = useState("monthly");

  const projection = useMemo(() => {
    if (!analysis) {
      return null;
    }

    const baseMrr = analysis.metrics.monthlyRecurringRevenue;
    const baseSubs = analysis.metrics.activeSubscriptions;
    const baseChurn = analysis.metrics.churnRate / 100;

    const priceEffect = 1 + priceChangePct / 100;
    const conversionEffect = clamp(1 + conversionDeltaPct / 100, 0.4, 1.8);
    const projectedChurn = clamp(baseChurn * (1 + churnDeltaPct / 100), 0.001, 0.6);
    const retentionEffect = clamp((1 - projectedChurn) / Math.max(1 - baseChurn, 0.1), 0.55, 1.35);

    const billingEffect = billingMix === "annual" ? 1.09 : billingMix === "hybrid" ? 1.04 : 1;

    const projectedMrr = baseMrr * priceEffect * conversionEffect * retentionEffect * billingEffect;
    const monthlyDelta = projectedMrr - baseMrr;

    return {
      projectedMrr,
      projectedArr: projectedMrr * 12,
      monthlyDelta,
      deltaPct: baseMrr > 0 ? (monthlyDelta / baseMrr) * 100 : 0,
      projectedSubscribers: Math.round(baseSubs * conversionEffect * retentionEffect),
      projectedChurn: projectedChurn * 100
    };
  }, [analysis, billingMix, churnDeltaPct, conversionDeltaPct, priceChangePct]);

  if (isLoading) {
    return (
      <section className="glass-card rounded-xl p-6">
        <div className="h-28 animate-pulse rounded-xl bg-[#121d2e]" />
      </section>
    );
  }

  if (!analysis || !projection) {
    return (
      <section className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-semibold">Pricing Simulator</h2>
        <p className="mt-2 text-sm text-[#9ba6b5]">Run analysis first to unlock simulation.</p>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-xl p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#8ea2bb]">Scenario Lab</p>
        <h2 className="text-2xl font-semibold">Pricing Simulator</h2>
        <p className="text-sm text-[#9ba6b5]">Preview the impact of pricing, conversion, and churn changes before publishing.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.label}
            type="button"
            onClick={() => {
              setPriceChangePct(scenario.priceChangePct);
              setConversionDeltaPct(scenario.conversionDeltaPct);
              setChurnDeltaPct(scenario.churnDeltaPct);
            }}
            className="rounded-md border border-[#32445f] bg-[#0f1827] px-3 py-1.5 text-sm text-[#ccdae8] transition hover:border-[#4a668e]"
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <label className="block">
            <div className="mb-2 flex items-center justify-between text-sm text-[#c5d2e1]">
              <span>Price Change</span>
              <span>{priceChangePct > 0 ? `+${priceChangePct}` : priceChangePct}%</span>
            </div>
            <input
              type="range"
              min={-10}
              max={30}
              step={1}
              value={priceChangePct}
              onChange={(event) => setPriceChangePct(Number(event.target.value))}
              className="w-full"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between text-sm text-[#c5d2e1]">
              <span>Conversion Delta</span>
              <span>{conversionDeltaPct > 0 ? `+${conversionDeltaPct}` : conversionDeltaPct}%</span>
            </div>
            <input
              type="range"
              min={-20}
              max={20}
              step={1}
              value={conversionDeltaPct}
              onChange={(event) => setConversionDeltaPct(Number(event.target.value))}
              className="w-full"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between text-sm text-[#c5d2e1]">
              <span>Churn Delta</span>
              <span>{churnDeltaPct > 0 ? `+${churnDeltaPct}` : churnDeltaPct}%</span>
            </div>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={churnDeltaPct}
              onChange={(event) => setChurnDeltaPct(Number(event.target.value))}
              className="w-full"
            />
          </label>

          <div>
            <p className="mb-2 text-sm text-[#c5d2e1]">Billing Cycle Strategy</p>
            <Select.Root value={billingMix} onValueChange={setBillingMix}>
              <Select.Trigger className="inline-flex h-10 w-full items-center justify-between rounded-lg border border-[#30405a] bg-[#101a28] px-3 text-sm text-[#d8e2ec]">
                <Select.Value />
                <Select.Icon>
                  <ChevronDown className="h-4 w-4 text-[#90a3bb]" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="z-50 overflow-hidden rounded-lg border border-[#30405a] bg-[#101a28] text-[#d8e2ec] shadow-xl">
                  <Select.Viewport className="p-1">
                    <Select.Item value="monthly" className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-[#1b2b40]">
                      <Select.ItemText>Mostly Monthly</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                        <Check className="h-4 w-4 text-[#8be5ca]" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item value="hybrid" className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-[#1b2b40]">
                      <Select.ItemText>Hybrid Monthly + Annual</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                        <Check className="h-4 w-4 text-[#8be5ca]" />
                      </Select.ItemIndicator>
                    </Select.Item>
                    <Select.Item value="annual" className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-[#1b2b40]">
                      <Select.ItemText>Annual-First Motion</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                        <Check className="h-4 w-4 text-[#8be5ca]" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>

        <div className="rounded-xl border border-[#2d3b52] bg-[#101a28] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#8ea4c2]">Projected Outcome</p>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#a8b6c8]">Projected MRR</span>
              <span className="font-semibold">{formatCurrency(projection.projectedMrr, analysis.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#a8b6c8]">Projected ARR</span>
              <span className="font-semibold">{formatCurrency(projection.projectedArr, analysis.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#a8b6c8]">Monthly Delta</span>
              <span className={`font-semibold ${projection.monthlyDelta >= 0 ? "metric-positive" : "metric-negative"}`}>
                {projection.monthlyDelta >= 0 ? "+" : ""}
                {formatCurrency(projection.monthlyDelta, analysis.currency)} ({projection.deltaPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#a8b6c8]">Projected Active Subs</span>
              <span className="font-semibold">{projection.projectedSubscribers.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#a8b6c8]">Projected Churn</span>
              <span className="font-semibold">{projection.projectedChurn.toFixed(2)}%</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#8fa0b5]">
            Model note: this scenario uses your current MRR as baseline, then applies pricing, conversion, churn, and billing-cycle multipliers.
          </p>
        </div>
      </div>
    </section>
  );
}
