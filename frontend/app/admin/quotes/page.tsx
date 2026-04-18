"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminVehicleSummary from "@/components/admin/AdminVehicleSummary";
import { adminApi } from "@/lib/api";
import { QuoteRequest, Service } from "@/lib/types";

function adminServiceTitle(q: QuoteRequest): string {
  if (q.serviceNameSnapshot) return q.serviceNameSnapshot;
  const sid = q.serviceId;
  if (sid && typeof sid === "object" && "name" in sid) return (sid as Service).name;
  return "";
}

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function statusPillClass(status: string) {
  switch (status) {
    case "Submitted":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100";
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

const STATUSES = ["", "Submitted", "Quoted", "Accepted", "Declined", "Closed"] as const;

const STATUS_FROM_URL = new Set(["Submitted", "Quoted", "Accepted", "Declined", "Closed"]);

export default function AdminQuotesPage() {
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
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams.get("status");
    if (s && STATUS_FROM_URL.has(s)) {
      setStatusFilter(s);
    }
  }, [searchParams]);

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
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await adminApi.get<QuoteRequest[]>("/quote-requests", { params });
      setList(res.data);
    } catch {
      setErr("Could not load quote requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (q: QuoteRequest) => {
    setSelected(q);
    setQuotedAmount(q.quotedAmount != null && q.quotedAmount > 0 ? String(q.quotedAmount) : "");
    setQuoteNotes(q.quoteNotes || "");
    setStatusEdit(q.status);
  };

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
      setList((prev) => prev.map((x) => (x._id === res.data._id ? res.data : x)));
      setMsg("Saved.");
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
      setList((prev) => prev.map((x) => (x._id === res.data.quote._id ? res.data.quote : x)));
      setMsg("Quotation emailed to customer.");
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      setErr(er?.response?.data?.message || "Email failed.");
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Quotation requests</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Review enquiries, enter a price and notes, then email the quotation. Customers accept or decline on the website.
          </p>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
            Vehicle details are shown in a structured card. See all workshop vehicles on{" "}
            <Link href="/admin/cars" className="font-medium text-blue-700 hover:underline dark:text-blue-400">
              Cars
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Status</span>
            <select
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s || "all"} value={s}>
                  {s || "All"}
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
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Inbox</h2>
            <ul className="space-y-2">
              {list.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
                  No requests for this filter.
                </li>
              ) : (
                list.map((q) => (
                  <li key={q._id}>
                    <button
                      type="button"
                      onClick={() => open(q)}
                      className={`group w-full rounded-2xl border p-4 text-left transition ${
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
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillClass(q.status)}`}
                        >
                          {q.status}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
                        {adminServiceTitle(q) || q.serviceDescription || "—"}
                      </p>
                      {q.carMake && q.carModel ? (
                        <p className="mt-1.5 truncate text-xs text-zinc-500 dark:text-zinc-500">
                          {[q.vehicleType, q.carMake, q.carModel].filter(Boolean).join(" · ")}
                          {q.vehicleYear != null ? ` (${q.vehicleYear})` : ""}
                        </p>
                      ) : q.vehicleHint ? (
                        <p className="mt-1.5 truncate text-xs text-zinc-500">{q.vehicleHint}</p>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {selected ? (
            <div className="xl:sticky xl:top-4 xl:self-start">
              <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="border-b border-zinc-100 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Quote detail</h2>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${statusPillClass(selected.status)}`}>
                      {selected.status}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{selected._id}</p>
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
                    Customers track their quote at Track quote using this ID and their email.
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Contact</p>
                    <p className="mt-2 break-all text-sm font-medium text-zinc-900 dark:text-zinc-100">{selected.email}</p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{selected.phone}</p>
                  </div>

                  <AdminVehicleSummary vehicle={selected} variant="featured" />

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
                      <span className="text-xs font-semibold text-zinc-500">Quote notes (breakdown, validity, labour)</span>
                      <textarea
                        className="min-h-[100px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Line items, taxes, warranty notes…"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-semibold text-zinc-500">Status</span>
                      <select
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800"
                        value={statusEdit}
                        onChange={(e) => setStatusEdit(e.target.value)}
                      >
                        {STATUSES.filter(Boolean).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                      disabled={saving}
                      onClick={() => void save()}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-amber-600 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-950 disabled:opacity-50 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100"
                      disabled={emailing || !quotedAmount.trim() || Number(quotedAmount) <= 0}
                      onClick={() => void sendQuoteEmail()}
                    >
                      {emailing ? "Sending…" : "Email quotation"}
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
            <div className="hidden min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/20 xl:flex">
              Select a request from the list to view details and send a quotation.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
