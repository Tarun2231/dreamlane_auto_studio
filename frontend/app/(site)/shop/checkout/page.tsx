"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShopCart } from "@/components/ShopCartProvider";
import { api } from "@/lib/api";
import { shopStockMaxQty } from "@/lib/shopStock";
import type { ShopProductPublic } from "@/lib/types";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

export default function ShopCheckoutPage() {
  const router = useRouter();
  const { lines, clear, hydrated } = useShopCart();
  const [catalog, setCatalog] = useState<ShopProductPublic[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCatalogReady(false);
    try {
      const res = await api.get<ShopProductPublic[]>("/shop-products");
      setCatalog(res.data);
    } catch {
      setCatalog([]);
    } finally {
      setCatalogReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(catalog.map((p) => [p._id, p])), [catalog]);

  const { rows, grand } = useMemo(() => {
    const r = lines
      .map((l) => {
        const p = byId.get(l.productId);
        if (!p) return null;
        const lineTotal = Math.round(p.effectivePrice * l.qty * 100) / 100;
        return { line: l, product: p, lineTotal };
      })
      .filter(Boolean) as { line: { productId: string; qty: number }; product: ShopProductPublic; lineTotal: number }[];
    const g = r.reduce((s, x) => s + x.lineTotal, 0);
    return { rows: r, grand: g };
  }, [lines, byId]);

  const stockError = useMemo(() => {
    if (!catalogReady || lines.length === 0) return null;
    for (const l of lines) {
      const p = byId.get(l.productId);
      if (!p) return "Some items are no longer in the catalog. Update your cart.";
      if (p.stock != null) {
        if (p.stock <= 0) return `${p.name} is out of stock.`;
        if (l.qty > shopStockMaxQty(p.stock)) return `Reduce quantity for ${p.name} (only ${p.stock} available).`;
      }
    }
    return null;
  }, [lines, byId, catalogReady]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!catalogReady) {
      setError("Loading product details…");
      return;
    }
    if (stockError) {
      setError(stockError);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ order: { orderNumber: string; totalInr: number } }>("/shop/orders", {
        customerName: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        customerNote: note.trim(),
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
      });
      clear();
      const num = res.data?.order?.orderNumber || "";
      router.push(`/shop/confirmation?order=${encodeURIComponent(num)}`);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      const msg = ax.response?.data?.message;
      setError(typeof msg === "string" ? msg : "Checkout failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-zinc-500">Loading…</p>
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-zinc-600 dark:text-zinc-400">Your cart is empty.</p>
        <Link href="/shop" className="btn-primary mt-4 inline-block min-h-11 px-6 py-3">
          Browse products
        </Link>
      </main>
    );
  }

  return (
    <>
      <div className="border-b border-black/5 bg-gradient-to-b from-zinc-100 to-[var(--background)] dark:border-white/10 dark:from-zinc-900/80 dark:to-[var(--background)]">
        <div className="mx-auto max-w-lg px-4 py-10">
          <Link href="/shop/cart" className="text-sm font-medium text-amber-800 dark:text-amber-400">
            ← Cart
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Checkout</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            We&apos;ll confirm payment and pickup or delivery with you after the order is placed.
          </p>
        </div>
      </div>
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Order summary</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {rows.map(({ product, line, lineTotal }) => (
              <li key={line.productId} className="flex justify-between gap-2">
                <span>
                  {product.name} × {line.qty}
                </span>
                <span className="tabular-nums">{formatInr(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between border-t border-zinc-200 pt-3 text-base font-bold dark:border-zinc-600">
            <span>Total</span>
            <span className="tabular-nums">{formatInr(grand)}</span>
          </p>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          {error || stockError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error || stockError}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Full name</label>
            <input
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
            <input
              required
              type="email"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Phone</label>
            <input
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Address (optional)</label>
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Note to workshop (optional)</label>
            <textarea
              className="min-h-[60px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full min-h-[48px] py-3.5 text-sm font-semibold shadow-md disabled:opacity-50"
            disabled={loading || !catalogReady || !!stockError}
          >
            {loading ? "Placing order…" : `Place order — ${formatInr(grand)}`}
          </button>
        </form>
      </main>
    </>
  );
}
