"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { ShopOrderRecord } from "@/lib/types";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

const STATUSES = ["pending", "confirmed", "fulfilled", "cancelled"] as const;

export default function AdminShopOrdersPage() {
  const [orders, setOrders] = useState<ShopOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await adminApi.get<{ orders: ShopOrderRecord[] }>("/shop-orders", { params: { limit: 100 } });
      setOrders(res.data.orders);
    } catch {
      setError("Could not load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: (typeof STATUSES)[number]) => {
    setUpdating(id);
    try {
      await adminApi.patch(`/shop-orders/${id}`, { status });
      await load();
    } catch {
      setError("Could not update status.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Shop orders</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Product purchases (separate from service bookings). Revenue totals also appear on the dashboard for the selected period.
          </p>
        </div>
        <Link href="/admin/shop" className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-400">
          Manage products →
        </Link>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-zinc-500">No orders yet.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((o) => (
            <article key={o._id} className="card overflow-hidden p-0">
              <div className="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-50">{o.orderNumber}</p>
                  <p className="text-xs text-zinc-500">
                    {o.orderDateYmd} · {o.customerName} · {o.email} · {o.phone}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{formatInr(o.totalInr)}</span>
                  <select
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    value={o.status}
                    disabled={updating === o._id}
                    onChange={(e) => void setStatus(o._id, e.target.value as (typeof STATUSES)[number])}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {o.address ? <p className="border-b border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">{o.address}</p> : null}
              {o.customerNote ? (
                <p className="border-b border-zinc-100 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                  Note: {o.customerNote}
                </p>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase text-zinc-500">
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Each</th>
                      <th className="px-4 py-2">Line</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {o.items.map((it, i) => (
                      <tr key={`${o._id}-${i}`}>
                        <td className="px-4 py-2">
                          <span className="mr-2 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {it.productGroup || "accessory"}
                          </span>
                          {it.name}
                          <span className="ml-2 text-xs text-zinc-400">{it.category}</span>
                        </td>
                        <td className="px-4 py-2 tabular-nums">{it.qty}</td>
                        <td className="px-4 py-2 tabular-nums">{formatInr(it.unitPriceEffective)}</td>
                        <td className="px-4 py-2 font-medium tabular-nums">{formatInr(it.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-6 border-t border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">
                <span className="text-zinc-500">List subtotal {formatInr(o.subtotalListInr)}</span>
                {o.discountInr > 0 ? <span className="text-emerald-700 dark:text-emerald-400">Discount −{formatInr(o.discountInr)}</span> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
