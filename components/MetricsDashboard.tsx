"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { SubscriptionAnalysis } from "@/lib/types";

interface MetricsDashboardProps {
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

function metricDeltaClass(value: number, positiveThreshold = 0): string {
  return value >= positiveThreshold ? "metric-positive" : "metric-negative";
}

export default function MetricsDashboard({ analysis, isLoading }: MetricsDashboardProps) {
  if (isLoading) {
    return (
      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="glass-card h-28 animate-pulse rounded-xl" />
        ))}
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-semibold">Metrics Dashboard</h2>
        <p className="mt-2 text-sm text-[#9ba6b5]">Run analysis to load Stripe subscription metrics and trend insights.</p>
      </section>
    );
  }

  const { metrics } = analysis;

  const cards = [
    {
      label: "Monthly Recurring Revenue",
      value: formatCurrency(metrics.monthlyRecurringRevenue, analysis.currency),
      hint: `ARR ${formatCurrency(metrics.annualRecurringRevenue, analysis.currency)}`
    },
    {
      label: "Active Subscriptions",
      value: metrics.activeSubscriptions.toLocaleString(),
      hint: `${metrics.trialSubscriptions.toLocaleString()} currently in trial`
    },
    {
      label: "Average Revenue Per User",
      value: formatCurrency(metrics.averageRevenuePerUser, analysis.currency),
      hint: "Monthly normalized ARPU"
    },
    {
      label: "Churn Rate",
      value: `${metrics.churnRate.toFixed(1)}%`,
      hint: "Lower is better",
      hintClassName: metricDeltaClass(-metrics.churnRate)
    },
    {
      label: "Trial to Paid",
      value: `${metrics.trialToPaidRate.toFixed(1)}%`,
      hint: "Conversion quality",
      hintClassName: metricDeltaClass(metrics.trialToPaidRate, 30)
    },
    {
      label: "MoM Growth",
      value: `${metrics.monthOverMonthGrowthRate.toFixed(1)}%`,
      hint: `${metrics.scheduledCancellations} scheduled cancellations`,
      hintClassName: metricDeltaClass(metrics.monthOverMonthGrowthRate)
    }
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="glass-card rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8fa1ba]">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className={`mt-2 text-sm ${card.hintClassName ?? "text-[#9ba6b5]"}`}>{card.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#92a6c2]">Revenue Trend</h3>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.trend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3dd9b2" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3dd9b2" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27354d" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#8ea2bb" />
                <YAxis stroke="#8ea2bb" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#101a28",
                    border: "1px solid #2d3b52",
                    borderRadius: "10px",
                    color: "#e5edf5"
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#42d8b5" strokeWidth={2.2} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="glass-card rounded-xl p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#92a6c2]">Trial and Conversion Flow</h3>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.trend}>
                <CartesianGrid stroke="#27354d" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#8ea2bb" />
                <YAxis stroke="#8ea2bb" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#101a28",
                    border: "1px solid #2d3b52",
                    borderRadius: "10px",
                    color: "#e5edf5"
                  }}
                />
                <Legend />
                <Bar dataKey="newTrials" name="New Trials" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conversions" name="Conversions" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="glass-card overflow-hidden rounded-xl">
        <div className="border-b border-[#29364d] px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#92a6c2]">Top Plans by MRR</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#101a28] text-xs uppercase tracking-[0.14em] text-[#8ea2ba]">
              <tr>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Interval</th>
                <th className="px-4 py-3">Subscribers</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3">ARPS</th>
                <th className="px-4 py-3">Cancellation Risk</th>
              </tr>
            </thead>
            <tbody>
              {analysis.planBreakdown.map((plan) => (
                <tr key={plan.planId} className="border-t border-[#222f45]">
                  <td className="px-4 py-3 font-medium text-[#e4ebf5]">{plan.planName}</td>
                  <td className="px-4 py-3 text-[#afbccd]">{plan.interval}</td>
                  <td className="px-4 py-3 text-[#afbccd]">{plan.subscribers.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#afbccd]">{formatCurrency(plan.mrr, analysis.currency)}</td>
                  <td className="px-4 py-3 text-[#afbccd]">{formatCurrency(plan.avgRevenuePerSubscriber, analysis.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`${plan.cancellationRisk > 20 ? "metric-negative" : "metric-positive"}`}>
                      {plan.cancellationRisk.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
