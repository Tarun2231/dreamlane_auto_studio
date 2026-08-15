"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AdminSearchButton, requestOpenAdminCommandPalette } from "@/components/AdminCommandPalette";
import AdminThemeToggle from "@/components/AdminThemeToggle";
import AutomotiveBayBoard from "@/components/admin/AutomotiveBayBoard";
import DashboardPeriodControls, { type DashboardPeriodType } from "@/components/admin/DashboardPeriodControls";
import WorkshopFinancePanel from "@/components/admin/WorkshopFinancePanel";
import WorkshopInsightsPanel, { type WorkshopInsights } from "@/components/admin/WorkshopInsightsPanel";
import { adminApi } from "@/lib/api";
import type { AdminNotificationItem, AdminQuoteStats, FleetSnapshot, ShopSalesSnapshot } from "@/lib/types";

type DashboardStats = {
  totalBookings: number;
  todaysBookings: number;
  activeServices: number;
  completedAllTime: number;
  today?: string;
  shopSales?: ShopSalesSnapshot;
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

type SupportStatus = "online" | "offline" | "break";

function formatInrDash(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

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

function formatNotifTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [periodType, setPeriodType] = useState<DashboardPeriodType>("day");
  const [refDate, setRefDate] = useState(() => ymdLocal());
  const [rangeFrom, setRangeFrom] = useState(() => startOfMonthYmd());
  const [rangeTo, setRangeTo] = useState(() => endOfMonthYmd());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fleet, setFleet] = useState<FleetSnapshot | null>(null);
  const [quoteStats, setQuoteStats] = useState<AdminQuoteStats | null>(null);
  const [supportStatus, setSupportStatus] = useState<SupportStatus>("online");
  const [statusBusy, setStatusBusy] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

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
      try {
        const presence = await adminApi.get<{ supportStatus?: string }>("/site-presence");
        const s = String(presence.data?.supportStatus || "");
        setSupportStatus(s === "offline" || s === "break" ? s : "online");
      } catch {
        setSupportStatus("online");
      }
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

  const loadNotifications = useCallback(async () => {
    try {
      const res = await adminApi.get<{ items?: AdminNotificationItem[] }>("/notifications", { params: { limit: 50 } });
      setNotifications(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {
      // keep dashboard functional even if notifications fail
    }
  }, []);

  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("adminNotificationsReadIds");
      const parsed = raw ? JSON.parse(raw) : [];
      setReadNotificationIds(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
    } catch {
      setReadNotificationIds([]);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const t = setInterval(() => {
      void loadNotifications();
    }, 20000);
    return () => clearInterval(t);
  }, [loadNotifications]);

  useEffect(() => {
    if (!loading && stats) setLastLoadedAt(new Date());
  }, [loading, stats]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onPointerDown = (ev: PointerEvent) => {
      if (!actionsRef.current) return;
      if (actionsRef.current.contains(ev.target as Node)) return;
      setActionsOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [actionsOpen]);

  useEffect(() => {
    if (!notifOpen) return;
    const onPointerDown = (ev: PointerEvent) => {
      if (!notifRef.current) return;
      if (notifRef.current.contains(ev.target as Node)) return;
      setNotifOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [notifOpen]);

  const updateSupportStatus = useCallback(async (next: SupportStatus) => {
    try {
      setStatusBusy(true);
      await adminApi.put("/site-presence", { supportStatus: next });
      setSupportStatus(next);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setError(ax?.response?.data?.message ?? "Could not update support status.");
    } finally {
      setStatusBusy(false);
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin/login";
    } else {
      router.replace("/admin/login");
    }
  }, [router]);

  const unreadCount = notifications.reduce((acc, n) => (readNotificationIds.includes(n.id) ? acc : acc + 1), 0);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [id, ...prev].slice(0, 500);
      if (typeof window !== "undefined") {
        localStorage.setItem("adminNotificationsReadIds", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const markNotificationsRead = useCallback(() => {
    const allIds = Array.from(new Set(notifications.map((n) => n.id)));
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...allIds, ...prev])).slice(0, 500);
      if (typeof window !== "undefined") {
        localStorage.setItem("adminNotificationsReadIds", JSON.stringify(next));
      }
      return next;
    });
  }, [notifications]);

  useEffect(() => {
    if (notifications.length === 0) return;
    setReadNotificationIds((prev) => {
      const keep = new Set(notifications.map((n) => n.id));
      const next = prev.filter((id) => keep.has(id));
      if (next.length !== prev.length && typeof window !== "undefined") {
        localStorage.setItem("adminNotificationsReadIds", JSON.stringify(next));
      }
      return next;
    });
  }, [notifications]);

  const hasUnread = unreadCount > 0;

  const unreadPulseClass = hasUnread ? "ring-2 ring-rose-200 dark:ring-rose-900/50" : "";

  const unreadBorderClass = hasUnread
    ? "border-rose-300 dark:border-rose-700"
    : "border-zinc-200 dark:border-zinc-600";

  const unreadBellClass = hasUnread
    ? "text-rose-700 dark:text-rose-300"
    : "";

  const markAndCloseNotifications = useCallback(
    (id: string) => {
      markNotificationRead(id);
      setNotifOpen(false);
    },
    [markNotificationRead]
  );

  const supportStatusUi = {
    online: {
      label: "Online",
      hint: "Customers see support online",
      pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    break: {
      label: "Break",
      hint: "Show On break to customers",
      pill: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    offline: {
      label: "Offline",
      hint: "Hide live support availability",
      pill: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
  } as const;

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
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className={`relative inline-flex min-h-11 items-center justify-center rounded-2xl border bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow active:scale-[0.98] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 ${unreadBorderClass} ${unreadBellClass} ${unreadPulseClass}`}
                aria-haspopup="menu"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                  <path d="M14.857 17H9.143A3.143 3.143 0 0 1 6 13.857V10a6 6 0 1 1 12 0v3.857A3.143 3.143 0 0 1 14.857 17Z" />
                  <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
                </svg>
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>
              {notifOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-[22rem] max-w-[92vw] overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Notifications</p>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-blue-700 hover:underline dark:text-blue-400"
                      onClick={() => {
                        markNotificationsRead();
                        void loadNotifications();
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 space-y-1 overflow-y-auto pr-0.5">
                    {notifications.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((n) => {
                        const isUnread = !readNotificationIds.includes(n.id);
                        return (
                          <Link
                            key={n.id}
                            href={n.href}
                            className={`block rounded-xl border px-3 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                              isUnread
                                ? "border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20"
                                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                            }`}
                            onClick={() => markAndCloseNotifications(n.id)}
                          >
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">{n.message}</p>
                            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">{formatNotifTime(n.at)}</p>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border bg-white px-3.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 hover:shadow active:scale-[0.98] dark:bg-zinc-800 dark:text-zinc-100 ${
                  supportStatus === "online"
                    ? "border-emerald-300 ring-2 ring-emerald-200/60 dark:border-emerald-700 dark:ring-emerald-900/40"
                    : supportStatus === "break"
                      ? "border-amber-300 ring-2 ring-amber-200/60 dark:border-amber-700 dark:ring-amber-900/40"
                      : "border-zinc-300 ring-2 ring-zinc-200/60 dark:border-zinc-600 dark:ring-zinc-800/60"
                }`}
                aria-haspopup="menu"
                aria-expanded={actionsOpen}
                onClick={() => setActionsOpen((v) => !v)}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    supportStatus === "online"
                      ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                      : supportStatus === "break"
                        ? "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.2)]"
                        : "bg-zinc-500 shadow-[0_0_0_3px_rgba(113,113,122,0.2)]"
                  }`}
                  aria-hidden
                />
                Actions
                <svg className={`h-4 w-4 transition ${actionsOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              {actionsOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
                  <button
                    type="button"
                    className="group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setActionsOpen(false);
                      void load();
                    }}
                    disabled={loading}
                  >
                    <span className="font-medium">Refresh</span>
                    <span className="text-xs text-zinc-500 transition group-hover:rotate-180 dark:text-zinc-400">
                      {loading ? "Loading..." : "↻"}
                    </span>
                  </button>

                  <div className="mt-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                    <div className="mb-1 flex items-center justify-between px-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Support status</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(["online", "break", "offline"] as const).map((s) => {
                        const active = supportStatus === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                              active
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            }`}
                            onClick={() => void updateSupportStatus(s)}
                            disabled={statusBusy}
                          >
                            {supportStatusUi[s].label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 px-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">{supportStatusUi[supportStatus].hint}</p>
                  </div>

                  <div className="mt-2 space-y-1">
                    <Link
                      href="/admin/enquiries"
                      className="block rounded-lg bg-zinc-100 px-2.5 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      onClick={() => setActionsOpen(false)}
                    >
                      Open enquiries
                    </Link>
                    <Link
                      href="/admin/quotes"
                      className="block rounded-lg bg-zinc-100 px-2.5 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      onClick={() => setActionsOpen(false)}
                    >
                      Open quotes
                    </Link>
                    <Link
                      href="/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/35 dark:text-blue-300 dark:hover:bg-blue-950/55"
                      onClick={() => setActionsOpen(false)}
                    >
                      View live website ↗
                    </Link>
                  </div>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    onClick={logout}
                  >
                    <span className="font-medium">Log out</span>
                    <span aria-hidden>↪</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {/* 5-Stage Automotive Bay Kanban & Interactive Lift Floorplan */}
      <AutomotiveBayBoard />

      <WorkshopFinancePanel
        finance={stats?.insights?.finance}
        revenueFallback={stats?.insights?.revenueCompletedInr}
        paymentMetrics={stats?.insights?.paymentMetrics}
        loading={loading}
        periodHint={financePeriodHint}
      />

      <section className="card p-5 sm:p-6" aria-labelledby="shop-sales-heading">
        <h2 id="shop-sales-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Product shop sales
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{financePeriodHint}</p>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-500">
          Separate from <strong className="font-medium text-zinc-700 dark:text-zinc-300">service job</strong> income. Uses product
          order dates in this period; cancelled orders are excluded. Split below is by <strong className="font-medium">line item</strong>{" "}
          (machines vs accessories vs other).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/70 px-4 py-3 dark:border-cyan-900/50 dark:bg-cyan-950/30">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900 dark:text-cyan-400">Shop revenue (total)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-cyan-950 dark:text-cyan-50">
              {loading ? "—" : formatInrDash(stats?.shopSales?.revenueInr ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/70 px-4 py-3 dark:border-cyan-900/50 dark:bg-cyan-950/30">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-900 dark:text-cyan-400">Orders</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-cyan-950 dark:text-cyan-50">
              {loading ? "—" : stats?.shopSales?.ordersCount ?? 0}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-2 rounded-xl border border-cyan-200/80 bg-cyan-50/40 px-4 py-3 text-sm dark:border-cyan-900/40 dark:bg-cyan-950/20">
            <Link href="/admin/shop/orders" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
              View shop orders →
            </Link>
            <Link href="/admin/shop" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
              Manage products →
            </Link>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-4 py-3 dark:border-indigo-900/45 dark:bg-indigo-950/25">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-900 dark:text-indigo-400">Machines</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-indigo-950 dark:text-indigo-50">
              {loading ? "—" : formatInrDash(stats?.shopSales?.machinesRevenueInr ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-violet-200/80 bg-violet-50/60 px-4 py-3 dark:border-violet-900/45 dark:bg-violet-950/25">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-900 dark:text-violet-400">Accessories</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-violet-950 dark:text-violet-50">
              {loading ? "—" : formatInrDash(stats?.shopSales?.accessoriesRevenueInr ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">Other</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {loading ? "—" : formatInrDash(stats?.shopSales?.otherRevenueInr ?? 0)}
            </p>
          </div>
        </div>
      </section>

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <DashboardMetricLink
            href="/admin/quotes?status=Submitted"
            label="Awaiting your price"
            value={loading || quoteStats == null ? "—" : quoteStats.submitted}
            footer="Open submitted →"
            preset="attentionPending"
          />
          <DashboardMetricLink
            href="/admin/quotes?status=Pending"
            label="In conversation"
            value={loading || quoteStats == null ? "—" : quoteStats.pending}
            footer="Active chats →"
            preset="periodProgress"
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
