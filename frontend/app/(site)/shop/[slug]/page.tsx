"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useShopCart } from "@/components/ShopCartProvider";
import { api } from "@/lib/api";
import { shopStockLabel, shopStockMaxQty } from "@/lib/shopStock";
import type { ShopProductPublic } from "@/lib/types";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0
  );
}

const GROUP_BADGE: Record<string, string> = {
  machine: "Machine",
  accessory: "Accessory",
  other: "Other",
};

async function loadSuggestions(current: ShopProductPublic): Promise<ShopProductPublic[]> {
  try {
    const [catRes, groupRes] = await Promise.all([
      api.get<ShopProductPublic[]>("/shop-products", { params: { category: current.category, limit: "24" } }),
      api.get<ShopProductPublic[]>("/shop-products", { params: { productGroup: current.productGroup, limit: "24" } }),
    ]);
    const seen = new Set<string>([current._id]);
    const out: ShopProductPublic[] = [];
    for (const p of catRes.data) {
      if (!seen.has(p._id)) {
        seen.add(p._id);
        out.push(p);
      }
      if (out.length >= 8) break;
    }
    if (out.length < 4) {
      for (const p of groupRes.data) {
        if (!seen.has(p._id)) {
          seen.add(p._id);
          out.push(p);
        }
        if (out.length >= 8) break;
      }
    }
    return out.slice(0, 6);
  } catch {
    return [];
  }
}

export default function ShopProductDetailPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = typeof slugParam === "string" ? slugParam : Array.isArray(slugParam) ? slugParam[0] : "";

  const { add } = useShopCart();
  const [product, setProduct] = useState<ShopProductPublic | null>(null);
  const [suggested, setSuggested] = useState<ShopProductPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    try {
      const pathSlug = encodeURIComponent(slug);
      const res = await api.get<ShopProductPublic>(`/shop-product/${pathSlug}`);
      setProduct(res.data);
      setSuggested(await loadSuggestions(res.data));
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number } };
      setProduct(null);
      setSuggested([]);
      if (ax.response?.status === 404) {
        setNotFound(true);
      } else {
        setLoadError("Could not load this product. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-zinc-500">Loading product…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-800 dark:text-red-200">{loadError}</p>
        <button
          type="button"
          className="btn-primary mt-6 min-h-11 px-6 py-3 text-sm font-semibold"
          onClick={() => void load()}
        >
          Retry
        </button>
        <div className="mt-6">
          <Link href="/shop" className="text-sm font-medium text-amber-800 underline dark:text-amber-400">
            Back to products
          </Link>
        </div>
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Product not found</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">This item may have been removed or the link is incorrect.</p>
        <Link href="/shop" className="btn-primary mt-8 inline-block min-h-11 px-6 py-3 text-sm font-semibold">
          Back to products
        </Link>
      </main>
    );
  }

  const p = product;

  return (
    <>
      <div className="border-b border-black/5 bg-gradient-to-b from-zinc-100 to-[var(--background)] dark:border-white/10 dark:from-zinc-900/80 dark:to-[var(--background)]">
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-10">
          <Link href="/shop" className="text-sm font-medium text-amber-800 dark:text-amber-400">
            ← All products
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="relative aspect-[4/3]">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">No image</div>
              )}
              <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                {GROUP_BADGE[p.productGroup] || "Accessory"}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{p.category}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">{p.name}</h1>
            <p className="mt-2 font-mono text-sm text-zinc-500 dark:text-zinc-400">{p.slug}</p>

            <div className="mt-6 flex flex-wrap items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{formatInr(p.effectivePrice)}</span>
              {p.discountPercent > 0 ? (
                <>
                  <span className="text-base text-zinc-400 line-through">{formatInr(p.basePrice)}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {p.discountPercent}% off
                  </span>
                </>
              ) : null}
            </div>

            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{shopStockLabel(p.stock)}</p>

            {p.description ? (
              <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-700">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{p.description}</p>
              </div>
            ) : null}

            <button
              type="button"
              className="btn-primary mt-8 w-full max-w-sm py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={p.stock != null && p.stock <= 0}
              onClick={() => add(p._id, 1, { maxQty: shopStockMaxQty(p.stock) })}
            >
              Add to cart
            </button>
          </div>
        </div>

        {suggested.length > 0 ? (
          <section className="mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-700" aria-labelledby="suggested-heading">
            <h2 id="suggested-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              You may also like
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suggested.map((s) => (
                <Link
                  key={s._id}
                  href={`/shop/${encodeURIComponent(s.slug)}`}
                  className="card flex flex-col overflow-hidden p-0 transition hover:border-zinc-400 dark:hover:border-zinc-500"
                >
                  <div className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-800">
                    {s.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">No image</div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                      {GROUP_BADGE[s.productGroup] || "Accessory"}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{s.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500">{s.category}</p>
                    <div className="mt-3 flex flex-wrap items-baseline gap-2">
                      <span className="text-base font-bold tabular-nums">{formatInr(s.effectivePrice)}</span>
                      {s.discountPercent > 0 ? (
                        <span className="text-xs text-zinc-400 line-through">{formatInr(s.basePrice)}</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{shopStockLabel(s.stock)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
