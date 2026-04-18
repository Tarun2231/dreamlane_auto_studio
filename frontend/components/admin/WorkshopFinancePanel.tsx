export type WorkshopFinance = {
  incomeInr: number;
  partsCostInr: number;
  miscCostsInr: number;
  totalDirectCostsInr: number;
  profitInr: number;
};

/** Completed jobs in scope, split by payment status (same service-date window as income & costs). */
export type PaymentMetrics = {
  completedJobs: number;
  paid: number;
  partial: number;
  unpaid: number;
  waived: number;
  pendingCollection: number;
  outstandingInr: number;
};

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

export default function WorkshopFinancePanel({
  finance,
  revenueFallback,
  paymentMetrics,
  loading,
  periodHint,
}: {
  finance?: WorkshopFinance;
  revenueFallback?: number;
  paymentMetrics?: PaymentMetrics;
  loading: boolean;
  periodHint: string;
}) {
  if (loading) {
    return (
      <section className="card p-5 sm:p-6" aria-labelledby="income-heading">
        <h2 id="income-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Income & costs
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{periodHint}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={`p-${i}`} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      </section>
    );
  }

  const incomeInr = finance?.incomeInr ?? revenueFallback ?? 0;
  const partsCostInr = finance?.partsCostInr ?? 0;
  const miscCostsInr = finance?.miscCostsInr ?? 0;
  const totalCostsInr = finance?.totalDirectCostsInr ?? partsCostInr + miscCostsInr;
  const profitInr = finance?.profitInr ?? incomeInr - totalCostsInr;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="income-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="income-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Income & costs
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{periodHint}</p>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-500">
            Based on <strong className="font-medium text-zinc-800 dark:text-zinc-300">completed</strong> jobs only. Enter spare
            parts and other costs on each booking&apos;s job card.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-400">Income</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-950 dark:text-emerald-50">{formatInr(incomeInr)}</p>
          <p className="mt-1 text-[10px] text-emerald-900/85 dark:text-emerald-300/90">Billed on completed jobs</p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 dark:border-amber-900/45 dark:bg-amber-950/25">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-950 dark:text-amber-400">Spare parts spend</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-950 dark:text-amber-100">{formatInr(partsCostInr)}</p>
          <p className="mt-1 text-[10px] text-amber-950/85 dark:text-amber-300/90">From job cards (cost)</p>
        </div>
        <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 px-4 py-3 dark:border-orange-900/45 dark:bg-orange-950/25">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-950 dark:text-orange-400">Other spend</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-orange-950 dark:text-orange-100">{formatInr(miscCostsInr)}</p>
          <p className="mt-1 text-[10px] text-orange-950/85 dark:text-orange-300/90">Oil, consumables, sublet…</p>
        </div>
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/70 px-4 py-3 dark:border-violet-900/45 dark:bg-violet-950/25">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-950 dark:text-violet-400">Profit (est.)</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-violet-950 dark:text-violet-100">{formatInr(profitInr)}</p>
          <p className="mt-1 text-[10px] text-violet-950/85 dark:text-violet-300/90">Income − parts − other</p>
        </div>
      </div>

      {paymentMetrics && (
        <div className="mt-8 border-t border-zinc-200/80 pt-6 dark:border-zinc-700/80">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment collection (completed jobs)</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Same reporting period as above. Set status on each booking (Payment &amp; P&amp;L). Outstanding ₹ = sum of{" "}
            <strong className="font-medium text-zinc-700 dark:text-zinc-300">final amounts</strong> on jobs still marked unpaid or partial.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="min-w-[10rem] flex-1 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/45 dark:bg-emerald-950/25">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-400">Paid in full</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950 dark:text-emerald-50">{paymentMetrics.paid}</p>
              <p className="mt-1 text-[10px] text-emerald-900/80 dark:text-emerald-300/90">Jobs marked paid</p>
            </div>
            <div className="min-w-[10rem] flex-1 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 dark:border-amber-900/45 dark:bg-amber-950/25">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-950 dark:text-amber-400">Still collecting</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-amber-950 dark:text-amber-100">{paymentMetrics.pendingCollection}</p>
              <p className="mt-1 text-[10px] text-amber-950/85 dark:text-amber-300/90">Unpaid + partial</p>
            </div>
            <div className="min-w-[10rem] flex-1 rounded-xl border border-rose-200/80 bg-rose-50/60 px-4 py-3 dark:border-rose-900/45 dark:bg-rose-950/25">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-900 dark:text-rose-400">Outstanding billed</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-rose-950 dark:text-rose-100">{formatInr(paymentMetrics.outstandingInr)}</p>
              <p className="mt-1 text-[10px] text-rose-900/85 dark:text-rose-300/90">On unpaid / partial jobs</p>
            </div>
            <div className="min-w-[10rem] flex-1 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-900/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Waived</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{paymentMetrics.waived}</p>
              <p className="mt-1 text-[10px] text-zinc-600 dark:text-zinc-500">No payment expected</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-500">
            Completed jobs in period: <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{paymentMetrics.completedJobs}</span>
            {" · "}Partial only:{" "}
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{paymentMetrics.partial}</span>
            {" · "}Unpaid:{" "}
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{paymentMetrics.unpaid}</span>
          </p>
        </div>
      )}
    </section>
  );
}
