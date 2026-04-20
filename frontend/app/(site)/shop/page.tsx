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

const GROUP_TABS: { id: "" | "machine" | "accessory" | "other"; label: string; hint: string }[] = [
  { id: "", label: "All", hint: "Everything" },
  { id: "machine", label: "Machines", hint: "Wash systems, carbon cleaning, workshop equipment" },
  { id: "accessory", label: "Accessories", hint: "Lights, batteries, bulbs, car-related parts" },
  { id: "other", label: "Other", hint: "Anything that does not fit above" },
];

const GROUP_BADGE: Record<string, string> = {
  machine: "Machine",
  accessory: "Accessory",
  other: "Other",
};

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProductPublic[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [group, setGroup] = useState<"" | "machine" | "accessory" | "other">("");
  const [category, setCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { add } = useShopCart();

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pParams: Record<string, string> = {};
      if (group) pParams.productGroup = group;
      if (category) pParams.category = category;
      if (searchQ) pParams.q = searchQ;
      const cParams = group ? { productGroup: group } : {};
      const [pRes, cRes] = await Promise.all([
        api.get<ShopProductPublic[]>("/shop-products", { params: pParams }),
        api.get<{ categories: string[] }>("/shop-product-categories", { params: cParams }),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data.categories || []);
    } catch {
      setError("Could not load products. Is the API running?");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [group, category, searchQ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCategory("");
  }, [group]);

  const grouped = useMemo(() => {
    const m = new Map<string, ShopProductPublic[]>();
    for (const p of products) {
      const c = p.category || "General";
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(p);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  return (
    <>
      <div className="border-b border-black/5 bg-gradient-to-b from-zinc-100 to-[var(--background)] dark:border-white/10 dark:from-zinc-900/80 dark:to-[var(--background)]">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Products</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-zinc-400">
            Choose <strong className="font-medium text-zinc-800 dark:text-zinc-200">Machines</strong> for workshop equipment, or{" "}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">Accessories</strong> for car-related parts (lights,
            batteries, and more). Filter by type, then narrow by category. Prices include any discount from the workshop.
          </p>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
        <div className="mb-6 space-y-4">
          <div>
            <label htmlFor="shop-search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Search
            </label>
            <div className="relative max-w-xl">
              <input
                id="shop-search"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search by name, category, or description…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-10 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              {searchInput ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Product type</p>
            <div className="flex flex-wrap gap-2">
              {GROUP_TABS.map((t) => (
                <button
                  key={t.id || "all"}
                  type="button"
                  title={t.hint}
                  onClick={() => setGroup(t.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    group === t.id ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/10 dark:border-white/15"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  !category ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "border border-black/10 dark:border-white/15"
                }`}
              >
                All categories
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    category === c ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "border border-black/10 dark:border-white/15"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Link href="/shop/cart" className="text-sm font-semibold text-amber-800 underline dark:text-amber-400">
              View cart →
            </Link>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-gray-600 dark:text-zinc-400">Loading products…</p>
        ) : products.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 dark:text-zinc-400">
              {searchQ
                ? `No products match “${searchQ}”. Try different words or clear the search.`
                : "No products listed yet. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {grouped.map(([category, items]) => (
              <section key={category} aria-labelledby={`cat-${category}`}>
                <h2 id={`cat-${category}`} className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {category}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((p) => (
                    <article key={p._id} className="card relative flex flex-col overflow-hidden p-0">
                      <Link
                        href={`/shop/${encodeURIComponent(p.slug)}`}
                        className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/80"
                        aria-label={`View ${p.name}`}
                      />
                      <div className="relative z-10 flex flex-1 flex-col pointer-events-none">
                        <div className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-800">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- product URLs may be any host
                            <img src={p.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-zinc-400">No image</div>
                          )}
                          <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                            {GROUP_BADGE[p.productGroup] || "Accessory"}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</h3>
                          {p.description ? (
                            <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{p.description}</p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap items-baseline gap-2">
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{formatInr(p.effectivePrice)}</span>
                            {p.discountPercent > 0 ? (
                              <>
                                <span className="text-sm text-zinc-400 line-through">{formatInr(p.basePrice)}</span>
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                                  {p.discountPercent}% off
                                </span>
                              </>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{shopStockLabel(p.stock)}</p>
                          <button
                            type="button"
                            className="btn-primary pointer-events-auto mt-3 w-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={p.stock != null && p.stock <= 0}
                            onClick={() => add(p._id, 1, { maxQty: shopStockMaxQty(p.stock) })}
                          >
                            Add to cart
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
