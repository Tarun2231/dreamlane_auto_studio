/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../lib/mongodb");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const rows = await db
      .collection("services")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

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
