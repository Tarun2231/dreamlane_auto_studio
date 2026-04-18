"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminSearchButton, requestOpenAdminCommandPalette } from "@/components/AdminCommandPalette";
import AdminThemeToggle from "@/components/AdminThemeToggle";
import DashboardPeriodControls, { type DashboardPeriodType } from "@/components/admin/DashboardPeriodControls";
import WorkshopFinancePanel from "@/components/admin/WorkshopFinancePanel";
import WorkshopInsightsPanel, { type WorkshopInsights } from "@/components/admin/WorkshopInsightsPanel";
import { adminApi } from "@/lib/api";
import type { AdminQuoteStats, FleetSnapshot } from "@/lib/types";

type DashboardStats = {
  totalBookings: number;
  todaysBookings: number;
  activeServices: number;
  completedAllTime: number;
  today?: string;
  attention?: {
    pendingBookings: number;
    inProgressBookings: number;
    availableSlotsToday: number;
  };
  insights?: WorkshopInsights;
  period: {
    type: DashboardPeriodType | string;
    ref: string;
    rangeStart: string | null;
    rangeEnd: string | null;
    dateFrom?: string;
    dateTo?: string;
    completed: number;
    pending: number;
    inProgress: number;
    totalInRange: number;
  };
};

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonthYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function endOfMonthYmd(d = new Date()) {
  const y = d.getFullYear();
  const mo = d.getMonth();
  const last = new Date(y, mo + 1, 0).getDate();
  const m = String(mo + 1).padStart(2, "0");
  return `${y}-${m}-${String(last).padStart(2, "0")}`;
}

/** Shift a YYYY-MM-DD string by calendar days (local). */
function ymdAddDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + delta);
  return ymdLocal(dt);
}

/** Mid-month anchor for “previous calendar month” (same logic as week/month presets). */
function anchorPreviousMonthYmd(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  d.setDate(15);
  return ymdLocal(d);
}

/** Bookings list URL with optional date range + status (matches admin bookings filters). */
function adminBookingsHref(
  period: DashboardStats["period"] | undefined,
  status?: "Completed" | "Pending" | "In Progress"
) {
  const qs = new URLSearchParams();
  if (period?.rangeStart && period?.rangeEnd) {
    qs.set("dateFrom", period.rangeStart);
    qs.set("dateTo", period.rangeEnd);
  }
  if (status) qs.set("status", status);
  const q = qs.toString();
  return q ? `/admin/bookings?${q}` : "/admin/bookings";
}

const metricPresets = {
  attentionPending: {
    card: "border border-amber-200/70 dark:border-amber-800/50",
    blob: "bg-amber-100/80 dark:bg-amber-950/40",
    label: "text-amber-800 dark:text-amber-400",
    value: "text-amber-950 dark:text-amber-100",
    footer: "text-amber-800/90 dark:text-amber-400/90",
  },
  attentionProgress: {
    card: "border border-blue-200/70 dark:border-blue-800/50",
    blob: "bg-blue-100/75 dark:bg-blue-950/35",
    label: "text-blue-800 dark:text-blue-400",
    value: "text-blue-950 dark:text-blue-100",
    footer: "text-blue-800/90 dark:text-blue-400/90",
  },
  attentionSlots: {
    card: "border border-emerald-200/70 dark:border-emerald-800/50",
    blob: "bg-emerald-100/75 dark:bg-emerald-950/35",
    label: "text-emerald-800 dark:text-emerald-400",
    value: "text-emerald-950 dark:text-emerald-100",
    footer: "text-emerald-800/90 dark:text-emerald-400/90",
  },
  overview: {
    card: "",
    blob: "bg-zinc-100/90 dark:bg-zinc-800/80",
    label: "text-zinc-500 dark:text-zinc-400",
    value: "text-zinc-900 dark:text-zinc-50",
    footer: "text-amber-800 dark:text-amber-400",
  },
  overviewCompleted: {
    card: "",
    blob: "bg-emerald-100/50 dark:bg-emerald-950/25",
    label: "text-zinc-500 dark:text-zinc-400",
    value: "text-zinc-900 dark:text-zinc-50",
    footer: "text-emerald-800 dark:text-emerald-400",
  },
  periodDone: {
    card: "border border-emerald-200/70 dark:border-emerald-800/50",
    blob: "bg-emerald-100/75 dark:bg-emerald-950/35",
    label: "text-zinc-600 dark:text-zinc-400",
    value: "text-emerald-800 dark:text-emerald-300",
    footer: "text-emerald-900/80 dark:text-emerald-400/90",
  },
  periodPending: {
    card: "border border-amber-200/70 dark:border-amber-800/50",
    blob: "bg-amber-100/75 dark:bg-amber-950/35",
    label: "text-zinc-600 dark:text-zinc-400",
    value: "text-amber-900 dark:text-amber-200",
    footer: "text-amber-900/80 dark:text-amber-300/90",
  },
  periodProgress: {
    card: "border border-blue-200/70 dark:border-blue-800/50",
    blob: "bg-blue-100/75 dark:bg-blue-950/35",
    label: "text-zinc-600 dark:text-zinc-400",
    value: "text-blue-900 dark:text-blue-200",
    footer: "text-blue-900/80 dark:text-blue-300/90",
  },
  periodTotal: {
    card: "",
    blob: "bg-zinc-100/90 dark:bg-zinc-800/80",
    label: "text-zinc-600 dark:text-zinc-400",
    value: "text-zinc-900 dark:text-zinc-50",
    footer: "text-amber-800 dark:text-amber-400",
  },
} as const;

type MetricPresetKey = keyof typeof metricPresets;

function DashboardMetricLink({
  href,
  label,
  value,
  footer,
  preset,
}: {
  href: string;
  label: string;
  value: ReactNode;
  footer: string;
  preset: MetricPresetKey;
}) {
  const p = metricPresets[preset];
  return (
    <Link
      href={href}
      className={`card group relative block overflow-hidden p-5 transition-shadow duration-300 hover:shadow-md dark:hover:shadow-none dark:hover:ring-white/15 ${p.card}`}
    >
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${p.blob}`} aria-hidden />
      <p className={`relative text-xs font-semibold uppercase tracking-wider ${p.label}`}>{label}</p>
      <p className={`relative mt-2 text-3xl font-bold tabular-nums tracking-tight ${p.value}`}>{value}</p>
      <p className={`relative mt-2 text-xs font-medium ${p.footer}`}>{footer}</p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [periodType, setPeriodType] = useState<DashboardPeriodType>("day");
  const [refDate, setRefDate] = useState(() => ymdLocal());
  const [rangeFrom, setRangeFrom] = useState(() => startOfMonthYmd());
  const [rangeTo, setRangeTo] = useState(() => endOfMonthYmd());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fleet, setFleet] = useState<FleetSnapshot | null>(null);
  const [quoteStats, setQuoteStats] = useState<AdminQuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    setFleet(null);
    setQuoteStats(null);
    try {
      const params: Record<string, string> = {
        period: periodType,
        ref: refDate,
      };
      if (periodType === "range") {
        params.dateFrom = rangeFrom;
        params.dateTo = rangeTo;
      }
      const res = await adminApi.get<DashboardStats>("/dashboard", { params });
      setStats(res.data);
      const p = res.data.period;
      const scoped =
        p.type !== "overall" && p.rangeStart && p.rangeEnd
          ? { dateFrom: p.rangeStart, dateTo: p.rangeEnd }
          : {};
      try {
        const fr = await adminApi.get<FleetSnapshot>("/cars", { params: { limit: 5, ...scoped } });
        setFleet(fr.data);
      } catch {
        setFleet(null);
      }
      try {
        const qs = await adminApi.get<AdminQuoteStats>("/quote-stats", { params: scoped });
        setQuoteStats(qs.data);
      } catch {
        setQuoteStats(null);
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      const msg = ax.response?.data?.message;
      setError(
        typeof msg === "string" && msg.trim()
          ? msg
          : "Could not load dashboard. Check that the API is running (npm run dev from the repo root) and you are still logged in."
      );
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [periodType, refDate, rangeFrom, rangeTo]);

  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && stats) setLastLoadedAt(new Date());
  }, [loading, stats]);

  const todayParam = stats?.today ?? ymdLocal();
  const todayYmd = ymdLocal();
  const bookingsTodayHref = `/admin/bookings?dateFrom=${encodeURIComponent(todayParam)}&dateTo=${encodeURIComponent(todayParam)}`;
  const period = stats?.period;

  const onPeriodChange = (next: DashboardPeriodType) => {
    setPeriodType(next);
    if (next === "range") {
      setRangeFrom(startOfMonthYmd(parseYmd(refDate)));
      setRangeTo(endOfMonthYmd(parseYmd(refDate)));
    }
  };

  const presetToday = () => {
    setPeriodType("day");
    setRefDate(todayYmd);
  };
  const presetWeek = () => {
    setPeriodType("week");
    setRefDate(todayYmd);
  };
  const presetMonth = () => {
    setPeriodType("month");
    setRefDate(todayYmd);
  };
  const presetYear = () => {
    setPeriodType("year");
    setRefDate(todayYmd);
  };
  const presetAllTime = () => {
    setPeriodType("overall");
  };

  const presetYesterday = () => {
    setPeriodType("day");
    setRefDate(ymdAddDays(todayYmd, -1));
  };

  const presetLast7 = () => {
    setPeriodType("range");
    setRangeFrom(ymdAddDays(todayYmd, -6));
    setRangeTo(todayYmd);
  };

  const presetLast30 = () => {
    setPeriodType("range");
    setRangeFrom(ymdAddDays(todayYmd, -29));
    setRangeTo(todayYmd);
  };

  const presetPrevMonth = () => {
    setPeriodType("month");
    setRefDate(anchorPreviousMonthYmd());
  };

  const last7From = ymdAddDays(todayYmd, -6);
  const last30From = ymdAddDays(todayYmd, -29);
  const prevMonthAnchor = anchorPreviousMonthYmd();

  const chipActive = {
    today: periodType === "day" && refDate === todayYmd,
    yesterday: periodType === "day" && refDate === ymdAddDays(todayYmd, -1),
    week: periodType === "week" && refDate === todayYmd,
    month: periodType === "month" && refDate === todayYmd,
    prevMonth: periodType === "month" && refDate === prevMonthAnchor,
    year: periodType === "year" && refDate === todayYmd,
    all: periodType === "overall",
    last7: periodType === "range" && rangeFrom === last7From && rangeTo === todayYmd,
    last30: periodType === "range" && rangeFrom === last30From && rangeTo === todayYmd,
    range:
      periodType === "range" &&
      !(rangeFrom === last7From && rangeTo === todayYmd) &&
      !(rangeFrom === last30From && rangeTo === todayYmd),
  };

  const periodRangeHint =
    period?.type === "overall"
      ? "Every booking in the system (any service date)."
      : period?.rangeStart && period?.rangeEnd
        ? `Service dates ${period.rangeStart} → ${period.rangeEnd}`
        : "—";

  const periodCompletionPct =
    stats && stats.period.totalInRange > 0
      ? Math.round((stats.period.completed / stats.period.totalInRange) * 1000) / 10
      : null;

  const financePeriodHint =
    period?.type === "overall"
      ? "All completed jobs (any service date)."
      : period?.rangeStart && period?.rangeEnd
        ? `Service dates ${period.rangeStart} → ${period.rangeEnd} — income & costs from completed work in this window.`
        : "—";

  const workshopInsightsScopeLabel =
    "On the floor and tomorrow are live for today. Vehicle mix counts bookings whose service date falls in the reporting period above.";

  return (
    <div className="space-y-8">
      <header className="border-b border-zinc-200/80 pb-4 dark:border-zinc-700/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          {lastLoadedAt && (
            <p className="shrink-0 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400 sm:max-w-[11rem] sm:pt-0.5">
              <span className="sr-only">Last updated: </span>
              <time dateTime={lastLoadedAt.toISOString()}>
                {lastLoadedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </p>
          )}
          <div className="min-w-0 flex-1">
            <DashboardPeriodControls
                variant="toolbar"
                periodType={periodType}
                onPeriodChange={onPeriodChange}
                refDate={refDate}
                onRefDateChange={setRefDate}
                rangeFrom={rangeFrom}
                onRangeFromChange={setRangeFrom}
                rangeTo={rangeTo}
                onRangeToChange={setRangeTo}
                chipActive={chipActive}
                periodRangeHint={periodRangeHint}
                periodCompletionPct={periodCompletionPct}
                presetToday={presetToday}
                presetWeek={presetWeek}
                presetMonth={presetMonth}
              presetYear={presetYear}
              presetAllTime={presetAllTime}
              presetYesterday={presetYesterday}
              presetLast7={presetLast7}
              presetLast30={presetLast30}
              presetPrevMonth={presetPrevMonth}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
            <AdminSearchButton onClick={requestOpenAdminCommandPalette} />
            <AdminThemeToggle variant="icon" />
            <button
              type="button"
              className="group inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => void load()}
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Loading dashboard" : "Refresh dashboard"}
            >
              {loading ? (
                <svg
                  className="h-5 w-5 animate-spin text-zinc-700 dark:text-zinc-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-zinc-800 transition-transform duration-500 ease-out group-hover:rotate-180 dark:text-zinc-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 3" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 21" />
                  <path d="M3 21v-5h5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <WorkshopFinancePanel
        finance={stats?.insights?.finance}
        revenueFallback={stats?.insights?.revenueCompletedInr}
        paymentMetrics={stats?.insights?.paymentMetrics}
        loading={loading}
        periodHint={financePeriodHint}
      />

      <section className="space-y-3" aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
          Needs attention
        </h2>
        <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Live queue (all dates) and bookable slots for today — jump in with one click.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardMetricLink
            href="/admin/bookings?status=Pending"
            label="Pending bookings"
            value={loading || !stats?.attention ? "—" : stats.attention.pendingBookings}
            footer="Open queue →"
            preset="attentionPending"
          />
          <DashboardMetricLink
            href="/admin/bookings?status=In%20Progress"
            label="In progress"
            value={loading || !stats?.attention ? "—" : stats.attention.inProgressBookings}
            footer="On the floor →"
            preset="attentionProgress"
          />
          <DashboardMetricLink
            href="/admin/slots"
            label="Open slots today"
            value={loading || !stats?.attention ? "—" : stats.attention.availableSlotsToday}
            footer="Manage availability →"
            preset="attentionSlots"
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="quotes-pipeline-heading">
        <h2 id="quotes-pipeline-heading" className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
          Quote pipeline
        </h2>
        <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Counts quotes <strong className="font-medium text-zinc-700 dark:text-zinc-300">created</strong> in the reporting period
          (except All time = ever). Follow up on new enquiries and replies waiting on the customer.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardMetricLink
            href="/admin/quotes?status=Submitted"
            label="Awaiting your price"
            value={loading || quoteStats == null ? "—" : quoteStats.submitted}
            footer="Open submitted →"
            preset="attentionPending"
          />
          <DashboardMetricLink
            href="/admin/quotes?status=Quoted"
            label="Quoted — customer decision"
            value={loading || quoteStats == null ? "—" : quoteStats.quoted}
            footer="Follow up →"
            preset="periodProgress"
          />
          <DashboardMetricLink
            href="/admin/quotes?status=Accepted"
            label="Accepted"
            value={loading || quoteStats == null ? "—" : quoteStats.accepted}
            footer="Won jobs →"
            preset="periodDone"
          />
          <DashboardMetricLink
            href="/admin/quotes"
            label="All quote requests"
            value={loading || quoteStats == null ? "—" : quoteStats.total}
            footer="Full list →"
            preset="overview"
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="fleet-heading">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="fleet-heading" className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              Cars in the workshop
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Distinct vehicles with a <strong className="font-medium text-zinc-700 dark:text-zinc-300">booking service date</strong>{" "}
              or <strong className="font-medium text-zinc-700 dark:text-zinc-300">quote created date</strong> in the reporting period
              (All time = entire history).
            </p>
          </div>
          <Link
            href="/admin/cars"
            className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400"
          >
            Open fleet →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="card border-indigo-200/60 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/25">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Unique vehicles
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-950 dark:text-indigo-100">
              {loading || !fleet ? "—" : fleet.stats.distinctUnion}
            </p>
            <p className="mt-0.5 text-[11px] text-indigo-900/80 dark:text-indigo-300/90">Total distinct fleet</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">From bookings</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {loading || !fleet ? "—" : fleet.stats.distinctFromBookings}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">From quotes</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {loading || !fleet ? "—" : fleet.stats.distinctFromQuotes}
            </p>
          </div>
        </div>
        {!loading && stats && !fleet ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Fleet summary unavailable (optional).</p>
        ) : null}
      </section>

      <WorkshopInsightsPanel
        insights={stats?.insights}
        todayYmd={todayParam}
        loading={loading}
        scopeLabel={workshopInsightsScopeLabel}
      />

      <section className="space-y-3" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Link href="/admin/services" className="card block p-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            Manage services →
          </Link>
          <Link href="/admin/slots" className="card block p-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            Manage slots →
          </Link>
          <Link href="/admin/bookings" className="card block p-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            View bookings →
          </Link>
          <Link href="/admin/customers" className="card block p-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            Customers →
          </Link>
          <Link href="/admin/cars" className="card block p-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            Cars / fleet →
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="card block p-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Open customer site →
          </Link>
        </div>
      </section>

      <div className="space-y-10">
        <section className="space-y-3" aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            Overview (all time &amp; today)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardMetricLink
              href="/admin/bookings"
              label="Total bookings"
              value={loading || !stats ? "—" : stats.totalBookings}
              footer="All statuses, ever →"
              preset="overview"
            />
            <DashboardMetricLink
              href="/admin/bookings?status=Completed"
              label="Completed (all time)"
              value={loading || !stats ? "—" : stats.completedAllTime}
              footer="Finished jobs →"
              preset="overviewCompleted"
            />
            <DashboardMetricLink
              href={bookingsTodayHref}
              label="Scheduled today"
              value={loading || !stats ? "—" : stats.todaysBookings}
              footer={`Service date ${todayParam} →`}
              preset="overview"
            />
            <DashboardMetricLink
              href="/admin/services"
              label="Services listed"
              value={loading || !stats ? "—" : stats.activeServices}
              footer="Manage →"
              preset="overview"
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="period-heading">
          <div>
            <h2 id="period-heading" className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              Jobs by service date
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Same reporting period as at the top. Jump to bookings filtered by status.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardMetricLink
              href={adminBookingsHref(period, "Completed")}
              label="Done (completed)"
              value={loading || !stats ? "—" : stats.period.completed}
              footer="View in bookings →"
              preset="periodDone"
            />
            <DashboardMetricLink
              href={adminBookingsHref(period, "Pending")}
              label="Pending"
              value={loading || !stats ? "—" : stats.period.pending}
              footer="View →"
              preset="periodPending"
            />
            <DashboardMetricLink
              href={adminBookingsHref(period, "In Progress")}
              label="In progress"
              value={loading || !stats ? "—" : stats.period.inProgress}
              footer="View →"
              preset="periodProgress"
            />
            <DashboardMetricLink
              href={adminBookingsHref(period)}
              label="Total in range"
              value={loading || !stats ? "—" : stats.period.totalInRange}
              footer="All statuses →"
              preset="periodTotal"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
