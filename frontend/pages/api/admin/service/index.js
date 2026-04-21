/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../../lib/mongodb");
const { requireAdmin } = require("../_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, description, image, basePrice, duration, followUpMonths } = req.body || {};
    if (!name || !description) return res.status(400).json({ message: "Name and description are required." });

    const payload = {
      name: String(name).trim(),
      description: String(description).trim(),
      image: String(image || "").trim() || "/images/services/placeholder-service.png",
      basePrice: Number(basePrice || 0),
      duration: Number(duration || 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (followUpMonths != null && followUpMonths !== "") payload.followUpMonths = Number(followUpMonths);

    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const result = await db.collection("services").insertOne(payload);

    return res.status(201).json({ ...payload, _id: String(result.insertedId) });
  } catch (error) {
    console.error("POST /api/admin/service failed:", error);
    return res.status(500).json({ message: "Could not create service." });
  }
};
