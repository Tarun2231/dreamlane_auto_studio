/* eslint-disable @typescript-eslint/no-require-imports */
const { ObjectId } = require("mongodb");
const clientPromise = require("../../../../lib/mongodb");
const { requireAdmin } = require("../_auth");

const ALLOWED = new Set(["pending", "confirmed", "fulfilled", "cancelled"]);

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const id = String(req.query.id || "");
  if (!ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid order id." });
  const status = String(req.body?.status || "").toLowerCase();
  if (!ALLOWED.has(status)) return res.status(400).json({ message: "Invalid status." });

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const _id = new ObjectId(id);
    await db.collection("shoporders").updateOne({ _id }, { $set: { status, updatedAt: new Date() } });
    const doc = await db.collection("shoporders").findOne({ _id });
    if (!doc) return res.status(404).json({ message: "Order not found." });
    return res.status(200).json({ ...doc, _id: String(doc._id) });
  } catch (error) {
    console.error(`PATCH /api/admin/shop-orders/${id} failed:`, error);
    return res.status(500).json({ message: "Could not update status." });
  }
};
