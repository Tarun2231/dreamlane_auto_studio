"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/lib/api";
import type { CustomerDirectoryEntry } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME ?? "our garage";

const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const labelClass = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

type ReminderFilter = "all" | "due" | "overdue";
type SortKey = "name" | "lastDesc" | "lastAsc";

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Stable, readable email display (avoids mixed-case noise from raw records). */
function displayEmail(email: string) {
  return email.trim().toLowerCase();
}

function IconMail(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}

function IconPhone(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function IconCalendarSmall(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5a2.25 2.25 0 0 0 2.25-2.25m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5" />
    </svg>
  );
}

function IconClipboard(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
    </svg>
  );
}

function defaultOfferEmail(name: string) {
  return `Hello ${name},\n\nThis is ${SITE}. We wanted to share a current offer with you.\n\n[Describe your promotion here]\n\nBook online or reply to this email.\n\nBest regards,\n${SITE}`;
}

function defaultOfferWhatsApp(name: string) {
  return `Hi ${name}, this is ${SITE}. We have a special offer for you — reply here to book or ask for details. Thank you!`;
}

function reminderWhatsApp(c: CustomerDirectoryEntry) {
  if (!c.nextServiceDueDate || !c.reminderAnchor) {
    return defaultOfferWhatsApp(c.customerName);
  }
  return (
    `Hi ${c.customerName}, this is ${SITE}. ` +
    `Your next service is recommended by ${c.nextServiceDueDate} ` +
    `(based on your ${c.reminderAnchor.serviceName} on ${c.reminderAnchor.servicedOn}). ` +
    `Reply here to schedule. Thank you!`
  );
}

function exportCustomersCsv(rows: CustomerDirectoryEntry[]) {
  const header = ["Name", "Email", "Phone", "Last service", "Completed jobs", "Next due", "Reminder"];
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const line = (c: CustomerDirectoryEntry) =>
    [
      c.customerName,
      c.email,
      c.phone,
      c.lastServiceDate,
      String(c.bookings.length),
      c.nextServiceDueDate ?? "",
      c.reminderDueToday ? "due today" : c.reminderOverdue && c.nextServiceDueDate ? "overdue" : "",
    ]
      .map(esc)
      .join(",");
  const blob = new Blob([[header.map(esc).join(","), ...rows.map(line)].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerDirectoryEntry[]>([]);
  const [today, setToday] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [phone, setPhone] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastDesc");
  const [toast, setToast] = useState<string | null>(null);

  const [emailOpen, setEmailOpen] = useState<CustomerDirectoryEntry | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const filterRef = useRef({ q, phone, dateFrom, dateTo });
  filterRef.current = { q, phone, dateFrom, dateTo };

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const f = filterRef.current;
    try {
      const res = await adminApi.get<{ customers: CustomerDirectoryEntry[]; today: string }>("/customers", {
        params: {
          q: f.q.trim() || undefined,
          phone: f.phone.trim() || undefined,
          dateFrom: f.dateFrom || undefined,
          dateTo: f.dateTo || undefined,
        },
      });
      setCustomers(res.data.customers);
      setToday(res.data.today);
    } catch {
      setErr("Could not load customers. Check that you are logged in and the API is running.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const due = customers.filter((c) => c.reminderDueToday).length;
    const overdue = customers.filter((c) => c.reminderOverdue && c.nextServiceDueDate).length;
    return { due, overdue, total: customers.length };
  }, [customers]);

  const filteredByReminder = useMemo(() => {
    if (reminderFilter === "due") return customers.filter((c) => c.reminderDueToday);
    if (reminderFilter === "overdue") return customers.filter((c) => c.reminderOverdue && c.nextServiceDueDate);
    return customers;
  }, [customers, reminderFilter]);

  const sortedCustomers = useMemo(() => {
    const arr = [...filteredByReminder];
    if (sortKey === "name") arr.sort((a, b) => a.customerName.localeCompare(b.customerName));
    else if (sortKey === "lastDesc") arr.sort((a, b) => b.lastServiceDate.localeCompare(a.lastServiceDate));
    else arr.sort((a, b) => a.lastServiceDate.localeCompare(b.lastServiceDate));
    return arr;
  }, [filteredByReminder, sortKey]);

  const clearFilters = () => {
    setQ("");
    setPhone("");
    setDateFrom("");
    setDateTo("");
    setReminderFilter("all");
    filterRef.current = { q: "", phone: "", dateFrom: "", dateTo: "" };
    void load();
  };

  const applyServerFilters = (e?: React.FormEvent) => {
    e?.preventDefault();
    void load();
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`Copied ${label}`);
      setTimeout(() => setToast(null), 2200);
    } catch {
      setToast("Could not copy");
      setTimeout(() => setToast(null), 2200);
    }
  };

  const openEmail = (c: CustomerDirectoryEntry) => {
    setEmailOpen(c);
    setEmailSubject(`${SITE} — special offer`);
    setEmailBody(defaultOfferEmail(c.customerName));
    setEmailMsg(null);
  };

  const sendEmail = async () => {
    if (!emailOpen) return;
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      await adminApi.post("/customers/send-email", {
        to: emailOpen.email,
        subject: emailSubject.trim(),
        text: emailBody,
      });
      setEmailMsg("Email sent.");
      setTimeout(() => {
        setEmailOpen(null);
        setEmailMsg(null);
      }, 1200);
    } catch (e: unknown) {
      const msg = e as { response?: { data?: { message?: string } } };
      setEmailMsg(msg?.response?.data?.message || "Send failed. Is SMTP configured?");
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 border-b border-zinc-200/80 pb-6 dark:border-zinc-700/80 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">Customers</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            People with at least one completed visit — one row per email. Filter on the server, then narrow by reminder
            status below.
          </p>
          {today && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
              Server date for reminders: <span className="font-mono text-zinc-700 dark:text-zinc-300">{today}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh data"}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card relative overflow-hidden p-5">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-zinc-100/90 dark:bg-zinc-800/80" aria-hidden />
          <p className="relative text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">In current results</p>
          <p className="relative mt-2 text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
            {loading ? "—" : stats.total}
          </p>
          <p className="relative mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">After server filters (search / dates)</p>
        </div>
        <div className="card relative overflow-hidden border border-amber-200/70 p-5 dark:border-amber-800/50">
          <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-amber-100/80 dark:bg-amber-950/40" aria-hidden />
          <p className="relative text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">Reminder due today</p>
          <p className="relative mt-2 text-3xl font-bold tabular-nums tracking-tight text-amber-950 dark:text-amber-200">
            {loading ? "—" : stats.due}
          </p>
        </div>
        <div className="card relative overflow-hidden border border-red-200/70 p-5 dark:border-red-900/45">
          <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-red-100/70 dark:bg-red-950/35" aria-hidden />
          <p className="relative text-xs font-semibold uppercase tracking-wider text-red-800 dark:text-red-400">Overdue reminder</p>
          <p className="relative mt-2 text-3xl font-bold tabular-nums tracking-tight text-red-900 dark:text-red-200">
            {loading ? "—" : stats.overdue}
          </p>
        </div>
      </div>

      <section className="card p-4 sm:p-5" aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Search &amp; filters
        </h2>
        <form onSubmit={applyServerFilters} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass} htmlFor="cust-q">
                Name or email
              </label>
              <input
                id="cust-q"
                className={inputClass}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. priya or @gmail"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cust-phone">
                Phone contains
              </label>
              <input
                id="cust-phone"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Digits"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cust-from">
                Last service from
              </label>
              <input
                id="cust-from"
                type="date"
                className={inputClass}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cust-to">
                Last service to
              </label>
              <input
                id="cust-to"
                type="date"
                className={inputClass}
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={loading}
            >
              Apply filters
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => clearFilters()}
            >
              Clear all
            </button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Filters above query the server. Press Apply or Enter.</p>
          </div>
        </form>
      </section>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}

      {!loading && customers.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 ring-1 ring-black/[0.03] dark:border-zinc-700/80 dark:bg-zinc-900/40 dark:ring-white/[0.04] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Reminder</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", "All"],
                  ["due", "Due today"],
                  ["overdue", "Overdue"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReminderFilter(key)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    reminderFilter === key
                      ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                      : "border border-zinc-200/90 bg-white text-zinc-700 shadow-sm hover:bg-zinc-100/80 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/80 pt-3 sm:border-t-0 sm:pt-0 dark:border-zinc-700/80">
            <label htmlFor="cust-sort" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sort
            </label>
            <select
              id="cust-sort"
              className="min-h-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="lastDesc">Last visit (newest)</option>
              <option value="lastAsc">Last visit (oldest)</option>
              <option value="name">Name (A–Z)</option>
            </select>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              onClick={() => exportCustomersCsv(sortedCustomers)}
            >
              <IconClipboard className="h-3.5 w-3.5 opacity-70" />
              Export CSV
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {loading ? (
            "Loading…"
          ) : (
            <>
              <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">{sortedCustomers.length}</span>
              {reminderFilter !== "all" ? (
                <span className="ml-1 text-zinc-600 dark:text-zinc-400">
                  of {customers.length} after reminder filter
                </span>
              ) : (
                <span className="ml-1 text-zinc-600 dark:text-zinc-400">
                  customer{sortedCustomers.length === 1 ? "" : "s"}
                </span>
              )}
            </>
          )}
        </span>
      </div>

      {loading ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
          Loading directory…
        </div>
      ) : customers.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No customers match your filters. Completed bookings only — try clearing filters or widening the date range.
        </div>
      ) : sortedCustomers.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
          No customers match this reminder filter.{" "}
          <button type="button" className="font-medium text-amber-800 underline dark:text-amber-400" onClick={() => setReminderFilter("all")}>
            Show all
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {sortedCustomers.map((c) => {
            const wa = digitsOnly(c.phone);
            const open = expanded === c.emailNorm;
            const emailShown = displayEmail(c.email);
            const accent =
              c.reminderDueToday
                ? "border-l-amber-500"
                : c.reminderOverdue && c.nextServiceDueDate && !c.reminderDueToday
                  ? "border-l-red-500"
                  : "border-l-zinc-200 dark:border-l-zinc-600";
            return (
              <li
                key={c.emailNorm}
                className="card group overflow-hidden transition-shadow duration-300 hover:shadow-md dark:hover:shadow-none dark:hover:ring-white/15"
              >
                <div className={`border-l-4 ${accent}`}>
                  <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-stretch sm:justify-between sm:p-6">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-300 text-base font-bold text-amber-950 shadow-inner ring-2 ring-white dark:from-amber-900/80 dark:to-amber-800 dark:text-amber-50 dark:ring-zinc-800"
                        aria-hidden
                      >
                        {initials(c.customerName)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{c.customerName}</p>
                          {c.reminderDueToday && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
                              Due today
                            </span>
                          )}
                          {c.reminderOverdue && c.nextServiceDueDate && !c.reminderDueToday && (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-900 dark:bg-red-950/50 dark:text-red-200">
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:max-w-xl">
                          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-zinc-50/90 px-3 py-2 ring-1 ring-zinc-200/80 dark:bg-zinc-800/50 dark:ring-zinc-700/80">
                            <IconMail className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                            <a
                              href={`mailto:${c.email}`}
                              className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 no-underline transition hover:text-amber-700 dark:text-zinc-100 dark:hover:text-amber-400"
                              title={c.email}
                            >
                              {emailShown}
                            </a>
                            <button
                              type="button"
                              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                              onClick={() => void copyText(c.email, "email")}
                            >
                              Copy
                            </button>
                          </div>
                          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-zinc-50/90 px-3 py-2 ring-1 ring-zinc-200/80 dark:bg-zinc-800/50 dark:ring-zinc-700/80">
                            <IconPhone className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                            <a
                              href={`tel:${digitsOnly(c.phone)}`}
                              className="min-w-0 flex-1 text-sm font-medium text-zinc-800 no-underline transition hover:text-amber-700 dark:text-zinc-100 dark:hover:text-amber-400"
                            >
                              {c.phone}
                            </a>
                            <button
                              type="button"
                              className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                              onClick={() => void copyText(c.phone, "phone")}
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1.5">
                            <IconCalendarSmall className="h-3.5 w-3.5 text-zinc-400" />
                            Last visit{" "}
                            <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{c.lastServiceDate}</span>
                          </span>
                          <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600" aria-hidden>
                            ·
                          </span>
                          <span>
                            {c.bookings.length} completed job{c.bookings.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {c.nextServiceDueDate && c.reminderAnchor && (
                          <p className="rounded-lg border border-dashed border-zinc-200/90 bg-white/60 px-3 py-2 text-xs leading-relaxed text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-300">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Next suggested:</span>{" "}
                            <span className="tabular-nums font-semibold">{c.nextServiceDueDate}</span>
                            <span className="text-zinc-500 dark:text-zinc-500">
                              {" "}
                              (after {c.reminderAnchor.serviceName} on {c.reminderAnchor.servicedOn})
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 border-t border-zinc-100 pt-4 sm:w-auto sm:min-w-[11rem] sm:border-t-0 sm:pt-0 sm:pl-2 dark:border-zinc-800">
                      {wa ? (
                        <a
                          href={`https://wa.me/${wa}?text=${encodeURIComponent(reminderWhatsApp(c))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          WhatsApp
                        </a>
                      ) : (
                        <span className="rounded-xl border border-dashed border-zinc-200 py-2.5 text-center text-xs text-zinc-400 dark:border-zinc-700">
                          No phone for WhatsApp
                        </span>
                      )}
                      <button
                        type="button"
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                        onClick={() => openEmail(c)}
                      >
                        Email offer
                      </button>
                      <button
                        type="button"
                        className={`inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          open
                            ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
                            : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                        onClick={() => setExpanded(open ? null : c.emailNorm)}
                        aria-expanded={open}
                      >
                        {open ? "Hide history" : "Service history"}
                      </button>
                    </div>
                  </div>
                </div>
                {open && (
                  <div className="border-t border-zinc-200 bg-gradient-to-b from-zinc-50/95 to-zinc-100/80 px-4 py-5 dark:border-zinc-700 dark:from-zinc-900/80 dark:to-zinc-950/50 sm:px-6">
                    <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      <IconClipboard className="h-4 w-4" />
                      Completed services
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200/90 shadow-sm dark:border-zinc-700/90">
                      <table className="w-full min-w-[560px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-100/90 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Service</th>
                            <th className="px-4 py-3">Vehicle</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.bookings.map((b) => (
                            <tr
                              key={b._id}
                              className="border-b border-zinc-100 bg-white transition-colors last:border-0 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-800/50"
                            >
                              <td className="px-4 py-3 font-mono text-xs text-zinc-800 dark:text-zinc-200">
                                {b.date}{" "}
                                <span className="text-zinc-500 dark:text-zinc-500">{b.time}</span>
                              </td>
                              <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">{b.service?.name ?? "—"}</td>
                              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {[b.carMake, b.carModel].filter(Boolean).join(" ").trim() || b.carModel}
                                  {b.vehicleYear != null ? ` · ${b.vehicleYear}` : ""}
                                </span>
                                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500">
                                  {b.vehicleType}
                                  {b.chassisNumber || b.registrationNumber
                                    ? ` · ${b.chassisNumber || b.registrationNumber}`
                                    : ""}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                                {b.finalAmount != null ? `₹${b.finalAmount}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-zinc-200 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900">
          {toast}
        </div>
      )}

      {emailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEmailOpen(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h2 id="email-modal-title" className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Email {emailOpen.customerName}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{emailOpen.email}</p>
            <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject</label>
            <input
              className={`${inputClass} mt-1`}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <label className="mt-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Message</label>
            <textarea
              className={`${inputClass} mt-1 min-h-[200px] resize-y font-sans`}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
            />
            {emailMsg && (
              <p
                className={`mt-2 text-sm ${emailMsg === "Email sent." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {emailMsg}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                disabled={emailBusy}
                onClick={() => void sendEmail()}
              >
                {emailBusy ? "Sending…" : "Send email"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                onClick={() => setEmailOpen(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
