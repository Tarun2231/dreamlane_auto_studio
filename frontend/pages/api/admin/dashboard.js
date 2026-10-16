/* eslint-disable @typescript-eslint/no-require-imports */
const jwt = require("jsonwebtoken");
const { listBookings, getServices, listShopOrders } = require("../../../lib/supabaseDb");

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

const DEFAULT_JWT_SECRET = "dreamlane-secret-jwt-key-2026-secure-token";

function authAllowed(req) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;
  const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  try {
    const payload = jwt.verify(token, jwtSecret);
    return Boolean(payload && ["admin", "owner", "viewer"].includes(payload.role));
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  if (!authAllowed(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const today = ymdLocal();
  const tomorrow = ymdLocal(new Date(Date.now() + 24 * 60 * 60 * 1000));

  try {
    const [bookings, services, shopOrders] = await Promise.all([
      listBookings().catch(() => []),
      getServices().catch(() => []),
      listShopOrders().catch(() => []),
    ]);

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

    const inRangeBookings = bookings.filter((b) => {
      if (!rangeStart || !rangeEnd) return true;
      return b.date >= rangeStart && b.date <= rangeEnd;
    });

    const totalBookings = bookings.length;
    const todaysBookings = bookings.filter((b) => b.date === today).length;
    const bookingsTomorrow = bookings.filter((b) => b.date === tomorrow).length;
    const activeServices = services.length;
    const completedAllTime = bookings.filter((b) => b.status === "Completed").length;

    const completed = inRangeBookings.filter((b) => b.status === "Completed").length;
    const pending = inRangeBookings.filter((b) => b.status === "Pending").length;
    const inProgress = inRangeBookings.filter((b) => b.status === "In Progress").length;
    const totalInRange = completed + pending + inProgress;

    const revenueCompletedInr = bookings
      .filter((b) => b.status === "Completed")
      .reduce((sum, b) => sum + Number(b.finalAmount || b.estimatedPrice || 0), 0);

    const shopRevenueInr = shopOrders.reduce((sum, o) => sum + Number(o.totalInr || 0), 0);

    return res.status(200).json({
      totalBookings,
      todaysBookings,
      activeServices,
      completedAllTime,
      today,
      attention: {
        pendingBookings: pending,
        inProgressBookings: inProgress,
        availableSlotsToday: 8,
      },
      insights: {
        vehicleMix: { Hatchback: 2, Sedan: 5, SUV: 4 },
        revenueCompletedInr,
        bookingsTomorrow,
        jobsOnTheFloorToday: inProgress,
        tomorrow,
      },
      shopSales: {
        revenueInr: shopRevenueInr,
        ordersCount: shopOrders.length,
        machinesRevenueInr: Math.round(shopRevenueInr * 0.4),
        accessoriesRevenueInr: Math.round(shopRevenueInr * 0.6),
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
    console.error("GET /api/admin/dashboard failed:", error?.message);
    return res.status(200).json({
      totalBookings: 0,
      todaysBookings: 0,
      activeServices: 0,
      completedAllTime: 0,
      today,
      attention: {
        pendingBookings: 0,
        inProgressBookings: 0,
        availableSlotsToday: 0,
      },
      insights: {
        vehicleMix: { Hatchback: 0, Sedan: 0, SUV: 0 },
        revenueCompletedInr: 0,
        bookingsTomorrow: 0,
        jobsOnTheFloorToday: 0,
        tomorrow,
      },
      shopSales: {
        revenueInr: 0,
        ordersCount: 0,
        machinesRevenueInr: 0,
        accessoriesRevenueInr: 0,
        otherRevenueInr: 0,
      },
      period: {
        type: "month",
        ref: today,
        rangeStart: null,
        rangeEnd: null,
        completed: 0,
        pending: 0,
        inProgress: 0,
        totalInRange: 0,
      },
    });
  }
};
