"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api";

type ReviewRow = {
  id: string;
  quote: string;
  authorDisplay: string;
  context: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  bookingId: string;
  bookingEmail: string;
  bookingDate: string;
  bookingStatus: string;
};

function statusPill(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100";
    case "approved":
      return "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100";
    case "rejected":
      return "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

const STATUS_FROM_URL = new Set(["pending", "approved", "rejected"]);

export default function AdminReviewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filter = useMemo(() => {
    const s = searchParams?.get("status");
    return s && STATUS_FROM_URL.has(s) ? s : "";
  }, [searchParams]);

  const applyFilter = (f: string) => {
    const base = pathname || "/admin/reviews";
    if (!f) router.replace(base);
    else router.replace(`${base}?status=${encodeURIComponent(f)}`);
  };

  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const { data } = await adminApi.get<{ items: ReviewRow[] }>(`/reviews${q}`);
      setItems(data.items || []);
    } catch {
      setErr("Could not load reviews.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async list fetch on mount / filter change
    void load();
  }, [load]);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    setErr(null);
    try {
      await adminApi.patch(`/reviews/${id}`, { status });
      await load();
    } catch {
      setErr("Could not update review.");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Reviews</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Approve testimonials for the homepage, or reject to remove them from public view. Customers submit using booking ID + email after the job is
            completed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f || "all"}
              type="button"
              onClick={() => applyFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {err ? <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{err}</p> : null}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">No reviews yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusPill(r.status)}`}>
                    {r.status}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.authorDisplay}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{r.context}</p>
                  <blockquote className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">&ldquo;{r.quote}&rdquo;</blockquote>
                  <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-500">
                    Booking {r.bookingId.slice(-8)} · {r.bookingDate || "—"} · {r.bookingEmail} · job {r.bookingStatus || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  {r.status !== "approved" ? (
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => void setStatus(r.id, "approved")}
                      className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {acting === r.id ? "…" : "Approve"}
                    </button>
                  ) : null}
                  {r.status !== "rejected" ? (
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => void setStatus(r.id, "rejected")}
                      className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
