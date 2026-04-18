"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

type PeriodType = "day" | "week" | "month";

type DashboardStats = {
  totalBookings: number;
  todaysBookings: number;
  activeServices: number;
  completedAllTime: number;
  today?: string;
  period: {
    type: PeriodType;
    ref: string;
    rangeStart: string;
    rangeEnd: string;
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

const periodLabels: Record<PeriodType, string> = {
  day: "Day",
  week: "Week (Mon–Sun)",
  month: "Month (calendar)",
};

export default function AdminDashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [refDate, setRefDate] = useState(() => ymdLocal());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi.get<DashboardStats>("/dashboard", {
        params: { period: periodType, ref: refDate },
      });
      setStats(res.data);
    } catch {
      setError(
        "Could not load dashboard. Check that the API is running (npm run dev from the repo root) and you are still logged in."
      );
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [periodType, refDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayParam = stats?.today ?? ymdLocal();
  const bookingsTodayHref = `/admin/bookings?dateFrom=${encodeURIComponent(todayParam)}&dateTo=${encodeURIComponent(todayParam)}`;
  const period = stats?.period;
  const bookingsInPeriodHref =
    period && period.rangeStart && period.rangeEnd
      ? `/admin/bookings?dateFrom=${encodeURIComponent(period.rangeStart)}&dateTo=${encodeURIComponent(period.rangeEnd)}`
      : "/admin/bookings";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="card mb-6 space-y-4 p-4">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Track by service date</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Bookings are counted by their <strong>scheduled service date</strong> (not created date). Choose day, week, or
          month, then pick a date inside the period you care about (for week/month, any day in that week/month works).
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Period</label>
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Reference date</label>
            <input
              type="date"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={refDate}
              onChange={(e) => setRefDate(e.target.value)}
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {periodLabels[periodType]}
            {period && (
              <>
                : <span className="font-mono">{period.rangeStart}</span> →{" "}
                <span className="font-mono">{period.rangeEnd}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">Overview (all time &amp; today)</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/bookings"
          className="card block p-5 transition hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
        >
          <p className="text-sm text-gray-500 dark:text-zinc-400">Total bookings</p>
          <p className="text-3xl font-bold">{loading || !stats ? "—" : stats.totalBookings}</p>
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-400">All statuses, ever →</p>
        </Link>
        <Link
          href="/admin/bookings?status=Completed"
          className="card block p-5 transition hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
        >
          <p className="text-sm text-gray-500 dark:text-zinc-400">Completed (all time)</p>
          <p className="text-3xl font-bold">{loading || !stats ? "—" : stats.completedAllTime}</p>
          <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-400">Finished jobs →</p>
        </Link>
        <Link
          href={bookingsTodayHref}
          className="card block p-5 transition hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
        >
          <p className="text-sm text-gray-500 dark:text-zinc-400">Scheduled today</p>
          <p className="text-3xl font-bold">{loading || !stats ? "—" : stats.todaysBookings}</p>
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-400">
            Service date {todayParam} →
          </p>
        </Link>
        <Link
          href="/admin/services"
          className="card block p-5 transition hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
        >
          <p className="text-sm text-gray-500 dark:text-zinc-400">Services listed</p>
          <p className="text-3xl font-bold">{loading || !stats ? "—" : stats.activeServices}</p>
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-400">Manage →</p>
        </Link>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
        Selected period — jobs on the calendar
      </h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        <strong>Done</strong> = status Completed · <strong>Pending</strong> = not started · <strong>In progress</strong> =
        being worked on. Totals use the service date window shown above.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href={
            period
              ? `/admin/bookings?dateFrom=${encodeURIComponent(period.rangeStart)}&dateTo=${encodeURIComponent(period.rangeEnd)}&status=Completed`
              : "/admin/bookings"
          }
          className="card block border border-emerald-200/80 p-5 transition hover:ring-2 hover:ring-emerald-400/60 dark:border-emerald-900/40"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Done (completed)</p>
          <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-300">
            {loading || !stats ? "—" : stats.period.completed}
          </p>
          <p className="mt-2 text-xs text-emerald-900/80 dark:text-emerald-400/90">View in bookings →</p>
        </Link>
        <Link
          href={
            period
              ? `/admin/bookings?dateFrom=${encodeURIComponent(period.rangeStart)}&dateTo=${encodeURIComponent(period.rangeEnd)}&status=Pending`
              : "/admin/bookings"
          }
          className="card block border border-amber-200/80 p-5 transition hover:ring-2 hover:ring-amber-400/60 dark:border-amber-900/40"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Pending</p>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-200">
            {loading || !stats ? "—" : stats.period.pending}
          </p>
          <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-300/90">View →</p>
        </Link>
        <Link
          href={
            period
              ? `/admin/bookings?dateFrom=${encodeURIComponent(period.rangeStart)}&dateTo=${encodeURIComponent(period.rangeEnd)}&status=${encodeURIComponent("In Progress")}`
              : "/admin/bookings"
          }
          className="card block border border-blue-200/80 p-5 transition hover:ring-2 hover:ring-blue-400/60 dark:border-blue-900/40"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">In progress</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-200">
            {loading || !stats ? "—" : stats.period.inProgress}
          </p>
          <p className="mt-2 text-xs text-blue-900/80 dark:text-blue-300/90">View →</p>
        </Link>
        <Link
          href={bookingsInPeriodHref}
          className="card block p-5 transition hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Total in range</p>
          <p className="text-3xl font-bold">{loading || !stats ? "—" : stats.period.totalInRange}</p>
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-400">All statuses →</p>
        </Link>
        <div className="card flex flex-col justify-center p-5 text-sm text-zinc-600 dark:text-zinc-400">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">Tip</p>
          <p className="mt-1 text-xs">
            Switch <strong>Daily</strong> for today’s throughput, <strong>Weekly</strong> for the Mon–Sun week,{" "}
            <strong>Monthly</strong> for the full calendar month.
          </p>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="card block p-4 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Open customer site →
        </Link>
      </div>
    </div>
  );
}
