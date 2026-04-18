"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { FleetRecentRow, VehicleHistoryResponse } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  vehicle: FleetRecentRow | null;
};

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function VehicleHistoryDialog({ open, onClose, vehicle }: Props) {
  const [data, setData] = useState<VehicleHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!vehicle || !vehicle.vehicleType || !vehicle.carMake || !vehicle.carModel || vehicle.vehicleYear == null) {
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await adminApi.get<VehicleHistoryResponse>("/cars/history", {
        params: {
          vehicleType: vehicle.vehicleType,
          carMake: vehicle.carMake,
          carModel: vehicle.carModel,
          vehicleYear: vehicle.vehicleYear,
        },
      });
      setData(res.data);
    } catch {
      setErr("Could not load history.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [vehicle]);

  useEffect(() => {
    if (open && vehicle) void load();
    if (!open) {
      setData(null);
      setErr(null);
    }
  }, [open, vehicle, load]);

  if (!open || !vehicle) return null;

  const title = [vehicle.vehicleType, vehicle.carMake, vehicle.carModel, vehicle.vehicleYear != null ? `(${vehicle.vehicleYear})` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="vh-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id="vh-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Vehicle history
            </h2>
            <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">{title}</p>
          </div>
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : err ? (
            <p className="text-sm text-red-700 dark:text-red-300">{err}</p>
          ) : data ? (
            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Bookings ({data.bookings.length})</h3>
                {data.bookings.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">No bookings for this vehicle fingerprint.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {data.bookings.map((b) => (
                      <li
                        key={b._id}
                        className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950/40"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{b.customerName}</span>
                          <span className="text-xs text-zinc-500">
                            {b.date} · {b.time}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {b.serviceName || "—"} · <span className="font-medium">{b.status}</span>
                          {b.finalAmount != null && b.finalAmount > 0 ? ` · ${formatInr(b.finalAmount)}` : ""}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-zinc-400">{b._id}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Quote requests ({data.quotes.length})</h3>
                {data.quotes.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">No quote requests for this vehicle fingerprint.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {data.quotes.map((q) => (
                      <li
                        key={q._id}
                        className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2.5 text-sm dark:border-amber-900/40 dark:bg-amber-950/20"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{q.customerName}</span>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-zinc-900 dark:text-amber-200">
                            {q.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {q.serviceNameSnapshot || "Custom / notes"}
                          {q.quotedAmount != null && q.quotedAmount > 0 ? ` · ${formatInr(q.quotedAmount)}` : ""}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-zinc-400">{q._id}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
