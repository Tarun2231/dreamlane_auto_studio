"use client";

import Link from "next/link";

import type { WorkshopFinance, PaymentMetrics } from "@/components/admin/WorkshopFinancePanel";

export type { WorkshopFinance, PaymentMetrics };

export type WorkshopInsights = {
  vehicleMix: { Hatchback: number; Sedan: number; SUV: number };
  revenueCompletedInr: number;
  /** Completed-job billing, parts/misc spend, profit (same service-date scope as the chart). */
  finance?: WorkshopFinance;
  /** Completed jobs in scope by payment status (unpaid / partial / paid / waived). */
  paymentMetrics?: PaymentMetrics;
  bookingsTomorrow: number;
  jobsOnTheFloorToday: number;
  tomorrow: string;
};

const MIX_ORDER = [
  { key: "Hatchback" as const, label: "Hatch", className: "bg-amber-500/90 dark:bg-amber-500/80" },
  { key: "Sedan" as const, label: "Sedan", className: "bg-zinc-700 dark:bg-zinc-500" },
  { key: "SUV" as const, label: "SUV", className: "bg-emerald-600/90 dark:bg-emerald-600/80" },
];

export default function WorkshopInsightsPanel({
  insights,
  todayYmd,
  loading,
  scopeLabel,
}: {
  insights: WorkshopInsights | undefined;
  todayYmd: string;
  loading: boolean;
  scopeLabel: string;
}) {
  if (loading || !insights) {
    return (
      <section className="card p-5 sm:p-6" aria-labelledby="workshop-insights-heading">
        <h2 id="workshop-insights-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Workshop insights
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{scopeLabel}</p>
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      </section>
    );
  }

  const mix = insights.vehicleMix;
  const totalMix = mix.Hatchback + mix.Sedan + mix.SUV;
  const tomorrowHref = `/admin/bookings?dateFrom=${encodeURIComponent(insights.tomorrow)}&dateTo=${encodeURIComponent(insights.tomorrow)}`;
  const todayHref = `/admin/bookings?dateFrom=${encodeURIComponent(todayYmd)}&dateTo=${encodeURIComponent(todayYmd)}`;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="workshop-insights-heading">
      <div className="flex flex-col gap-1">
        <h2 id="workshop-insights-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Workshop insights
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{scopeLabel}</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-800/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">On the floor today</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{insights.jobsOnTheFloorToday}</p>
          <Link href={todayHref} className="mt-2 inline-block text-xs font-semibold text-amber-800 hover:underline dark:text-amber-400">
            Today&apos;s schedule →
          </Link>
        </div>
        <div className="rounded-xl border border-blue-200/70 bg-blue-50/50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/25">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-400">Booked for tomorrow</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-blue-950 dark:text-blue-100">{insights.bookingsTomorrow}</p>
          <Link href={tomorrowHref} className="mt-2 inline-block text-xs font-semibold text-blue-900 hover:underline dark:text-blue-300">
            Open {insights.tomorrow} →
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-900/50 sm:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Vehicle mix {totalMix > 0 ? "(bookings)" : ""}</p>
          {totalMix === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No bookings in this scope yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-700">
                {MIX_ORDER.map(({ key, className }) => {
                  const pct = (mix[key] / totalMix) * 100;
                  return pct > 0 ? (
                    <div key={key} className={`${className} min-w-[2px]`} style={{ width: `${pct}%` }} title={`${key}: ${mix[key]}`} />
                  ) : null;
                })}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                {MIX_ORDER.map(({ key, label }) => (
                  <li key={key}>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>{" "}
                    <span className="tabular-nums">{mix[key]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
