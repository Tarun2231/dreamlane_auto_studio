/* eslint-disable @typescript-eslint/no-require-imports */
const jwt = require("jsonwebtoken");
const clientPromise = require("../../../lib/mongodb");

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(refYmd) {
  const [y, m] = String(refYmd || ymdLocal())
    .split("-")
    .map(Number);
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const month = Number.isFinite(m) ? m : new Date().getMonth() + 1;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = ymdLocal(new Date(year, month, 0));
  return { start, end };
}

function authAllowed(req) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;
  if (!process.env.JWT_SECRET) return true;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

async function safeCount(db, collectionName, query = {}) {
  try {
    return await db.collection(collectionName).countDocuments(query);
  } catch {
    return 0;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  if (!authAllowed(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);

    const today = ymdLocal();
    const period = String(req.query.period || "month").toLowerCase();
    const ref = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.ref || "")) ? String(req.query.ref) : today;
    const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateFrom || ""))
      ? String(req.query.dateFrom)
      : null;
    const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateTo || "")) ? String(req.query.dateTo) : null;

    let rangeStart = today;
    let rangeEnd = today;
    if (period === "range" && dateFrom && dateTo && dateFrom <= dateTo) {
      rangeStart = dateFrom;
      rangeEnd = dateTo;
    } else if (period === "overall") {
      rangeStart = null;
      rangeEnd = null;
    } else {
      const r = monthRange(ref);
      rangeStart = r.start;
      rangeEnd = r.end;
    }

    const inRange =
      rangeStart && rangeEnd
        ? {
            date: { $gte: rangeStart, $lte: rangeEnd },
          }
        : {};

    const [totalBookings, todaysBookings, activeServices, completedAllTime, completed, pending, inProgress] =
      await Promise.all([
        safeCount(db, "bookings"),
        safeCount(db, "bookings", { date: today }),
        safeCount(db, "services"),
        safeCount(db, "bookings", { status: "Completed" }),
        safeCount(db, "bookings", { ...inRange, status: "Completed" }),
        safeCount(db, "bookings", { ...inRange, status: "Pending" }),
        safeCount(db, "bookings", { ...inRange, status: "In Progress" }),
      ]);

    const totalInRange = completed + pending + inProgress;

    return res.status(200).json({
      totalBookings,
      todaysBookings,
      activeServices,
      completedAllTime,
      today,
      attention: {
        pendingBookings: await safeCount(db, "bookings", { status: "Pending" }),
        inProgressBookings: await safeCount(db, "bookings", { status: "In Progress" }),
        availableSlotsToday: 0,
      },
      insights: {
        vehicleMix: { Hatchback: 0, Sedan: 0, SUV: 0 },
        revenueCompletedInr: 0,
        bookingsTomorrow: 0,
        jobsOnTheFloorToday: inProgress,
        tomorrow: ymdLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      },
      shopSales: {
        revenueInr: 0,
        ordersCount: 0,
        machinesRevenueInr: 0,
        accessoriesRevenueInr: 0,
        otherRevenueInr: 0,
      },
      period: {
        type: period === "overall" ? "overall" : period === "range" ? "range" : "month",
        ref,
        rangeStart,
        rangeEnd,
        ...(period === "range" && rangeStart && rangeEnd ? { dateFrom: rangeStart, dateTo: rangeEnd } : {}),
        completed,
        pending,
        inProgress,
        totalInRange,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard failed:", error);
    return res.status(500).json({ message: "Could not load dashboard." });
  }
};
