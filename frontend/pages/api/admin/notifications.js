/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../lib/mongodb");
const { requireAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const limitRaw = Number(req.query.limit);
    const limit = Math.min(120, Math.max(10, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 40));

    const quoteRows = await db
      .collection("quoterequests")
      .find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .project({ _id: 1, customerName: 1, status: 1, updatedAt: 1, createdAt: 1 })
      .toArray();

    const items = quoteRows.map((q) => ({
      id: `quote-${String(q._id)}`,
      kind: "quotation",
      title: "Quote update",
      message: `${q.customerName || "Customer"} · ${q.status || "Updated"}`,
      href: "/admin/quotes",
      at: (q.updatedAt || q.createdAt || new Date()).toISOString(),
    }));

    return res.status(200).json({ items, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("/api/admin/notifications failed:", error?.message);
    return res.status(200).json({ items: [], generatedAt: new Date().toISOString() });
  }
};
