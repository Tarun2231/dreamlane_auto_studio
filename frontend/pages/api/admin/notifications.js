/* eslint-disable @typescript-eslint/no-require-imports */
const { listQuotes } = require("../../../lib/supabaseDb");
const { requireAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const quotes = await listQuotes();
    const items = quotes.slice(0, 40).map((q) => ({
      id: `quote-${String(q._id || q.id)}`,
      kind: "quotation",
      title: "Quote update",
      message: `${q.customerName || "Customer"} · ${q.status || "Updated"}`,
      href: "/admin/quotes",
      at: q.updatedAt || q.createdAt || new Date().toISOString(),
    }));

    return res.status(200).json({ items, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("/api/admin/notifications failed:", error?.message);
    return res.status(200).json({ items: [], generatedAt: new Date().toISOString() });
  }
};
