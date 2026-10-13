/* eslint-disable @typescript-eslint/no-require-imports */
const clientPromise = require("../../../lib/mongodb");
const { requireAdmin } = require("./_auth");

function validYmd(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
}

function keyFor(vt, mk, md, yr) {
  return `${String(vt || "")}|${String(mk || "").trim().toLowerCase()}|${String(md || "")
    .trim()
    .toLowerCase()}|${yr == null ? "" : String(yr)}`;
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
    const bookingsCol = db.collection("bookings");
    const quotesCol = db.collection("quoterequests");

    const limitRaw = Number(req.query.limit);
    const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 10));

    const df = validYmd(req.query.dateFrom) ? String(req.query.dateFrom) : null;
    const dt = validYmd(req.query.dateTo) ? String(req.query.dateTo) : null;
    const scoped = df && dt && df <= dt;

    const bookingFind = { carMake: { $nin: [null, ""] }, carModel: { $nin: [null, ""] } };
    if (scoped) bookingFind.date = { $gte: df, $lte: dt };
    const quoteFind = { carMake: { $nin: [null, ""] }, carModel: { $nin: [null, ""] } };
    if (scoped) {
      quoteFind.createdAt = {
        $gte: new Date(`${df}T00:00:00.000Z`),
        $lte: new Date(`${dt}T23:59:59.999Z`),
      };
    }

    const [bookings, quotes] = await Promise.all([
      bookingsCol
        .find(bookingFind)
        .sort({ updatedAt: -1 })
        .limit(250)
        .project({ _id: 1, vehicleType: 1, carMake: 1, carModel: 1, vehicleYear: 1, customerName: 1, date: 1, updatedAt: 1 })
        .toArray(),
      quotesCol
        .find(quoteFind)
        .sort({ updatedAt: -1 })
        .limit(250)
        .project({
          _id: 1,
          vehicleType: 1,
          carMake: 1,
          carModel: 1,
          vehicleYear: 1,
          customerName: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .toArray(),
    ]);

    const bookSet = new Set();
    for (const b of bookings) {
      bookSet.add(keyFor(b.vehicleType, b.carMake, b.carModel, b.vehicleYear));
    }
    const quoteSet = new Set();
    for (const q of quotes) {
      quoteSet.add(keyFor(q.vehicleType, q.carMake, q.carModel, q.vehicleYear));
    }
    const unionSet = new Set([...bookSet, ...quoteSet]);

    const items = [];
    for (const b of bookings) {
      items.push({
        source: "booking",
        sortAt: new Date(b.updatedAt || Date.now()).getTime(),
        vehicleType: b.vehicleType,
        carMake: b.carMake,
        carModel: b.carModel,
        vehicleYear: b.vehicleYear,
        lastCustomerName: b.customerName || "Customer",
        lastActivityLabel: b.date || "",
        refId: String(b._id),
        quoteStatus: null,
        key: keyFor(b.vehicleType, b.carMake, b.carModel, b.vehicleYear),
      });
    }
    for (const q of quotes) {
      const when = q.updatedAt || q.createdAt || new Date();
      items.push({
        source: "quote",
        sortAt: new Date(when).getTime(),
        vehicleType: q.vehicleType,
        carMake: q.carMake,
        carModel: q.carModel,
        vehicleYear: q.vehicleYear,
        lastCustomerName: q.customerName || "Customer",
        lastActivityLabel: new Date(when).toISOString().slice(0, 10),
        refId: String(q._id),
        quoteStatus: q.status || null,
        key: keyFor(q.vehicleType, q.carMake, q.carModel, q.vehicleYear),
      });
    }

    items.sort((a, b) => b.sortAt - a.sortAt);
    const seen = new Set();
    const recent = [];
    for (const it of items) {
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      recent.push({
        source: it.source,
        vehicleType: it.vehicleType,
        carMake: it.carMake,
        carModel: it.carModel,
        vehicleYear: it.vehicleYear,
        lastCustomerName: it.lastCustomerName,
        lastActivityLabel: it.lastActivityLabel,
        refId: it.refId,
        quoteStatus: it.quoteStatus,
      });
      if (recent.length >= limit) break;
    }

    return res.status(200).json({
      stats: {
        distinctFromBookings: bookSet.size,
        distinctFromQuotes: quoteSet.size,
        distinctUnion: unionSet.size,
      },
      recent,
    });
  } catch (error) {
    console.error("/api/admin/cars failed:", error?.message);
    return res.status(200).json({
      stats: {
        distinctFromBookings: 0,
        distinctFromQuotes: 0,
        distinctUnion: 0,
      },
      recent: [],
    });
  }
};
