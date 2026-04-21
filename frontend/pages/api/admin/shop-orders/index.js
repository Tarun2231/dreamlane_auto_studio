/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../../lib/mongodb");
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
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const rows = await db.collection("shoporders").find({}).sort({ createdAt: -1 }).limit(limit).toArray();

    return res.status(200).json({
      orders: rows.map((o) => ({
        ...o,
        _id: String(o._id),
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/shop-orders failed:", error);
    return res.status(500).json({ message: "Could not load orders." });
  }
};
