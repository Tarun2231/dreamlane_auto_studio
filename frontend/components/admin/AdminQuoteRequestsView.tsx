"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminVehicleSummary from "@/components/admin/AdminVehicleSummary";
import QuoteThreadPanel from "@/components/QuoteThreadPanel";
import { adminApi } from "@/lib/api";
import { AdminNotificationItem, QuoteRequest, Service } from "@/lib/types";

function adminServiceTitle(q: QuoteRequest): string {
  if (q.serviceNameSnapshot) return q.serviceNameSnapshot;
  const sid = q.serviceId;
  if (sid && typeof sid === "object" && "name" in sid) return (sid as Service).name;
  return "";
}

function inboxPreviewLine(q: QuoteRequest, pageKind: "quotation" | "enquiry"): string {
  if (pageKind === "enquiry" && q.enquiryTopic?.trim()) return q.enquiryTopic.trim();
  return adminServiceTitle(q) || q.serviceDescription || "—";
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

/** Short relative time for inbox activity (uses thread bump or fallback). */
function formatRelativeActivity(iso?: string) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    if (!Number.isFinite(diffMs)) return null;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 48) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

function statusPillClass(status: string) {
  switch (status) {
    case "Submitted":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100";
    case "Pending":
      return "bg-sky-100 text-sky-950 dark:bg-sky-950/45 dark:text-sky-100";
    case "Quoted":
      return "bg-violet-100 text-violet-950 dark:bg-violet-950/40 dark:text-violet-100";
    case "Accepted":
      return "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100";
    case "Declined":
      return "bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100";
    case "Closed":
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

const STATUS_ORDER = ["Submitted", "Pending", "Quoted", "Accepted", "Declined", "Closed"] as const;

const STATUSES = ["", ...STATUS_ORDER] as const;

const STATUS_FROM_URL = new Set<string>(STATUS_ORDER);

function statusSelectLabel(s: string) {
  if (s === "Pending") return "Pending (in conversation)";
  return s;
}

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdAddDays(ymd: string, delta: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + delta);
  return ymdLocal(dt);
}

export type AdminQuoteRequestsViewProps = {
  pageKind: "quotation" | "enquiry";
};

export default function AdminQuoteRequestsView({ pageKind }: AdminQuoteRequestsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [list, setList] = useState<QuoteRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selected, setSelected] = useState<QuoteRequest | null>(null);
  const [quotedAmount, setQuotedAmount] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [statusEdit, setStatusEdit] = useState<string>("Submitted");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inboxQuery, setInboxQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "messages">("recent");
  const [onlyWithMessages, setOnlyWithMessages] = useState(false);
  const [timePreset, setTimePreset] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [dateFrom, setDateFrom] = useState(() => ymdAddDays(ymdLocal(), -6));
  const [dateTo, setDateTo] = useState(() => ymdLocal());
  const [toastItems, setToastItems] = useState<AdminNotificationItem[]>([]);
  const [knownNotifIds, setKnownNotifIds] = useState<Set<string>>(new Set());

  const isEnquiry = pageKind === "enquiry";

  useEffect(() => {
    const s = searchParams.get("status");
    const t = searchParams.get("time");
    const df = searchParams.get("dateFrom");
    const dt = searchParams.get("dateTo");
    if (s && STATUS_FROM_URL.has(s)) {
      setStatusFilter(s);
    } else if (!s) {
      setStatusFilter("");
    }
    if (t === "all" || t === "today" || t === "7d" || t === "30d" || t === "custom") {
      setTimePreset(t);
    }
    if (df && /^\d{4}-\d{2}-\d{2}$/.test(df)) setDateFrom(df);
    if (dt && /^\d{4}-\d{2}-\d{2}$/.test(dt)) setDateTo(dt);
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (statusFilter) next.set("status", statusFilter);
    if (timePreset !== "all") next.set("time", timePreset);
    if (timePreset === "custom" && dateFrom && dateTo && dateFrom <= dateTo) {
      next.set("dateFrom", dateFrom);
      next.set("dateTo", dateTo);
    }
    const nextQs = next.toString();
    const curQs = searchParams.toString();
    if (nextQs === curQs) return;
    router.replace(nextQs ? `${pathname}?${nextQs}` : pathname);
  }, [statusFilter, timePreset, dateFrom, dateTo, pathname, router, searchParams]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setErr("Could not copy — try again or copy manually.");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params: Record<string, string> = { kind: pageKind };
      if (statusFilter) params.status = statusFilter;
      if (timePreset !== "all") {
        const today = ymdLocal();
        if (timePreset === "today") {
          params.dateFrom = today;
          params.dateTo = today;
        } else if (timePreset === "7d") {
          params.dateFrom = ymdAddDays(today, -6);
          params.dateTo = today;
        } else if (timePreset === "30d") {
          params.dateFrom = ymdAddDays(today, -29);
          params.dateTo = today;
        } else if (timePreset === "custom" && dateFrom && dateTo && dateFrom <= dateTo) {
          params.dateFrom = dateFrom;
          params.dateTo = dateTo;
        }
      }
      const res = await adminApi.get<QuoteRequest[]>("/quote-requests", { params });
      setList(res.data);
    } catch {
      setErr(isEnquiry ? "Could not load enquiry requests." : "Could not load quote requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pageKind, isEnquiry, timePreset, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      void load();
    }, 20000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  useEffect(() => {
    let disposed = false;
    const poll = async () => {
      try {
        const res = await adminApi.get<{ items?: AdminNotificationItem[] }>("/notifications", { params: { limit: 30 } });
        if (disposed) return;
        const all = Array.isArray(res.data?.items) ? res.data.items : [];
        const relevant = all.filter((n) =>
          isEnquiry ? n.kind === "enquiry" || n.kind === "enquiry-message" : n.kind === "quotation" || n.kind === "quotation-message"
        );
        setKnownNotifIds((prev) => {
          if (prev.size === 0) return new Set(relevant.map((n) => n.id));
          const fresh = relevant.filter((n) => !prev.has(n.id));
          if (fresh.length > 0) {
            setToastItems((cur) => [...fresh.slice(0, 3), ...cur].slice(0, 5));
            void load();
          }
          const next = new Set(prev);
          for (const n of relevant) next.add(n.id);
          return next;
        });
      } catch {
        // ignore notification polling errors
      }
    };
    void poll();
    const t = setInterval(() => {
      void poll();
    }, 8000);
    return () => {
      disposed = true;
      clearInterval(t);
    };
  }, [isEnquiry, load]);

  const mergeThreadIntoSelected = useCallback((q: QuoteRequest) => {
    setList((prev) =>
      prev.map((item) =>
        item._id === q._id
          ? {
              ...item,
              status: q.status,
              messageCount: Array.isArray(q.messages) ? q.messages.length : item.messageCount,
              hasUnreadCustomerMessage:
                q.status !== "Closed" &&
                Array.isArray(q.messages) &&
                q.messages.length > 0 &&
                q.messages[q.messages.length - 1]?.role === "customer",
              lastThreadActivityAt: q.lastThreadActivityAt || item.lastThreadActivityAt,
              updatedAt: q.updatedAt || item.updatedAt,
            }
          : item
      )
    );
    if (q.status) setStatusEdit(q.status);
    setSelected((prev) => {
      if (!prev || prev._id !== q._id) return q;
      return {
        ...prev,
        messages: q.messages,
        lastThreadActivityAt: q.lastThreadActivityAt,
        status: q.status,
        updatedAt: q.updatedAt,
      };
    });
  }, []);

  const open = async (q: QuoteRequest) => {
    setQuotedAmount(q.quotedAmount != null && q.quotedAmount > 0 ? String(q.quotedAmount) : "");
    setQuoteNotes(q.quoteNotes || "");
    setStatusEdit(q.status);
    try {
      const res = await adminApi.get<QuoteRequest>(`/quote-request/${q._id}`);
      setSelected(res.data);
    } catch {
      setSelected(q);
    }
  };

  const toggleOpen = (q: QuoteRequest) => {
    if (selected?._id === q._id) {
      setSelected(null);
      return;
    }
    void open(q);
  };

  const visibleList = useMemo(() => {
    const q = inboxQuery.trim().toLowerCase();
    let next = list;
    if (onlyWithMessages) {
      next = next.filter((item) => (item.messageCount ?? item.messages?.length ?? 0) > 0);
    }
    if (q) {
      next = next.filter((item) => {
        const hay = [
          item.customerName,
          item.email,
          item.phone,
          item.enquiryTopic,
          item.serviceDescription,
          adminServiceTitle(item),
          item.carMake,
          item.carModel,
          item.vehicleType,
          item._id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const getTs = (item: QuoteRequest) => {
      const source = item.lastThreadActivityAt || item.updatedAt || item.createdAt;
      const ts = source ? new Date(source).getTime() : 0;
      return Number.isFinite(ts) ? ts : 0;
    };
    const sorted = [...next];
    if (sortBy === "oldest") {
      sorted.sort((a, b) => getTs(a) - getTs(b));
    } else if (sortBy === "messages") {
      sorted.sort((a, b) => (b.messageCount ?? b.messages?.length ?? 0) - (a.messageCount ?? a.messages?.length ?? 0));
    } else {
      sorted.sort((a, b) => getTs(b) - getTs(a));
    }
    return sorted;
  }, [list, inboxQuery, onlyWithMessages, sortBy]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<(typeof STATUS_ORDER)[number], number>;
    for (const item of list) {
      if (item.status in counts) counts[item.status as (typeof STATUS_ORDER)[number]] += 1;
    }
    return counts;
  }, [list]);

  const listCounts = useMemo(() => {
    const total = list.length;
    const pending = list.filter((x) => x.status === "Pending").length;
    const quoted = list.filter((x) => x.status === "Quoted").length;
    const activeThreads = list.filter((x) => (x.messageCount ?? x.messages?.length ?? 0) > 0).length;
    return { total, pending, quoted, activeThreads };
  }, [list]);

  const selectedActivityLabel = useMemo(() => {
    if (!selected) return null;
    return formatRelativeActivity(selected.lastThreadActivityAt || selected.updatedAt || selected.createdAt);
  }, [selected]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const n = quotedAmount.trim() ? Number(quotedAmount) : undefined;
      const res = await adminApi.put<QuoteRequest>(`/quote-request/${selected._id}`, {
        quotedAmount: n,
        quoteNotes: quoteNotes.trim(),
        status: statusEdit,
      });
      setSelected(res.data);
      setList((prev) => prev.map((x) => (x._id === res.data._id ? { ...res.data, messageCount: x.messageCount } : x)));
      setMsg("Saved.");
      setSelected(null);
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      setErr(er?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const sendQuoteEmail = async () => {
    if (!selected) return;
    const n = quotedAmount.trim() ? Number(quotedAmount) : NaN;
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Enter a valid quoted amount before emailing.");
      return;
    }
    setEmailing(true);
    setMsg(null);
    setErr(null);
    try {
      await adminApi.put<QuoteRequest>(`/quote-request/${selected._id}`, {
        quotedAmount: n,
        quoteNotes: quoteNotes.trim(),
        status: statusEdit,
      });
      const res = await adminApi.post<{ quote: QuoteRequest }>(`/quote-request/${selected._id}/email-quote`);
      setSelected(res.data.quote);
      setList((prev) => prev.map((x) => (x._id === res.data.quote._id ? { ...res.data.quote, messageCount: x.messageCount } : x)));
      setMsg("Quotation emailed to customer.");
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      setErr(er?.response?.data?.message || "Email failed.");
    } finally {
      setEmailing(false);
    }
  };

  const closeRequest = async () => {
    if (!selected) return;
    setClosing(true);
    setMsg(null);
    setErr(null);
    try {
      const n = quotedAmount.trim() ? Number(quotedAmount) : undefined;
      const res = await adminApi.put<QuoteRequest>(`/quote-request/${selected._id}`, {
        quotedAmount: n,
        quoteNotes: quoteNotes.trim(),
        status: "Closed",
      });
      setSelected(res.data);
      setStatusEdit("Closed");
      setList((prev) => prev.map((x) => (x._id === res.data._id ? { ...res.data, messageCount: x.messageCount } : x)));
      setMsg("Request closed.");
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      setErr(er?.response?.data?.message || "Close failed.");
    } finally {
      setClosing(false);
    }
  };

  const title = isEnquiry ? "Enquiry requests" : "Quotation requests";
  const description = isEnquiry
    ? "Homepage and quick enquiries land here. Chat in the thread, then add a price and email a formal quotation when ready. Customers use Track quote with their ID and email."
    : "Full quotation requests from Get quote — vehicle lists and packages. Chat in each thread, set a price and notes, then email the quotation. Customers reply on Track quote and accept or decline on the website.";
  const detailTitle = isEnquiry ? "Enquiry detail" : "Quote detail";
  const emptyHint = isEnquiry
    ? "No enquiries for this filter."
    : "No requests for this filter.";
  const selectHint = isEnquiry
    ? "Select an enquiry from the list to view details and reply."
    : "Select a request from the list to view details and send a quotation.";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {toastItems.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-4 z-40 flex w-[min(24rem,90vw)] flex-col gap-2">
          {toastItems.map((t) => (
            <div key={t.id} className="pointer-events-auto rounded-xl border border-blue-200 bg-white/95 p-3 shadow-lg ring-1 ring-blue-100 dark:border-blue-900/50 dark:bg-zinc-900/95 dark:ring-blue-900/40">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">{t.message}</p>
              <div className="mt-2 flex items-center justify-between">
                <Link href={t.href} className="text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-400">
                  Open
                </Link>
                <button
                  type="button"
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  onClick={() => setToastItems((cur) => cur.filter((x) => x.id !== t.id))}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <header className="flex flex-col gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          {!isEnquiry ? (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              Vehicle details are shown in a structured card. See all workshop vehicles on{" "}
              <Link href="/admin/cars" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                Cars
              </Link>
              . Quick homepage enquiries are on{" "}
              <Link href="/admin/enquiries" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                Enquiries
              </Link>
              .
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              Structured package quotes from customers are on{" "}
              <Link href="/admin/quotes" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                Quotes
              </Link>
              .
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-zinc-300 bg-white p-1 dark:border-zinc-600 dark:bg-zinc-800">
            <div className="flex flex-wrap gap-1">
              {([
                ["all", "All time"],
                ["today", "Today"],
                ["7d", "Last 7d"],
                ["30d", "Last 30d"],
                ["custom", "Custom"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTimePreset(id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    timePreset === id
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {timePreset === "custom" ? (
            <div className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
              />
              <span className="text-xs text-zinc-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
              />
            </div>
          ) : null}
          <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-400 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
            />
            Auto refresh (20s)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Status</span>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s || "all"} value={s}>
                  {s ? statusSelectLabel(s) : "All"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      </header>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          {msg}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
          <div className="grid gap-3">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
            <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/85 p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/65">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Total</p>
              <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{listCounts.total}</p>
            </div>
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/60 p-3 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/25">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Pending</p>
              <p className="mt-1 text-xl font-bold text-sky-900 dark:text-sky-100">{listCounts.pending}</p>
            </div>
            <div className="rounded-2xl border border-violet-200/80 bg-violet-50/60 p-3 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/25">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Quoted</p>
              <p className="mt-1 text-xl font-bold text-violet-900 dark:text-violet-100">{listCounts.quoted}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Active threads</p>
              <p className="mt-1 text-xl font-bold text-emerald-900 dark:text-emerald-100">{listCounts.activeThreads}</p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:items-stretch">
          <aside className="flex min-h-0 flex-col">
            <div className="mb-3 rounded-2xl border border-zinc-200/90 bg-white/80 p-2.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
              <label htmlFor="admin-inbox-search" className="sr-only">
                Search inbox
              </label>
              <input
                id="admin-inbox-search"
                type="search"
                placeholder="Search name, topic, phone, ID…"
                value={inboxQuery}
                onChange={(e) => setInboxQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter("")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    statusFilter === ""
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  }`}
                >
                  All {list.length}
                </button>
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      statusFilter === s
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {s === "Pending" ? "Pending" : s} {statusCounts[s]}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="sr-only">Sort inbox</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "recent" | "oldest" | "messages")}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="recent">Sort: Most recent</option>
                    <option value="oldest">Sort: Oldest first</option>
                    <option value="messages">Sort: Most messages</option>
                  </select>
                </label>
                <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={onlyWithMessages}
                    onChange={(e) => setOnlyWithMessages(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-400 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  With messages only
                </label>
              </div>
            </div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Inbox</h2>
              <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                {visibleList.length} {visibleList.length === 1 ? "thread" : "threads"}
              </span>
            </div>
            <ul className="min-h-0 space-y-2 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-gutter:stable]">
              {visibleList.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
                  {inboxQuery.trim() ? "No inbox items match this search." : emptyHint}
                </li>
              ) : (
                visibleList.map((q, idx) => {
                  const activityIso = q.lastThreadActivityAt || q.updatedAt || q.createdAt;
                  const rel = formatRelativeActivity(activityIso);
                  return (
                    <li key={q._id}>
                      <button
                        type="button"
                        onClick={() => toggleOpen(q)}
                        style={{ animationDelay: `${Math.min(idx * 24, 240)}ms` }}
                        className={`group w-full animate-[fade-in_.32s_ease-out] rounded-2xl border p-4 text-left transition ${
                          selected?._id === q._id
                            ? "border-blue-500 bg-blue-50/90 shadow-md ring-2 ring-blue-500/20 dark:border-blue-500/70 dark:bg-blue-950/40 dark:ring-blue-400/20"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                              aria-hidden
                            >
                              {(q.customerName || "?").slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{q.customerName}</p>
                              <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500">{shortId(q._id)}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {(q.messageCount ?? q.messages?.length ?? 0) > 0 ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900 dark:bg-blue-950/60 dark:text-blue-100">
                                {q.messageCount ?? q.messages?.length ?? 0} msg
                              </span>
                            ) : null}
                            {q.hasUnreadCustomerMessage && q.status !== "Closed" ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                                New message
                              </span>
                            ) : null}
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(q.status)}`}>
                              {q.status}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">{inboxPreviewLine(q, pageKind)}</p>
                        {q.carMake && q.carModel ? (
                          <p className="mt-1.5 truncate text-xs text-zinc-500 dark:text-zinc-500">
                            {[q.vehicleType, q.carMake, q.carModel].filter(Boolean).join(" · ")}
                            {q.vehicleYear != null ? ` (${q.vehicleYear})` : ""}
                          </p>
                        ) : q.vehicleHint ? (
                          <p className="mt-1.5 truncate text-xs text-zinc-500">{q.vehicleHint}</p>
                        ) : null}
                        {rel ? (
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                rel === "Just now" ? "animate-pulse bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500"
                              }`}
                            />
                            Last activity · {rel}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          {selected ? (
            <div key={selected._id} className="min-w-0 animate-[fade-in_.28s_ease-out] transition-all duration-300 lg:sticky lg:top-4 lg:self-start">
              <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-md ring-1 ring-zinc-950/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/5">
                <div className="border-b border-zinc-100 bg-gradient-to-b from-zinc-50 to-zinc-50/30 px-5 py-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-900/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{detailTitle}</h2>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${statusPillClass(selected.status)}`}>
                      {statusSelectLabel(selected.status)}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{selected._id}</p>
                  {selectedActivityLabel ? (
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">Latest activity: {selectedActivityLabel}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      onClick={() => void copyText(selected._id, "id")}
                    >
                      {copiedKey === "id" ? "Copied" : "Copy request ID"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      onClick={() => {
                        const url =
                          typeof window !== "undefined" ? `${window.location.origin}/quote/track` : "/quote/track";
                        void copyText(url, "track");
                      }}
                    >
                      {copiedKey === "track" ? "Copied" : "Copy Track quote page URL"}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-500">
                    Customers use Track quote with this ID and their email.
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  <div className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Contact</p>
                      <p className="mt-2 break-all text-sm font-medium text-zinc-900 dark:text-zinc-100">{selected.email}</p>
                      <a href={`tel:${selected.phone}`} className="mt-1 inline-block text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
                        {selected.phone}
                      </a>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={`mailto:${selected.email}`}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          Email customer
                        </a>
                        <a
                          href={`tel:${selected.phone}`}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          Call customer
                        </a>
                      </div>
                    </div>
                  </div>

                  <section className="rounded-2xl border border-sky-200/70 bg-sky-50/40 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">Quick status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(["Pending", "Submitted", "Quoted"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                              statusEdit === st
                                ? "bg-sky-600 text-white dark:bg-sky-500"
                                : "border border-sky-300/80 bg-white/80 text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-zinc-800 dark:text-sky-100 dark:hover:bg-zinc-700"
                            }`}
                            onClick={() => setStatusEdit(st)}
                          >
                            {st === "Pending" ? "Pending (chatting)" : st}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="-mx-1 mb-3 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 md:hidden">
                      {(["Pending", "Submitted", "Quoted"] as const).map((st) => (
                        <button
                          key={`${st}-mobile`}
                          type="button"
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                            statusEdit === st
                              ? "bg-sky-600 text-white dark:bg-sky-500"
                              : "border border-sky-300/80 bg-white/80 text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-zinc-800 dark:text-sky-100 dark:hover:bg-zinc-700"
                          }`}
                          onClick={() => setStatusEdit(st)}
                        >
                          {st === "Pending" ? "Pending (chatting)" : st}
                        </button>
                      ))}
                    </div>
                    <div className="min-h-[280px] lg:min-h-[320px]">
                      <QuoteThreadPanel quoteId={selected._id} mode="admin" onThreadUpdate={mergeThreadIntoSelected} />
                    </div>
                  </section>

                  <div
                    className={`grid gap-4 ${
                      isEnquiry && (selected.enquiryTopic || selected.urgency || selected.preferredContact) ? "md:grid-cols-2" : ""
                    }`}
                  >
                    <AdminVehicleSummary vehicle={selected} variant="featured" />

                    {isEnquiry && (selected.enquiryTopic || selected.urgency || selected.preferredContact) ? (
                      <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Enquiry preferences</p>
                        <dl className="mt-2 space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
                          {selected.enquiryTopic ? (
                            <div className="flex flex-wrap gap-2">
                              <dt className="text-zinc-500 dark:text-zinc-400">Topic</dt>
                              <dd className="font-medium">{selected.enquiryTopic}</dd>
                            </div>
                          ) : null}
                          {selected.urgency ? (
                            <div className="flex flex-wrap gap-2">
                              <dt className="text-zinc-500 dark:text-zinc-400">Urgency</dt>
                              <dd className="capitalize">{selected.urgency}</dd>
                            </div>
                          ) : null}
                          {selected.preferredContact ? (
                            <div className="flex flex-wrap gap-2">
                              <dt className="text-zinc-500 dark:text-zinc-400">Reply via</dt>
                              <dd className="capitalize">{selected.preferredContact}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Service</p>
                    <div className="mt-2 rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/30">
                      {adminServiceTitle(selected) ? (
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{adminServiceTitle(selected)}</p>
                      ) : null}
                      {selected.serviceDescription ? (
                        <p className={`whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 ${adminServiceTitle(selected) ? "mt-2" : ""}`}>
                          {selected.serviceDescription}
                        </p>
                      ) : !adminServiceTitle(selected) ? (
                        <span className="text-sm text-zinc-500">—</span>
                      ) : null}
                    </div>
                  </div>

                  {selected.partsNotes ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Parts / notes</p>
                      <p className="mt-2 whitespace-pre-wrap rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                        {selected.partsNotes}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Formal quotation</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-zinc-500">Quoted amount (INR)</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                          value={quotedAmount}
                          onChange={(e) => setQuotedAmount(e.target.value)}
                          placeholder="e.g. 8500"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-zinc-500">Status</span>
                        <select
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                          value={statusEdit}
                          onChange={(e) => setStatusEdit(e.target.value)}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>
                              {statusSelectLabel(s)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-zinc-500">Quote notes (breakdown, validity, labour)</span>
                      <textarea
                        className="min-h-[90px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Line items, taxes, warranty notes…"
                      />
                    </label>
                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Use <strong className="font-medium text-zinc-600 dark:text-zinc-300">Pending</strong> while you and the customer are still messaging.
                      Move to <strong className="font-medium text-zinc-600 dark:text-zinc-300">Quoted</strong> after you send a price (or use Email quotation).{" "}
                      <strong className="font-medium text-zinc-600 dark:text-zinc-300">Submitted</strong> is for a new request you have not started yet.
                    </p>
                  </div>

                  <div className="hidden flex-wrap gap-2 pt-1 md:flex">
                    <button
                      type="button"
                      className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                      disabled={saving || closing}
                      onClick={() => void save()}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-amber-600 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-950 disabled:opacity-50 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100"
                      disabled={emailing || saving || closing || !quotedAmount.trim() || Number(quotedAmount) <= 0}
                      onClick={() => void sendQuoteEmail()}
                    >
                      {emailing ? "Sending…" : "Email quotation"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-rose-300 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-800 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
                      disabled={closing || saving || emailing || selected.status === "Closed"}
                      onClick={() => void closeRequest()}
                    >
                      {closing ? "Closing…" : selected.status === "Closed" ? "Closed" : "Close"}
                    </button>
                  </div>
                  <div className="sticky bottom-2 z-10 -mx-1 flex gap-2 rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-lg backdrop-blur md:hidden dark:border-zinc-700 dark:bg-zinc-900/95">
                    <button
                      type="button"
                      className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                      disabled={saving || closing}
                      onClick={() => void save()}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-amber-600 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950 disabled:opacity-50 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100"
                      disabled={emailing || saving || closing || !quotedAmount.trim() || Number(quotedAmount) <= 0}
                      onClick={() => void sendQuoteEmail()}
                    >
                      {emailing ? "Sending…" : "Email"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
                      disabled={closing || saving || emailing || selected.status === "Closed"}
                      onClick={() => void closeRequest()}
                    >
                      {closing ? "…" : "Close"}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Save amount and notes first so the emailed quotation matches what you entered. Email uses SMTP from backend/.env.
                  </p>
                  {selected.quotedAmount != null && selected.quotedAmount > 0 && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Last quoted: <span className="font-semibold tabular-nums">{formatInr(selected.quotedAmount)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden min-h-[min(360px,50vh)] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/20 lg:flex">
              {selectHint}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}
