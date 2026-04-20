import type { ShopProductPublic } from "@/lib/types";

export type ShopStock = ShopProductPublic["stock"];

/** Max cart line qty (1–99) allowed for this product. */
export function shopStockMaxQty(stock: ShopStock): number {
  if (stock === null || stock === undefined) return 99;
  return Math.min(99, Math.max(0, Math.floor(stock)));
}

/** Short label for product cards and cart. */
export function shopStockLabel(stock: ShopStock): string {
  if (stock === null || stock === undefined) return "In stock";
  if (stock <= 0) return "Out of stock";
  if (stock <= 5) return `${stock} left`;
  return `${stock} in stock`;
}
