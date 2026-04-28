/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../lib/mongodb");

const SAMPLE_SERVICES = [
  {
    name: "Basic Service",
    description: "Oil change, basic check-up, and fluid top-up.",
    price: 1999,
    duration: "2 hours",
    isActive: true,
  },
  {
    name: "Premium Detailing",
    description: "Deep interior cleaning and exterior paint protection.",
    price: 4999,
    duration: "5 hours",
    isActive: true,
  },
];

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    let rows = await db
      .collection("services")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    if (!rows.length) {
      const now = new Date();
      const seeded = SAMPLE_SERVICES.map((s) => ({ ...s, createdAt: now, updatedAt: now }));
      await db.collection("services").insertMany(seeded);
      rows = await db
        .collection("services")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
    }

    return res.status(200).json(
      rows.map((s) => ({
        ...s,
        _id: String(s._id),
      }))
    );
  } catch (error) {
    console.error("GET /api/services failed:", error);
    return res.status(500).json({ message: "Could not load services." });
  }
};
