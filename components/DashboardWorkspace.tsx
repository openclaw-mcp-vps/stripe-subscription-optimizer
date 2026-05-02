"use client";

import { useCallback, useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, RefreshCcw } from "lucide-react";

import MetricsDashboard from "@/components/MetricsDashboard";
import OptimizationRecommendations from "@/components/OptimizationRecommendations";
import PricingSimulator from "@/components/PricingSimulator";
import type { SubscriptionAnalysis } from "@/lib/types";

const LOOKBACK_OPTIONS = [
  { label: "3 months", value: "3" },
  { label: "6 months", value: "6" },
  { label: "12 months", value: "12" }
];

export default function DashboardWorkspace() {
  const [analysis, setAnalysis] = useState<SubscriptionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookbackMonths, setLookbackMonths] = useState("6");

  const runAnalysis = useCallback(async (months: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ lookbackMonths: months })
      });

      const payload = (await response.json()) as SubscriptionAnalysis & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Analysis failed.");
      }

      setAnalysis(payload);
    } catch (analysisError) {
      const message = analysisError instanceof Error ? analysisError.message : "Unknown analysis error";
      setError(message);
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void runAnalysis(Number(lookbackMonths));
  }, [lookbackMonths, runAnalysis]);

  return (
    <section className="flex flex-col gap-6">
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8ca0ba]">Analysis Window</p>
            <p className="mt-1 text-sm text-[#a4b1c2]">Choose how far back to inspect subscription behavior.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select.Root value={lookbackMonths} onValueChange={setLookbackMonths}>
              <Select.Trigger
                aria-label="Lookback window"
                className="inline-flex h-10 min-w-[140px] items-center justify-between gap-2 rounded-lg border border-[#30405a] bg-[#101a28] px-3 text-sm text-[#d8e2ec]"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown className="h-4 w-4 text-[#90a3bb]" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="z-50 overflow-hidden rounded-lg border border-[#30405a] bg-[#101a28] text-[#d8e2ec] shadow-xl">
                  <Select.Viewport className="p-1">
                    {LOOKBACK_OPTIONS.map((option) => (
                      <Select.Item
                        key={option.value}
                        value={option.value}
                        className="relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-[#1b2b40]"
                      >
                        <Select.ItemText>{option.label}</Select.ItemText>
                        <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                          <Check className="h-4 w-4 text-[#8be5ca]" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <button
              onClick={() => void runAnalysis(Number(lookbackMonths))}
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#30405a] bg-[#101a28] px-3 text-sm text-[#d8e2ec] transition hover:border-[#46628a]"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-[#ff9aa7]">{error}</p>}
      </div>

      <MetricsDashboard analysis={analysis} isLoading={isLoading} />
      <OptimizationRecommendations analysis={analysis} isLoading={isLoading} />
      <PricingSimulator analysis={analysis} isLoading={isLoading} />
    </section>
  );
}
