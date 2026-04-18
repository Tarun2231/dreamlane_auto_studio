"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminVehicleSummary, { type VehicleFields } from "@/components/admin/AdminVehicleSummary";
import VehicleHistoryDialog from "@/components/admin/VehicleHistoryDialog";
import { adminApi } from "@/lib/api";
import type { FleetRecentRow, FleetSnapshot } from "@/lib/types";

export default function AdminCarsPage() {
  const [data, setData] = useState<FleetSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [historyVehicle, setHistoryVehicle] = useState<FleetRecentRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await adminApi.get<FleetSnapshot>("/cars", {
        params: { limit: 48, ...(debouncedSearch ? { q: debouncedSearch } : {}) },
      });
      setData(res.data);
    } catch {
      setErr("Could not load vehicles.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredNote = debouncedSearch && data && data.recent.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="border-b border-zinc-200/80 pb-6 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Cars</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Vehicles seen across bookings and quotation requests. Each card is a unique make, model, year, and body type. Open{" "}
          <strong className="font-semibold text-zinc-800 dark:text-zinc-200">History</strong> to see every booking and quote
          for that vehicle.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex min-w-[min(100%,280px)] flex-1 items-center gap-2">
            <span className="sr-only">Search fleet</span>
            <input
              type="search"
              placeholder="Search make, model, body…"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium dark:border-zinc-600 dark:bg-zinc-800"
              onClick={() => void load()}
            >
              Refresh
            </button>
            <Link
              href="/admin/bookings"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Bookings →
            </Link>
            <Link
              href="/admin/quotes"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Quotes →
            </Link>
          </div>
        </div>
      </header>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading fleet…</p>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3" aria-labelledby="fleet-stats">
            <h2 id="fleet-stats" className="sr-only">
              Fleet counts
            </h2>
            <div className="card border-emerald-200/60 bg-emerald-50/50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Unique vehicles (total)
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-950 dark:text-emerald-100">{data.stats.distinctUnion}</p>
              <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-300/90">Bookings + quotes, de-duplicated</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">From bookings</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{data.stats.distinctFromBookings}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">From quote requests</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{data.stats.distinctFromQuotes}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">Fleet</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {debouncedSearch
                ? `Matches for “${debouncedSearch}” in recently active vehicles (refine with search).`
                : "Recently active unique vehicles — use History to see full booking and quote lists."}
            </p>
            {filteredNote ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">No vehicles match this search. Try another term or clear the search box.</p>
            ) : null}
            <ul className="grid gap-4 lg:grid-cols-2">
              {data.recent.length === 0 && !filteredNote ? (
                <li className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
                  No structured vehicle data yet. New bookings and quotes with make, model, and year will appear here.
                </li>
              ) : (
                data.recent.map((row) => {
                  const v: VehicleFields = {
                    vehicleType: row.vehicleType,
                    carMake: row.carMake,
                    carModel: row.carModel,
                    vehicleYear: row.vehicleYear,
                  };
                  const href = row.source === "booking" ? `/admin/bookings` : `/admin/quotes`;
                  const canHistory =
                    Boolean(row.vehicleType && row.carMake && row.carModel && row.vehicleYear != null && Number.isFinite(Number(row.vehicleYear)));
                  return (
                    <li key={`${row.refId}-${row.source}`}>
                      <div className="card overflow-hidden p-0">
                        <AdminVehicleSummary vehicle={v} variant="featured" className="border-0 shadow-none" />
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3 text-xs dark:border-zinc-800">
                          <span className="text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">{row.lastCustomerName}</span>
                            {" · "}
                            {row.lastActivityLabel}
                          </span>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 font-medium ${
                                row.source === "booking"
                                  ? "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
                                  : "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
                              }`}
                            >
                              {row.source === "booking" ? "Booking" : "Quote"}
                            </span>
                            {canHistory ? (
                              <button
                                type="button"
                                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                onClick={() => setHistoryVehicle(row)}
                              >
                                History
                              </button>
                            ) : null}
                            <Link href={href} className="font-medium text-blue-700 hover:underline dark:text-blue-400">
                              Open →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </>
      ) : null}

      <VehicleHistoryDialog open={historyVehicle != null} vehicle={historyVehicle} onClose={() => setHistoryVehicle(null)} />
    </div>
  );
}
