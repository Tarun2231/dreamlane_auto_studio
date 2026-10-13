/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../lib/mongodb");
const { requireAdmin } = require("./_auth");

const ALLOWED = new Set(["online", "offline", "break"]);

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const col = db.collection("sitepresence");

    if (req.method === "GET") {
      const doc = await col.findOne({ key: "main" });
      return res.status(200).json({ supportStatus: ALLOWED.has(doc?.supportStatus) ? doc.supportStatus : "online" });
    }

    if (req.method === "PUT") {
      const next = String(req.body?.supportStatus || "").toLowerCase();
      if (!ALLOWED.has(next)) {
        return res.status(400).json({ message: "Invalid support status." });
      }
      await col.updateOne(
        { key: "main" },
        { $set: { key: "main", supportStatus: next, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ supportStatus: next });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("/api/admin/site-presence failed:", error?.message);
    return res.status(200).json({ supportStatus: "online" });
  }
};
