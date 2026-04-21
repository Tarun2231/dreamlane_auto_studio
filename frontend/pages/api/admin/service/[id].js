/* eslint-disable @typescript-eslint/no-require-imports */
const { ObjectId } = require("mongodb");
const clientPromise = require("../../../../lib/mongodb");
const { requireAdmin } = require("../_auth");

function asObjectId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const id = String(req.query.id || "");
  const _id = asObjectId(id);
  if (!_id) return res.status(400).json({ message: "Invalid service id." });

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const col = db.collection("services");

    if (req.method === "DELETE") {
      await col.deleteOne({ _id });
      return res.status(204).end();
    }

    if (req.method === "PUT") {
      const { name, description, image, basePrice, duration, followUpMonths } = req.body || {};
      const update = {
        name: String(name || "").trim(),
        description: String(description || "").trim(),
        image: String(image || "").trim() || "/images/services/placeholder-service.png",
        basePrice: Number(basePrice || 0),
        duration: Number(duration || 0),
        updatedAt: new Date(),
      };
      if (followUpMonths == null || followUpMonths === "") update.followUpMonths = null;
      else update.followUpMonths = Number(followUpMonths);

      await col.updateOne({ _id }, { $set: update });
      const doc = await col.findOne({ _id });
      if (!doc) return res.status(404).json({ message: "Service not found." });
      return res.status(200).json({ ...doc, _id: String(doc._id) });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error(`/api/admin/service/${id} failed:`, error);
    return res.status(500).json({ message: "Could not update service." });
  }
};
