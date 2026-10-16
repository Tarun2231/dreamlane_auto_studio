/* eslint-disable @typescript-eslint/no-require-imports */
const { listShopOrders } = require("../../../../lib/supabaseDb");
const { requireAdmin } = require("../_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const limitRaw = Number(req.query.limit);
    const limit = Math.min(300, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 100));
    const all = await listShopOrders();
    const orders = all.slice(0, limit);

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("GET /api/admin/shop-orders failed:", error);
    return res.status(500).json({ message: "Could not load orders." });
  }
};
