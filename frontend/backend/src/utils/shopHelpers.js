/** Effective unit price after product discount (INR). */
function effectiveUnitPriceInr(product) {
  const base = Number(product.basePrice);
  const pct = Math.min(100, Math.max(0, Number(product.discountPercent) || 0));
  if (!Number.isFinite(base) || base < 0) return 0;
  return Math.round(base * (1 - pct / 100) * 100) / 100;
}

function listTotalForQty(product, qty) {
  const base = Number(product.basePrice);
  if (!Number.isFinite(base) || base < 0) return 0;
  return Math.round(base * qty * 100) / 100;
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "product";
}

module.exports = {
  effectiveUnitPriceInr,
  listTotalForQty,
  slugify,
};
