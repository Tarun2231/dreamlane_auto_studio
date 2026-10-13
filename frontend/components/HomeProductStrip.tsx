"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { shopStockLabel, shopStockMaxQty } from "@/lib/shopStock";
import type { ShopProductPublic } from "@/lib/types";
import { useShopCart } from "@/components/ShopCartProvider";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

const GROUP_LABEL: Record<string, string> = {
  machine: "Machine",
  accessory: "Accessory",
  other: "Other",
};

/**
 * Single-row horizontal strip of shop products for the home page.
 */
export default function HomeProductStrip() {
  const [items, setItems] = useState<ShopProductPublic[]>([]);
  const [q, setQ] = useState("");
  const { add } = useShopCart();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<ShopProductPublic[]>("/shop-products", { params: { limit: "36" } });
        if (!cancelled) setItems(res.data);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        (p.category && p.category.toLowerCase().includes(s)) ||
        p.slug.toLowerCase().includes(s)
    );
  }, [items, q]);

  if (items.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden border-b border-zinc-200/70 bg-gradient-to-b from-zinc-50/85 via-white to-white dark:border-white/10 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/85"
      aria-labelledby="home-shop-strip-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-100/45 via-amber-50/20 to-transparent dark:from-amber-500/10 dark:via-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-14">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">Shop</p>
            <h2 id="home-shop-strip-heading" className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-2xl">
              Products
            </h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500 sm:text-sm dark:text-zinc-400">
              Accessories, machines &amp; more — swipe to browse, add to cart.
            </p>
          </div>
          <div className="flex w-full min-w-0 items-center gap-1.5 sm:max-w-xs md:max-w-sm">
            <label htmlFor="home-shop-strip-search" className="sr-only">
              Search shop products
            </label>
            <div className="flex flex-1 items-center rounded-2xl border border-zinc-200/90 bg-white/95 p-1 shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-700 dark:bg-zinc-900/95 dark:ring-white/5">
              <input
                id="home-shop-strip-search"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search products…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="min-h-9 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </div>
            <Link href="/shop" className="shrink-0 rounded-2xl bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
              All
            </Link>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white/80 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No products match your search.</p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-amber-800 underline dark:text-amber-400"
              onClick={() => setQ("")}
            >
              Clear search
            </button>
          </div>
        ) : (
        <div className="scrollbar-thin -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-3 pt-0.5 sm:-mx-2 sm:px-2 [scrollbar-width:thin] md:gap-5">
          {filtered.map((p) => (
            <article
              key={p._id}
              className="group relative flex w-[min(16rem,76vw)] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-sm ring-1 ring-black/[0.03] transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300/90 hover:shadow-lg dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:ring-white/5 dark:hover:border-zinc-600"
            >
              <Link
                href={`/shop/${encodeURIComponent(p.slug)}`}
                className="absolute inset-0 z-0 rounded-2xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/80"
                aria-label={`View ${p.name}`}
              />
              <div className="pointer-events-none relative z-10 flex flex-1 flex-col">
                <div className="relative aspect-[5/3] bg-zinc-100 dark:bg-zinc-800">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">No image</div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                    {GROUP_LABEL[p.productGroup ?? "accessory"]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{p.name}</h3>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatInr(p.effectivePrice)}</p>
                    <p className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{shopStockLabel(p.stock)}</p>
                  </div>
                  <button
                    type="button"
                    className="pointer-events-auto mt-3 w-full rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
        )}
      </div>
    </section>
  );
}
