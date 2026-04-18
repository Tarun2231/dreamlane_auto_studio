const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { storage } = require("../config/cloudinary");
const { protectAdmin } = require("../middleware/auth");
const Service = require("../models/Service");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const QuoteRequest = require("../models/QuoteRequest");
const JobCard = require("../models/JobCard");
const Inspection = require("../models/Inspection");
const { buildJobSheetPdfBuffer } = require("../utils/jobSheetPdf");
const { buildInvoicePdfBuffer } = require("../utils/invoicePdf");
const { buildCustomerDirectory } = require("../utils/customerDirectory");

const router = express.Router();
const upload = multer({ storage });

router.use(protectAdmin);

/** YYYY-MM-DD in the server’s local timezone (matches how booking `date` is stored). */
function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdToLocalDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const [y, m, d] = String(s).split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/** Monday–Sunday week (local) containing refYmd. */
function weekRangeContainingYmd(refYmd) {
  const ref = parseYmdToLocalDate(refYmd) || new Date();
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { rangeStart: ymdLocal(start), rangeEnd: ymdLocal(end) };
}

/** Full calendar month (local) containing refYmd. */
function monthRangeContainingYmd(refYmd) {
  const ref = parseYmdToLocalDate(refYmd) || new Date();
  const y = ref.getFullYear();
  const mo = ref.getMonth();
  const start = ymdLocal(new Date(y, mo, 1));
  const last = new Date(y, mo + 1, 0).getDate();
  const end = ymdLocal(new Date(y, mo, last));
  return { rangeStart: start, rangeEnd: end };
}

/** Full calendar year (local) containing refYmd. */
function yearRangeContainingYmd(refYmd) {
  const ref = parseYmdToLocalDate(refYmd) || new Date();
  const y = ref.getFullYear();
  const start = ymdLocal(new Date(y, 0, 1));
  const end = ymdLocal(new Date(y, 11, 31));
  return { rangeStart: start, rangeEnd: end };
}

function dayRangeYmd(refYmd) {
  const ref = parseYmdToLocalDate(refYmd) || new Date();
  const s = ymdLocal(ref);
  return { rangeStart: s, rangeEnd: s };
}

/** Inclusive list of YYYY-MM-DD from start through end (local calendar). */
function eachDateInclusive(startYmd, endYmd) {
  const a = parseYmdToLocalDate(startYmd);
  const b = parseYmdToLocalDate(endYmd);
  if (!a || !b || a > b) return [];
  const out = [];
  const d = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  while (d <= end) {
    out.push(ymdLocal(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Normalize to HH:mm for Slot storage (matches HTML time input). */
function normalizeSlotTime(t) {
  if (t == null) return null;
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  let mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  hh = Math.min(23, Math.max(0, hh));
  mm = Math.min(59, Math.max(0, mm));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

async function countByStatusInDateRange(rangeStart, rangeEnd) {
  const q = { date: { $gte: rangeStart, $lte: rangeEnd } };
  const [completed, pending, inProgress, totalInRange] = await Promise.all([
    Booking.countDocuments({ ...q, status: "Completed" }),
    Booking.countDocuments({ ...q, status: "Pending" }),
    Booking.countDocuments({ ...q, status: "In Progress" }),
    Booking.countDocuments(q),
  ]);
  return { completed, pending, inProgress, totalInRange };
}

/** Status counts across all bookings (no date filter). */
async function countByStatusOverall() {
  const [completed, pending, inProgress, totalInRange] = await Promise.all([
    Booking.countDocuments({ status: "Completed" }),
    Booking.countDocuments({ status: "Pending" }),
    Booking.countDocuments({ status: "In Progress" }),
    Booking.countDocuments(),
  ]);
  return { completed, pending, inProgress, totalInRange };
}

/** Global queue + today’s bookable slots (for admin dashboard). */
async function attentionSnapshot(todayYmd) {
  const [pendingBookings, inProgressBookings, availableSlotsToday] = await Promise.all([
    Booking.countDocuments({ status: "Pending" }),
    Booking.countDocuments({ status: "In Progress" }),
    Slot.countDocuments({ date: todayYmd, isAvailable: true }),
  ]);
  return { pendingBookings, inProgressBookings, availableSlotsToday };
}

/** Next calendar day after `ymd` (local). */
function nextCalendarDayYmd(ymd) {
  const d = parseYmdToLocalDate(ymd);
  if (!d) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return ymdLocal(t);
  }
  d.setDate(d.getDate() + 1);
  return ymdLocal(d);
}

function normalizeVehicleMix(rows) {
  const mix = { Hatchback: 0, Sedan: 0, SUV: 0 };
  for (const r of rows) {
    if (r._id && Object.prototype.hasOwnProperty.call(mix, r._id)) mix[r._id] = r.count;
  }
  return mix;
}

async function vehicleMixInDateRange(rangeStart, rangeEnd) {
  const rows = await Booking.aggregate([
    { $match: { date: { $gte: rangeStart, $lte: rangeEnd } } },
    { $group: { _id: "$vehicleType", count: { $sum: 1 } } },
  ]);
  return normalizeVehicleMix(rows);
}

async function vehicleMixOverall() {
  const rows = await Booking.aggregate([{ $group: { _id: "$vehicleType", count: { $sum: 1 } } }]);
  return normalizeVehicleMix(rows);
}

/**
 * Income (finalAmount), parts/misc costs from job cards, profit — for completed jobs in optional service-date range.
 * Links: each Booking has at most one JobCard (bookingId). Income is on the booking; direct costs live on the card.
 */
async function completedFinanceSnapshot(rangeStart, rangeEnd) {
  const match =
    rangeStart && rangeEnd
      ? { status: "Completed", date: { $gte: rangeStart, $lte: rangeEnd } }
      : { status: "Completed" };
  const rows = await Booking.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "jobcards",
        localField: "_id",
        foreignField: "bookingId",
        as: "jc",
      },
    },
    { $addFields: { jobCard: { $arrayElemAt: ["$jc", 0] } } },
    {
      $group: {
        _id: null,
        incomeInr: { $sum: { $ifNull: ["$finalAmount", 0] } },
        partsCostInr: { $sum: { $ifNull: ["$jobCard.partsCostInr", 0] } },
        miscCostsInr: { $sum: { $ifNull: ["$jobCard.miscCostsInr", 0] } },
      },
    },
  ]);
  const r = rows[0];
  const incomeInr = typeof r?.incomeInr === "number" && !Number.isNaN(r.incomeInr) ? r.incomeInr : 0;
  const partsCostInr = typeof r?.partsCostInr === "number" && !Number.isNaN(r.partsCostInr) ? r.partsCostInr : 0;
  const miscCostsInr = typeof r?.miscCostsInr === "number" && !Number.isNaN(r.miscCostsInr) ? r.miscCostsInr : 0;
  const totalDirectCostsInr = partsCostInr + miscCostsInr;
  return {
    incomeInr,
    partsCostInr,
    miscCostsInr,
    totalDirectCostsInr,
    profitInr: incomeInr - totalDirectCostsInr,
  };
}

/** Counts completed jobs by paymentStatus; missing field counts as unpaid. */
async function paymentMetricsOverall() {
  const base = { status: "Completed" };
  const norm = { $ifNull: ["$paymentStatus", "unpaid"] };
  const rows = await Booking.aggregate([
    { $match: base },
    { $addFields: { ps: norm } },
    {
      $facet: {
        paid: [{ $match: { ps: "paid" } }, { $count: "n" }],
        partial: [{ $match: { ps: "partial" } }, { $count: "n" }],
        unpaid: [{ $match: { ps: "unpaid" } }, { $count: "n" }],
        waived: [{ $match: { ps: "waived" } }, { $count: "n" }],
        outstandingInr: [
          { $match: { ps: { $in: ["unpaid", "partial"] } } },
          { $group: { _id: null, t: { $sum: { $ifNull: ["$finalAmount", 0] } } } },
        ],
      },
    },
  ]);
  const f = rows[0] || {};
  const pick = (arr) => (arr && arr[0] && typeof arr[0].n === "number" ? arr[0].n : 0);
  const paid = pick(f.paid);
  const partial = pick(f.partial);
  const unpaid = pick(f.unpaid);
  const waived = pick(f.waived);
  const outstandingInr =
    f.outstandingInr && f.outstandingInr[0] && typeof f.outstandingInr[0].t === "number" ? f.outstandingInr[0].t : 0;
  return {
    completedJobs: paid + partial + unpaid + waived,
    paid,
    partial,
    unpaid,
    waived,
    pendingCollection: unpaid + partial,
    outstandingInr,
  };
}

async function paymentMetricsInRange(rangeStart, rangeEnd) {
  const base = { status: "Completed", date: { $gte: rangeStart, $lte: rangeEnd } };
  const norm = { $ifNull: ["$paymentStatus", "unpaid"] };
  const rows = await Booking.aggregate([
    { $match: base },
    { $addFields: { ps: norm } },
    {
      $facet: {
        paid: [{ $match: { ps: "paid" } }, { $count: "n" }],
        partial: [{ $match: { ps: "partial" } }, { $count: "n" }],
        unpaid: [{ $match: { ps: "unpaid" } }, { $count: "n" }],
        waived: [{ $match: { ps: "waived" } }, { $count: "n" }],
        outstandingInr: [
          { $match: { ps: { $in: ["unpaid", "partial"] } } },
          { $group: { _id: null, t: { $sum: { $ifNull: ["$finalAmount", 0] } } } },
        ],
      },
    },
  ]);
  const f = rows[0] || {};
  const pick = (arr) => (arr && arr[0] && typeof arr[0].n === "number" ? arr[0].n : 0);
  const paid = pick(f.paid);
  const partial = pick(f.partial);
  const unpaid = pick(f.unpaid);
  const waived = pick(f.waived);
  const outstandingInr =
    f.outstandingInr && f.outstandingInr[0] && typeof f.outstandingInr[0].t === "number" ? f.outstandingInr[0].t : 0;
  return {
    completedJobs: paid + partial + unpaid + waived,
    paid,
    partial,
    unpaid,
    waived,
    pendingCollection: unpaid + partial,
    outstandingInr,
  };
}

/**
 * Car-service oriented snapshot: mix by body type, completed revenue in scope, tomorrow load, active jobs today,
 * and payment collection counts (completed jobs by payment status).
 * @param {boolean} isOverall - when true, mix/revenue are all-time; else scoped to rangeStart–rangeEnd.
 */
async function workshopInsights(rangeStart, rangeEnd, todayYmd, isOverall) {
  const tomorrow = nextCalendarDayYmd(todayYmd);
  const [vehicleMix, finance, bookingsTomorrow, jobsOnTheFloorToday, paymentMetrics] = await Promise.all([
    isOverall ? vehicleMixOverall() : vehicleMixInDateRange(rangeStart, rangeEnd),
    isOverall ? completedFinanceSnapshot(null, null) : completedFinanceSnapshot(rangeStart, rangeEnd),
    Booking.countDocuments({ date: tomorrow }),
    Booking.countDocuments({ date: todayYmd, status: { $in: ["Pending", "In Progress"] } }),
    isOverall ? paymentMetricsOverall() : paymentMetricsInRange(rangeStart, rangeEnd),
  ]);
  return {
    vehicleMix,
    revenueCompletedInr: finance.incomeInr,
    finance,
    paymentMetrics,
    bookingsTomorrow,
    jobsOnTheFloorToday,
    tomorrow,
  };
}

router.get("/dashboard", async (req, res) => {
  const today = ymdLocal();
  const qp = String(req.query.period || "day").toLowerCase();
  const allowed = ["day", "week", "month", "year", "overall", "range"];
  const period = allowed.includes(qp) ? qp : "day";
  const ref =
    req.query.ref && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.ref)) ? String(req.query.ref) : today;

  const dateFromQ =
    req.query.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateFrom))
      ? String(req.query.dateFrom)
      : null;
  const dateToQ =
    req.query.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateTo)) ? String(req.query.dateTo) : null;

  if (period === "overall") {
    const [totalBookings, todaysBookings, activeServices, completedAllTime, periodCounts, attention, insights] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ date: today }),
      Service.countDocuments(),
      Booking.countDocuments({ status: "Completed" }),
      countByStatusOverall(),
      attentionSnapshot(today),
      workshopInsights(today, today, today, true),
    ]);
    return res.json({
      totalBookings,
      todaysBookings,
      activeServices,
      completedAllTime,
      today,
      attention,
      insights,
      period: {
        type: "overall",
        ref,
        rangeStart: null,
        rangeEnd: null,
        ...periodCounts,
      },
    });
  }

  let rangeStart;
  let rangeEnd;
  let responseType = period;

  if (period === "range") {
    if (!dateFromQ || !dateToQ || dateFromQ > dateToQ) {
      const d = dayRangeYmd(ref);
      rangeStart = d.rangeStart;
      rangeEnd = d.rangeEnd;
      responseType = "day";
    } else {
      const days = eachDateInclusive(dateFromQ, dateToQ).length;
      const maxDays = 800;
      if (days === 0) {
        const d = dayRangeYmd(ref);
        rangeStart = d.rangeStart;
        rangeEnd = d.rangeEnd;
        responseType = "day";
      } else if (days > maxDays) {
        return res.status(400).json({ message: `Date range too large (max ${maxDays} days).` });
      } else {
        rangeStart = dateFromQ;
        rangeEnd = dateToQ;
        responseType = "range";
      }
    }
  } else if (period === "week") {
    const r = weekRangeContainingYmd(ref);
    rangeStart = r.rangeStart;
    rangeEnd = r.rangeEnd;
  } else if (period === "month") {
    const r = monthRangeContainingYmd(ref);
    rangeStart = r.rangeStart;
    rangeEnd = r.rangeEnd;
  } else if (period === "year") {
    const r = yearRangeContainingYmd(ref);
    rangeStart = r.rangeStart;
    rangeEnd = r.rangeEnd;
  } else {
    const d = dayRangeYmd(ref);
    rangeStart = d.rangeStart;
    rangeEnd = d.rangeEnd;
  }

  const [
    totalBookings,
    todaysBookings,
    activeServices,
    completedAllTime,
    periodCounts,
    attention,
    insights,
  ] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ date: today }),
    Service.countDocuments(),
    Booking.countDocuments({ status: "Completed" }),
    countByStatusInDateRange(rangeStart, rangeEnd),
    attentionSnapshot(today),
    workshopInsights(rangeStart, rangeEnd, today, false),
  ]);

  res.json({
    totalBookings,
    todaysBookings,
    activeServices,
    completedAllTime,
    today,
    attention,
    insights,
    period: {
      type: responseType,
      ref,
      ...(responseType === "range" ? { dateFrom: rangeStart, dateTo: rangeEnd } : {}),
      rangeStart,
      rangeEnd,
      ...periodCounts,
    },
  });
});

/** Normalized key for grouping the same physical vehicle across bookings and quotes. */
function fleetKeyParts(doc) {
  const vt = doc.vehicleType || "";
  const mk = String(doc.carMake || "")
    .trim()
    .toLowerCase();
  const md = String(doc.carModel || "")
    .trim()
    .toLowerCase();
  const yr = doc.vehicleYear != null && Number.isFinite(Number(doc.vehicleYear)) ? String(doc.vehicleYear) : "";
  return `${vt}|${mk}|${md}|${yr}`;
}

async function buildRecentFleet(limit, dateFromYmd, dateToYmd) {
  const cap = Math.min(120, Math.max(limit * 4, 40));
  const scoped =
    dateFromYmd &&
    dateToYmd &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(dateFromYmd)) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(dateToYmd)) &&
    String(dateFromYmd) <= String(dateToYmd);
  const bookingFind = { carMake: { $nin: [null, ""] }, carModel: { $nin: [null, ""] } };
  if (scoped) {
    bookingFind.date = { $gte: String(dateFromYmd), $lte: String(dateToYmd) };
  }
  const quoteFind = { carMake: { $nin: [null, ""] }, carModel: { $nin: [null, ""] } };
  if (scoped) {
    quoteFind.createdAt = {
      $gte: new Date(`${String(dateFromYmd)}T00:00:00.000Z`),
      $lte: new Date(`${String(dateToYmd)}T23:59:59.999Z`),
    };
  }
  const [bookings, quotes] = await Promise.all([
    Booking.find(bookingFind)
      .sort({ updatedAt: -1 })
      .limit(cap)
      .select("vehicleType carMake carModel vehicleYear customerName date updatedAt _id")
      .lean(),
    QuoteRequest.find(quoteFind)
      .sort({ updatedAt: -1 })
      .limit(cap)
      .select("vehicleType carMake carModel vehicleYear customerName createdAt updatedAt _id status")
      .lean(),
  ]);

  const items = [];
  for (const b of bookings) {
    items.push({
      kind: "booking",
      sortAt: b.updatedAt ? new Date(b.updatedAt).getTime() : 0,
      vehicleType: b.vehicleType,
      carMake: b.carMake,
      carModel: b.carModel,
      vehicleYear: b.vehicleYear,
      customerName: b.customerName,
      dateLabel: b.date,
      refId: String(b._id),
      quoteStatus: null,
    });
  }
  for (const q of quotes) {
    const u = q.updatedAt || q.createdAt;
    items.push({
      kind: "quote",
      sortAt: u ? new Date(u).getTime() : 0,
      vehicleType: q.vehicleType,
      carMake: q.carMake,
      carModel: q.carModel,
      vehicleYear: q.vehicleYear,
      customerName: q.customerName,
      dateLabel: u ? new Date(u).toISOString().slice(0, 10) : "",
      refId: String(q._id),
      quoteStatus: q.status,
    });
  }
  items.sort((a, b) => b.sortAt - a.sortAt);
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const k = fleetKeyParts(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      source: it.kind,
      vehicleType: it.vehicleType,
      carMake: it.carMake,
      carModel: it.carModel,
      vehicleYear: it.vehicleYear,
      lastCustomerName: it.customerName,
      lastActivityLabel: it.dateLabel,
      refId: it.refId,
      quoteStatus: it.quoteStatus,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Count quote requests by lifecycle stage. Optional dateFrom/dateTo (YYYY-MM-DD) filters by created date. */
router.get("/quote-stats", async (req, res) => {
  try {
    const df = req.query.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateFrom)) ? String(req.query.dateFrom) : null;
    const dt = req.query.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateTo)) ? String(req.query.dateTo) : null;
    const scope =
      df && dt && df <= dt
        ? {
            createdAt: {
              $gte: new Date(`${df}T00:00:00.000Z`),
              $lte: new Date(`${dt}T23:59:59.999Z`),
            },
          }
        : {};
    const [submitted, quoted, accepted, declined, closed, total] = await Promise.all([
      QuoteRequest.countDocuments({ ...scope, status: "Submitted" }),
      QuoteRequest.countDocuments({ ...scope, status: "Quoted" }),
      QuoteRequest.countDocuments({ ...scope, status: "Accepted" }),
      QuoteRequest.countDocuments({ ...scope, status: "Declined" }),
      QuoteRequest.countDocuments({ ...scope, status: "Closed" }),
      QuoteRequest.countDocuments(scope),
    ]);
    res.json({ submitted, quoted, accepted, declined, closed, total });
  } catch (e) {
    console.error("GET /admin/quote-stats", e);
    res.status(500).json({ message: "Could not load quote stats." });
  }
});

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * All bookings and quote requests for one structured vehicle fingerprint (same as fleet grouping).
 */
router.get("/cars/history", async (req, res) => {
  const vehicleType = String(req.query.vehicleType || "").trim();
  const carMake = String(req.query.carMake || "").trim();
  const carModel = String(req.query.carModel || "").trim();
  const vehicleYear = Number(req.query.vehicleYear);
  if (!vehicleType || !carMake || !carModel || !Number.isFinite(vehicleYear)) {
    return res.status(400).json({ message: "vehicleType, carMake, carModel, and vehicleYear are required." });
  }
  const makeRe = new RegExp(`^${escapeRegex(carMake)}$`, "i");
  const modelRe = new RegExp(`^${escapeRegex(carModel)}$`, "i");
  const match = { vehicleType, carMake: makeRe, carModel: modelRe, vehicleYear };
  try {
    const [bookings, quotes] = await Promise.all([
      Booking.find(match)
        .sort({ date: -1 })
        .limit(80)
        .select("customerName email phone date time status vehicleType carMake carModel vehicleYear finalAmount serviceId")
        .populate("serviceId", "name")
        .lean(),
      QuoteRequest.find(match)
        .sort({ updatedAt: -1 })
        .limit(80)
        .select(
          "customerName email phone status quotedAmount quoteNotes createdAt updatedAt serviceNameSnapshot serviceDescription"
        )
        .lean(),
    ]);

    res.json({
      vehicle: { vehicleType, carMake, carModel, vehicleYear },
      bookings: bookings.map((b) => ({
        _id: String(b._id),
        customerName: b.customerName,
        email: b.email,
        phone: b.phone,
        date: b.date,
        time: b.time,
        status: b.status,
        finalAmount: b.finalAmount,
        serviceName: b.serviceId && typeof b.serviceId === "object" && b.serviceId.name ? b.serviceId.name : "",
      })),
      quotes: quotes.map((q) => ({
        _id: String(q._id),
        customerName: q.customerName,
        email: q.email,
        phone: q.phone,
        status: q.status,
        quotedAmount: q.quotedAmount,
        serviceNameSnapshot: q.serviceNameSnapshot || "",
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
    });
  } catch (e) {
    console.error("GET /admin/cars/history", e);
    res.status(500).json({ message: "Could not load vehicle history." });
  }
});

/**
 * Distinct vehicles seen in bookings vs quotes, plus a de-duplicated “fleet” count and recent activity.
 */
router.get("/cars", async (req, res) => {
  const lim = Math.min(80, Math.max(5, parseInt(String(req.query.limit || "16"), 10) || 16));
  const df = req.query.dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateFrom)) ? String(req.query.dateFrom) : null;
  const dt = req.query.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.dateTo)) ? String(req.query.dateTo) : null;
  const fleetScoped = df && dt && df <= dt;
  const bookingFleetMatch = {
    carMake: { $nin: [null, ""] },
    carModel: { $nin: [null, ""] },
    ...(fleetScoped ? { date: { $gte: df, $lte: dt } } : {}),
  };
  const quoteFleetMatch = {
    carMake: { $nin: [null, ""] },
    carModel: { $nin: [null, ""] },
    ...(fleetScoped
      ? {
          createdAt: {
            $gte: new Date(`${df}T00:00:00.000Z`),
            $lte: new Date(`${dt}T23:59:59.999Z`),
          },
        }
      : {}),
  };
  try {
    const [bookingKeys, quoteKeys, recentRaw] = await Promise.all([
      Booking.aggregate([
        { $match: bookingFleetMatch },
        {
          $project: {
            k: {
              $concat: [
                { $ifNull: ["$vehicleType", ""] },
                "|",
                { $toLower: { $trim: { input: { $ifNull: ["$carMake", ""] } } } },
                "|",
                { $toLower: { $trim: { input: { $ifNull: ["$carModel", ""] } } } },
                "|",
                { $toString: { $ifNull: ["$vehicleYear", ""] } },
              ],
            },
          },
        },
        { $group: { _id: "$k" } },
      ]),
      QuoteRequest.aggregate([
        { $match: quoteFleetMatch },
        {
          $project: {
            k: {
              $concat: [
                { $ifNull: ["$vehicleType", ""] },
                "|",
                { $toLower: { $trim: { input: { $ifNull: ["$carMake", ""] } } } },
                "|",
                { $toLower: { $trim: { input: { $ifNull: ["$carModel", ""] } } } },
                "|",
                { $toString: { $ifNull: ["$vehicleYear", ""] } },
              ],
            },
          },
        },
        { $group: { _id: "$k" } },
      ]),
      buildRecentFleet(lim, fleetScoped ? df : null, fleetScoped ? dt : null),
    ]);

    const union = new Set();
    for (const r of bookingKeys) union.add(r._id);
    for (const r of quoteKeys) union.add(r._id);

    const q = String(req.query.q || "")
      .trim()
      .toLowerCase();
    let recent = recentRaw;
    if (q) {
      recent = recentRaw.filter((r) => {
        const hay = `${r.vehicleType || ""} ${r.carMake || ""} ${r.carModel || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    res.json({
      stats: {
        distinctFromBookings: bookingKeys.length,
        distinctFromQuotes: quoteKeys.length,
        distinctUnion: union.size,
      },
      recent,
    });
  } catch (e) {
    console.error("GET /admin/cars", e);
    res.status(500).json({ message: "Could not load fleet snapshot." });
  }
});

router.post("/service", async (req, res) => {
  const service = await Service.create(req.body);
  res.status(201).json(service);
});

router.put("/service/:id", async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!service) return res.status(404).json({ message: "Service not found" });
  res.json(service);
});

router.delete("/service/:id", async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.post("/slots", async (req, res) => {
  const slot = await Slot.create(req.body);
  res.status(201).json(slot);
});

/**
 * Create many slots: every combination of (each day in [dateFrom..dateTo]) × (each time).
 * Skips duplicates (unique date+time). New slots are available by default.
 */
router.post("/slots/bulk-create", async (req, res) => {
  const { dateFrom, dateTo, times } = req.body || {};
  if (!dateFrom || !dateTo) {
    return res.status(400).json({ message: "dateFrom and dateTo are required (YYYY-MM-DD)." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateFrom)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateTo))) {
    return res.status(400).json({ message: "Dates must be YYYY-MM-DD." });
  }
  if (!Array.isArray(times) || times.length === 0) {
    return res.status(400).json({ message: "times must be a non-empty array of HH:mm values." });
  }

  const dates = eachDateInclusive(String(dateFrom), String(dateTo));
  if (dates.length === 0) {
    return res.status(400).json({ message: "Invalid date range (from must be on or before to)." });
  }
  if (dates.length > 400) {
    return res.status(400).json({ message: "Date range too large (max 400 days per request)." });
  }

  const normalizedTimes = [...new Set(times.map(normalizeSlotTime).filter(Boolean))];
  if (normalizedTimes.length === 0) {
    return res.status(400).json({ message: "Add at least one valid time (e.g. 09:00)." });
  }
  if (normalizedTimes.length > 48) {
    return res.status(400).json({ message: "Too many times (max 48 per request)." });
  }

  let created = 0;
  let skippedDuplicates = 0;
  for (const date of dates) {
    for (const time of normalizedTimes) {
      try {
        await Slot.create({ date, time, isAvailable: true });
        created++;
      } catch (e) {
        if (e && e.code === 11000) skippedDuplicates++;
        else throw e;
      }
    }
  }

  res.status(201).json({
    ok: true,
    created,
    skippedDuplicates,
    days: dates.length,
    timesUsed: normalizedTimes,
  });
});

router.put("/slots/:id", async (req, res) => {
  const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!slot) return res.status(404).json({ message: "Slot not found" });
  res.json(slot);
});

/** Bulk actions on selected slot ids (from admin multi-select). */
router.post("/slots/bulk", async (req, res) => {
  const { ids, action } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Provide a non-empty ids array." });
  }
  const valid = [...new Set(ids)].filter((id) => mongoose.isValidObjectId(String(id)));
  if (valid.length === 0) {
    return res.status(400).json({ message: "No valid slot ids." });
  }

  if (action === "delete") {
    const result = await Slot.deleteMany({ _id: { $in: valid } });
    return res.json({ ok: true, deleted: result.deletedCount });
  }
  if (action === "enable") {
    const result = await Slot.updateMany({ _id: { $in: valid } }, { $set: { isAvailable: true } });
    return res.json({ ok: true, modified: result.modifiedCount });
  }
  if (action === "disable") {
    const result = await Slot.updateMany({ _id: { $in: valid } }, { $set: { isAvailable: false } });
    return res.json({ ok: true, modified: result.modifiedCount });
  }
  return res.status(400).json({ message: "action must be delete, enable, or disable." });
});

router.get("/bookings", async (req, res) => {
  const { date, dateFrom, dateTo, status, paymentStatus } = req.query;
  const query = {};
  if (dateFrom && dateTo) {
    query.date = { $gte: String(dateFrom), $lte: String(dateTo) };
  } else if (dateFrom) {
    query.date = String(dateFrom);
  } else if (date) {
    query.date = String(date);
  }
  if (status) query.status = String(status);
  if (paymentStatus) {
    const ps = String(paymentStatus).toLowerCase();
    if (ps === "unpaid") {
      query.$or = [{ paymentStatus: "unpaid" }, { paymentStatus: { $exists: false } }, { paymentStatus: null }];
    } else if (["partial", "paid", "waived"].includes(ps)) {
      query.paymentStatus = ps;
    }
  }
  const bookings = await Booking.find(query)
    .populate("serviceId")
    .sort({ createdAt: -1 });
  res.json(bookings);
});

router.put("/booking/status/:id", async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (status === "In Progress") {
    const inspection = await Inspection.findOne({ bookingId: booking._id });
    if (!inspection || inspection.beforeImages.length === 0) {
      return res.status(400).json({ message: "Before service images are mandatory." });
    }
  }

  booking.status = status;
  await booking.save();
  res.json(booking);
});

router.post("/job-card/:bookingId", async (req, res) => {
  const data = { bookingId: req.params.bookingId, ...req.body };
  const jobCard = await JobCard.findOneAndUpdate({ bookingId: req.params.bookingId }, data, {
    new: true,
    upsert: true,
  });
  res.json(jobCard);
});

router.get("/job-card/:bookingId", async (req, res) => {
  const jobCard = await JobCard.findOne({ bookingId: req.params.bookingId });
  res.json(jobCard || null);
});

router.post("/upload-images/:bookingId", upload.array("images", 10), async (req, res) => {
  const { type } = req.body;
  if (!["before", "after"].includes(type)) {
    return res.status(400).json({ message: "Invalid image type" });
  }

  const images = req.files.map((file) => ({ url: file.path, uploadedAt: new Date() }));

  const inspection = await Inspection.findOne({ bookingId: req.params.bookingId });
  const base = inspection || new Inspection({ bookingId: req.params.bookingId });
  if (type === "before") base.beforeImages.push(...images);
  if (type === "after") base.afterImages.push(...images);
  base.timestamps.push(new Date());
  await base.save();

  res.status(201).json(base);
});

router.get("/inspection/:bookingId", async (req, res) => {
  const inspection = await Inspection.findOne({ bookingId: req.params.bookingId });
  res.json(inspection || null);
});

/**
 * Save final amount (customer payment / income) and spare-parts & other job costs together.
 * Dashboard P&L uses completed jobs: income from finalAmount, costs from the job card.
 */
router.put("/booking/:bookingId/payment-pl", async (req, res) => {
  const { finalAmount, partsCostInr, miscCostsInr, paymentMethod, paymentReference, paymentReceivedYmd, paymentStatus } =
    req.body || {};
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const allowedPaymentStatus = new Set(["unpaid", "partial", "paid", "waived"]);
  if (paymentStatus !== undefined && paymentStatus !== null && paymentStatus !== "") {
    const s = String(paymentStatus).toLowerCase();
    if (allowedPaymentStatus.has(s)) booking.paymentStatus = s;
  }

  if (finalAmount !== undefined && finalAmount !== null && finalAmount !== "") {
    const n = Number(finalAmount);
    booking.finalAmount = Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  if (paymentMethod !== undefined && paymentMethod !== null) {
    booking.paymentMethod = String(paymentMethod).trim().slice(0, 80);
  }
  if (paymentReference !== undefined && paymentReference !== null) {
    booking.paymentReference = String(paymentReference).trim().slice(0, 160);
  }
  if (paymentReceivedYmd !== undefined && paymentReceivedYmd !== null) {
    const s = String(paymentReceivedYmd).trim();
    booking.paymentReceivedYmd = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }
  await booking.save();

  const jc = {};
  if (partsCostInr !== undefined && partsCostInr !== null && partsCostInr !== "") {
    const n = Number(partsCostInr);
    jc.partsCostInr = Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  if (miscCostsInr !== undefined && miscCostsInr !== null && miscCostsInr !== "") {
    const n = Number(miscCostsInr);
    jc.miscCostsInr = Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  if (Object.keys(jc).length > 0) {
    await JobCard.findOneAndUpdate({ bookingId: booking._id }, { $set: { ...jc, bookingId: booking._id } }, { upsert: true, new: true });
  }

  const populated = await Booking.findById(booking._id).populate("serviceId");
  res.json(populated);
});

/** Record final payment amount on the booking (shown on PDF). */
router.put("/booking/:bookingId", async (req, res) => {
  const { finalAmount } = req.body;
  const update = {};
  if (finalAmount !== undefined && finalAmount !== null && finalAmount !== "") {
    const n = Number(finalAmount);
    update.finalAmount = Number.isFinite(n) ? n : 0;
  }
  const booking = await Booking.findByIdAndUpdate(req.params.bookingId, update, { new: true }).populate("serviceId");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  res.json(booking);
});

router.get("/bookings/:bookingId/job-sheet.pdf", async (req, res) => {
  try {
    const buf = await buildJobSheetPdfBuffer(req.params.bookingId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="job-sheet-${req.params.bookingId}.pdf"`);
    res.send(buf);
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message || "Could not generate PDF" });
  }
});

router.get("/bookings/:bookingId/invoice.pdf", async (req, res) => {
  try {
    const buf = await buildInvoicePdfBuffer(req.params.bookingId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${req.params.bookingId}.pdf"`);
    res.send(buf);
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message || "Could not generate invoice PDF" });
  }
});

router.post("/bookings/:bookingId/email-invoice", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("serviceId");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({
        message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) to backend/.env.",
      });
    }

    const pdfBuffer = await buildInvoicePdfBuffer(req.params.bookingId);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@carcare.com",
      to: booking.email,
      subject: `Invoice — ${booking.customerName} (${booking.date})`,
      text: `Hello ${booking.customerName},\n\nPlease find your invoice attached as a PDF.\n\nThank you.\n`,
      attachments: [{ filename: `invoice-${booking._id}.pdf`, content: pdfBuffer }],
    });

    res.json({ ok: true, message: "Invoice emailed to the customer." });
  } catch (e) {
    console.error("email-invoice:", e);
    res.status(500).json({ message: e.message || "Failed to send email" });
  }
});

router.post("/bookings/:bookingId/email-job-sheet", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate("serviceId");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(400).json({
        message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) to backend/.env.",
      });
    }

    const pdfBuffer = await buildJobSheetPdfBuffer(req.params.bookingId);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@carcare.com",
      to: booking.email,
      subject: `Job sheet & service summary — ${booking.customerName} (${booking.date})`,
      text: `Hello ${booking.customerName},\n\nAttached is your job sheet with service details, before/after photos (if uploaded), and payment summary.\n\nThank you for choosing us.\n`,
      attachments: [{ filename: `job-sheet-${booking._id}.pdf`, content: pdfBuffer }],
    });

    res.json({ ok: true, message: "Job sheet emailed to the customer." });
  } catch (e) {
    console.error("email-job-sheet:", e);
    res.status(500).json({ message: e.message || "Failed to send email" });
  }
});

router.get("/customers", async (req, res) => {
  try {
    const { dateFrom, dateTo, q, phone } = req.query;
    const data = await buildCustomerDirectory({
      dateFrom: dateFrom ? String(dateFrom) : undefined,
      dateTo: dateTo ? String(dateTo) : undefined,
      q: q ? String(q) : undefined,
      phone: phone ? String(phone) : undefined,
    });
    res.json(data);
  } catch (e) {
    console.error("GET /customers:", e);
    res.status(500).json({ message: e.message || "Could not load customers." });
  }
});

/** Manual outreach (offers, notes) — uses SMTP from backend/.env */
router.post("/customers/send-email", async (req, res) => {
  const { to, subject, text } = req.body || {};
  if (!to || !subject || typeof text !== "string") {
    return res.status(400).json({ message: "to, subject, and text are required." });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(400).json({
      message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to backend/.env.",
    });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@carcare.com",
      to: String(to).trim(),
      subject: String(subject).trim(),
      text: text.trim(),
    });
    res.json({ ok: true, message: "Email sent." });
  } catch (e) {
    console.error("POST /customers/send-email:", e);
    res.status(500).json({ message: e.message || "Failed to send email." });
  }
});

/** List quotation requests (newest first). */
router.get("/quote-requests", async (req, res) => {
  const { status } = req.query;
  const query = {};
  if (status && String(status).trim()) {
    query.status = String(status).trim();
  }
  const list = await QuoteRequest.find(query).populate("serviceId").sort({ createdAt: -1 }).limit(500);
  res.json(list);
});

/** Update quotation (amount, notes, status). */
router.put("/quote-request/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid id." });
  }
  const { quotedAmount, quoteNotes, status } = req.body || {};
  const update = {};
  if (quotedAmount !== undefined && quotedAmount !== null && quotedAmount !== "") {
    const n = Number(quotedAmount);
    update.quotedAmount = Number.isFinite(n) ? n : 0;
  }
  if (quoteNotes !== undefined && typeof quoteNotes === "string") {
    update.quoteNotes = quoteNotes.trim();
  }
  const explicitStatus = status && ["Submitted", "Quoted", "Accepted", "Declined", "Closed"].includes(String(status));
  if (explicitStatus) {
    update.status = String(status);
  } else if (update.quotedAmount != null && update.quotedAmount > 0) {
    update.status = "Quoted";
    update.quotedAt = new Date();
  }
  const quote = await QuoteRequest.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!quote) return res.status(404).json({ message: "Quote request not found." });
  res.json(quote);
});

/** Email the customer their quotation (uses SMTP). */
router.post("/quote-request/:id/email-quote", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid id." });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(400).json({
      message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to backend/.env.",
    });
  }
  const quote = await QuoteRequest.findById(req.params.id);
  if (!quote) return res.status(404).json({ message: "Quote request not found." });
  const amt = Number(quote.quotedAmount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return res.status(400).json({ message: "Set a quoted amount before emailing." });
  }

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const body = `Hi ${quote.customerName},\n\nThank you for your enquiry. Here is our quotation for your reference ${quote._id}.\n\nQuoted amount: ${fmt.format(amt)}\n\n${quote.quoteNotes ? `Details:\n${quote.quoteNotes}\n\n` : ""}If you are happy with this, please open the “Track quote” link on our website, enter this reference ID and your email, and click Accept. You can then book a service slot or we will contact you to schedule.\n\nIf you have questions, reply to this email or call us.\n\nThank you.`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@carcare.com",
      to: quote.email,
      subject: `Your service quotation — ${String(quote._id).slice(-8)}`,
      text: body,
    });
    quote.status = "Quoted";
    quote.quotedAt = quote.quotedAt || new Date();
    await quote.save();
    res.json({ ok: true, message: "Quotation emailed.", quote });
  } catch (e) {
    console.error("email-quote:", e);
    res.status(500).json({ message: e.message || "Failed to send email." });
  }
});

module.exports = router;
