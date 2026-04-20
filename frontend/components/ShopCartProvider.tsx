"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "carcare-shop-cart-v1";

export type CartLine = { productId: string; qty: number };

type ShopCartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  itemCount: number;
  add: (productId: string, qty?: number, options?: { maxQty?: number }) => void;
  setQty: (productId: string, qty: number, options?: { maxQty?: number }) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const ShopCartContext = createContext<ShopCartContextValue | null>(null);

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setLines(
            parsed
              .filter((x) => x && typeof x.productId === "string" && typeof x.qty === "number")
              .map((x) => ({
                productId: x.productId,
                qty: Math.min(99, Math.max(1, Math.floor(x.qty))),
              }))
          );
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const add = useCallback((productId: string, qty = 1, options?: { maxQty?: number }) => {
    const cap =
      options?.maxQty != null && Number.isFinite(options.maxQty)
        ? Math.min(99, Math.max(0, Math.floor(options.maxQty)))
        : 99;
    if (cap < 1) return;
    const q = Math.min(cap, Math.min(99, Math.max(1, Math.floor(qty))));
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId);
      if (i < 0) return [...prev, { productId, qty: q }];
      const next = [...prev];
      next[i] = { productId, qty: Math.min(cap, Math.min(99, next[i].qty + q)) };
      return next;
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number, options?: { maxQty?: number }) => {
    const cap =
      options?.maxQty != null && Number.isFinite(options.maxQty)
        ? Math.min(99, Math.max(0, Math.floor(options.maxQty)))
        : 99;
    if (cap < 1) {
      setLines((prev) => prev.filter((l) => l.productId !== productId));
      return;
    }
    const q = Math.min(cap, Math.min(99, Math.max(1, Math.floor(qty))));
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId);
      if (i < 0) return [...prev, { productId, qty: q }];
      const next = [...prev];
      next[i] = { productId, qty: q };
      return next;
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const value = useMemo(
    () => ({ lines, hydrated, itemCount, add, setQty, remove, clear }),
    [lines, hydrated, itemCount, add, setQty, remove, clear]
  );

  return <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>;
}

export function useShopCart() {
  const ctx = useContext(ShopCartContext);
  if (!ctx) throw new Error("useShopCart must be used under ShopCartProvider");
  return ctx;
}
