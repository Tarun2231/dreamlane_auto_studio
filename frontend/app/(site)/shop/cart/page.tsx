"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShopCart } from "@/components/ShopCartProvider";
import { api } from "@/lib/api";
import { shopStockLabel, shopStockMaxQty } from "@/lib/shopStock";
import type { ShopProductPublic } from "@/lib/types";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

export default function ShopCartPage() {
  const { lines, setQty, remove, hydrated } = useShopCart();
  const [catalog, setCatalog] = useState<ShopProductPublic[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ShopProductPublic[]>("/shop-products");
      setCatalog(res.data);
    } catch {
      setCatalog([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(catalog.map((p) => [p._id, p])), [catalog]);

  useEffect(() => {
    if (!hydrated || catalog.length === 0 || lines.length === 0) return;
    for (const l of lines) {
      const p = byId.get(l.productId);
      if (!p) continue;
      const max = shopStockMaxQty(p.stock);
      if (max < 1) remove(l.productId);
      else if (l.qty > max) setQty(l.productId, max, { maxQty: max });
    }
  }, [hydrated, catalog, lines, byId, remove, setQty]);

  const rows = useMemo(() => {
    return lines
      .map((l) => {
        const p = byId.get(l.productId);
        if (!p) return null;
        const lineTotal = Math.round(p.effectivePrice * l.qty * 100) / 100;
        return { line: l, product: p, lineTotal };
      })
      .filter(Boolean) as { line: { productId: string; qty: number }; product: ShopProductPublic; lineTotal: number }[];
  }, [lines, byId]);

  const grand = useMemo(() => rows.reduce((s, r) => s + r.lineTotal, 0), [rows]);

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-zinc-500">Loading cart…</p>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-black/5 bg-gradient-to-b from-zinc-100 to-[var(--background)] dark:border-white/10 dark:from-zinc-900/80 dark:to-[var(--background)]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Link href="/shop" className="text-sm font-medium text-amber-800 dark:text-amber-400">
            ← Products
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Your cart</h1>
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-4 py-10">
        {lines.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">Your cart is empty.</p>
            <Link href="/shop" className="btn-primary mt-6 inline-block min-h-11 px-6 py-3">
              Browse products
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-amber-800 dark:text-amber-300">
            Some items are no longer available.{" "}
            <button type="button" className="underline" onClick={() => lines.forEach((l) => remove(l.productId))}>
              Clear cart
            </button>
          </p>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40">
              {rows.map(({ line, product, lineTotal }) => (
                <li key={line.productId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{product.name}</p>
                    <p className="text-sm text-zinc-500">{product.category}</p>
                    <p className="mt-1 text-sm">{formatInr(product.effectivePrice)} each</p>
                    <p className="mt-1 text-xs text-zinc-500">{shopStockLabel(product.stock)}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-3 sm:border-t-0 sm:pt-0 sm:justify-end gap-4">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                        Qty
                        <input
                          type="number"
                          min={1}
                          max={shopStockMaxQty(product.stock)}
                          className="w-14 sm:w-16 rounded-xl border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm font-semibold dark:border-zinc-600 dark:bg-zinc-800"
                          value={line.qty}
                          onChange={(e) =>
                            setQty(line.productId, Number(e.target.value), { maxQty: shopStockMaxQty(product.stock) })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="text-xs sm:text-sm text-red-600 hover:underline dark:text-red-400"
                        onClick={() => remove(line.productId)}
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-right font-bold tabular-nums text-base text-zinc-900 dark:text-zinc-100">{formatInr(lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 dark:border-zinc-700 dark:bg-zinc-800/50">
              <span className="font-medium text-sm sm:text-base text-zinc-700 dark:text-zinc-200">Estimated total</span>
              <span className="text-xl sm:text-2xl font-bold tabular-nums">{formatInr(grand)}</span>
            </div>
            <Link href="/shop/checkout" className="btn-primary block w-full min-h-[48px] py-3.5 text-center text-sm font-semibold shadow-md">
              Proceed to checkout
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
