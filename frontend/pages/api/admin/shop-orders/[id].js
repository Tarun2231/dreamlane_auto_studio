/* eslint-disable @typescript-eslint/no-require-imports */
const { updateShopOrder } = require("../../../../lib/supabaseDb");
const { requireAdmin } = require("../_auth");

const ALLOWED = new Set(["pending", "confirmed", "fulfilled", "cancelled"]);

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const id = String(req.query.id || "");
  if (!id) return res.status(400).json({ message: "Invalid order id." });
  const status = String(req.body?.status || "").toLowerCase();
  if (!ALLOWED.has(status)) return res.status(400).json({ message: "Invalid status." });

  try {
    const updated = await updateShopOrder(id, { status });
    if (!updated) return res.status(404).json({ message: "Order not found." });
    return res.status(200).json(updated);
  } catch (error) {
    console.error(`PATCH /api/admin/shop-orders/${id} failed:`, error);
    return res.status(500).json({ message: "Could not update status." });
  }
};
