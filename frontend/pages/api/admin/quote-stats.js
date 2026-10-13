/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../lib/mongodb");
const { requireAdmin } = require("./_auth");

function validYmd(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
}

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
    const col = db.collection("quoterequests");

    const df = validYmd(req.query.dateFrom) ? String(req.query.dateFrom) : null;
    const dt = validYmd(req.query.dateTo) ? String(req.query.dateTo) : null;
    const scope =
      df && dt && df <= dt
        ? {
            createdAt: {
              $gte: new Date(`${df}T00:00:00.000Z`),
              $lte: new Date(`${dt}T23:59:59.999Z`),
            },
          }
        : {};

    const count = (status) => col.countDocuments({ ...scope, status });
    const [submitted, pending, quoted, accepted, declined, closed, total] = await Promise.all([
      count("Submitted"),
      count("Pending"),
      count("Quoted"),
      count("Accepted"),
      count("Declined"),
      count("Closed"),
      col.countDocuments(scope),
    ]);

    return res.status(200).json({ submitted, pending, quoted, accepted, declined, closed, total });
  } catch (error) {
    console.error("/api/admin/quote-stats failed:", error?.message);
    return res.status(200).json({ submitted: 0, pending: 0, quoted: 0, accepted: 0, declined: 0, closed: 0, total: 0 });
  }
};
