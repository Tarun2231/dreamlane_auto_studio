const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const { storage, serviceImageStorage, shopProductImageStorage, isCloudinaryConfigured } = require("../config/cloudinary");
const { localServiceImage, localShopProductImage, publicImageUrl } = require("../config/localImageUpload");
const { protectAdmin } = require("../middleware/auth");
const AdminLoginEvent = require("../models/AdminLoginEvent");
const ShopOrder = require("../models/ShopOrder");
const ShopProduct = require("../models/ShopProduct");
const Service = require("../models/Service");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const QuoteRequest = require("../models/QuoteRequest");
const Review = require("../models/Review");
const SitePresence = require("../models/SitePresence");
const JobCard = require("../models/JobCard");
const Inspection = require("../models/Inspection");
const { buildJobSheetPdfBuffer } = require("../utils/jobSheetPdf");
const { buildInvoicePdfBuffer } = require("../utils/invoicePdf");
const { buildCustomerDirectory } = require("../utils/customerDirectory");
const { effectiveUnitPriceInr, slugify } = require("../utils/shopHelpers");

const router = express.Router();

async function shopSalesSnapshot(isOverall, rangeStart, rangeEnd) {
  const match = { status: { $ne: "cancelled" } };
  if (!isOverall && rangeStart && rangeEnd) {
    match.orderDateYmd = { $gte: String(rangeStart), $lte: String(rangeEnd) };
  }
  const [totals, groupRows] = await Promise.all([
    ShopOrder.aggregate([
      { $match: match },
      { $group: { _id: null, revenueInr: { $sum: "$totalInr" }, ordersCount: { $sum: 1 } } },
    ]),
    ShopOrder.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $ifNull: ["$items.productGroup", "accessory"] },
          revenueInr: { $sum: "$items.lineTotal" },
        },
      },
    ]),
  ]);
  const row = totals[0];
  const out = {
    revenueInr: row && Number.isFinite(row.revenueInr) ? row.revenueInr : 0,
    ordersCount: row && Number.isFinite(row.ordersCount) ? row.ordersCount : 0,
    machinesRevenueInr: 0,
    accessoriesRevenueInr: 0,
    otherRevenueInr: 0,
  };
  for (const g of groupRows) {
    const k = g._id;
    const v = Number.isFinite(g.revenueInr) ? g.revenueInr : 0;
    if (k === "machine") out.machinesRevenueInr = v;
    else if (k === "accessory") out.accessoriesRevenueInr = v;
    else if (k === "other") out.otherRevenueInr = v;
  }
  return out;
}
const upload = multer({ storage });
const imageUploadLimits = { fileSize: 5 * 1024 * 1024 };
const imageFileFilter = (req, file, cb) => {
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed."));
  }
  cb(null, true);
};
const uploadServiceImage = multer({
  storage: serviceImageStorage,
  limits: imageUploadLimits,
  fileFilter: imageFileFilter,
});
const uploadShopProductImage = multer({
  storage: shopProductImageStorage,
  limits: imageUploadLimits,
  fileFilter: imageFileFilter,
});

const threadAttachmentDir = path.join(__dirname, "..", "..", "uploads", "public", "thread-attachments");
fs.mkdirSync(threadAttachmentDir, { recursive: true });
const threadAttachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, threadAttachmentDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(String(file.originalname || "")).toLowerCase();
      const ok = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"].includes(ext) ? ext : "";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ok || ""}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mt = String(file.mimetype || "").toLowerCase();
    if (/^image\/(jpeg|jpg|png|gif|webp)$/.test(mt) || mt === "application/pdf") return cb(null, true);
    cb(new Error("Only images (JPG/PNG/GIF/WebP) and PDF files are allowed."));
  },
});

function sanitizeMessageAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 5)
    .map((a) => ({
      kind: a?.kind === "pdf" ? "pdf" : "image",
      url: typeof a?.url === "string" ? a.url.trim() : "",
      name: typeof a?.name === "string" ? a.name.trim().slice(0, 180) : "",
      sizeBytes: Number.isFinite(Number(a?.sizeBytes)) ? Math.max(0, Number(a.sizeBytes)) : 0,
      mimeType: typeof a?.mimeType === "string" ? a.mimeType.trim().slice(0, 120) : "",
    }))
    .filter((a) => a.url.startsWith("/api/uploads/thread-attachments/"));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMailCard({ eyebrow, title, intro, bodyHtml, ctaLabel, ctaHref, footnote }) {
  const cta = ctaLabel && ctaHref
    ? `<a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:700">${escapeHtml(ctaLabel)}</a>`
    : "";
  return `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f4f7fb;padding:18px">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e7ecf3;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f172a,#2563eb);padding:16px 20px;color:#fff">
          <div style="font-size:12px;letter-spacing:.08em;opacity:.85;text-transform:uppercase">${escapeHtml(eyebrow || "Update")}</div>
          <h2 style="margin:6px 0 0 0;font-size:20px;line-height:1.25">${escapeHtml(title || "Notification")}</h2>
        </div>
        <div style="padding:18px 20px;color:#0f172a">
          <p style="margin:0 0 10px 0">${escapeHtml(intro || "")}</p>
          <div style="padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;margin:0 0 14px 0">${bodyHtml || ""}</div>
          ${cta}
          ${footnote ? `<p style="margin:12px 0 0 0;font-size:12px;color:#64748b">${escapeHtml(footnote)}</p>` : ""}
        </div>
      </div>
    </div>
  `;
}

router.use(protectAdmin);

/** Admin-controlled public support badge status (homepage: online/offline). */
router.get("/site-presence", async (_req, res) => {
  try {
    let doc = await SitePresence.findOne().lean();
    if (!doc) {
      doc = await SitePresence.create({ supportStatus: "online" });
      doc = doc.toObject();
    }
    res.json({
      supportStatus: ["online", "offline", "break"].includes(String(doc.supportStatus)) ? doc.supportStatus : "online",
      updatedAt: doc.updatedAt || null,
      updatedByEmail: doc.updatedByEmail || "",
    });
  } catch (e) {
    console.error("GET /admin/site-presence", e);
    res.status(500).json({ message: "Could not load support status." });
  }
});

router.put("/site-presence", async (req, res) => {
  try {
    const next = String(req.body?.supportStatus || "").toLowerCase();
    if (!["online", "offline", "break"].includes(next)) {
      return res.status(400).json({ message: "supportStatus must be online, offline, or break." });
    }
    const updated = await SitePresence.findOneAndUpdate(
      {},
      { $set: { supportStatus: next, updatedByEmail: String(req.user?.email || "") } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({
      supportStatus: updated.supportStatus,
      updatedAt: updated.updatedAt || null,
      updatedByEmail: updated.updatedByEmail || "",
    });
  } catch (e) {
    console.error("PUT /admin/site-presence", e);
    res.status(500).json({ message: "Could not update support status." });
  }
});

/** Recent successful admin sign-ins (IP + geo label from login time). */
router.get("/login-history", async (req, res) => {
  try {
    const raw = Number(req.query.limit);
    const limit = Math.min(100, Math.max(1, Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 25));
    const rows = await AdminLoginEvent.find()
      .sort({ at: -1 })
      .limit(limit)
      .select("at email name ip locationLabel userAgent isoUtc timezoneLine")
      .lean();

    res.json({
      items: rows.map((row) => ({
        id: String(row._id),
        at: row.at,
        email: row.email,
        name: row.name || "",
        ip: row.ip || "",
        locationLabel: row.locationLabel || "",
        userAgent: row.userAgent || "",
        isoUtc: row.isoUtc || "",
        timezoneLine: row.timezoneLine || "",
      })),
    });
  } catch (err) {
    console.error("GET /admin/login-history", err);
    return res.status(500).json({ message: "Could not load login history" });
  }
});

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

function formatYmdLocal(d = new Date()) {
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function normalizedRequestKind(q) {
  if (q && q.requestKind === "enquiry") return "enquiry";
  return "quotation";
}

async function buildAdminNotifications(limit = 40) {
  const perBucket = Math.min(40, Math.max(10, Math.ceil(limit / 2)));
  const [bookings, quotes, payments] = await Promise.all([
    Booking.find()
      .sort({ createdAt: -1 })
      .limit(perBucket)
      .select("_id customerName date time carMake carModel vehicleYear createdAt")
      .lean(),
    QuoteRequest.find()
      .sort({ createdAt: -1 })
      .limit(perBucket)
      .select("_id customerName requestKind enquiryTopic serviceNameSnapshot serviceDescription createdAt lastThreadActivityAt messages")
      .lean(),
    Booking.find({
      paymentStatus: { $in: ["paid", "partial"] },
      $or: [{ paymentReceivedYmd: { $exists: true, $ne: "" } }, { finalAmount: { $gt: 0 } }],
    })
      .sort({ updatedAt: -1 })
      .limit(perBucket)
      .select("_id customerName finalAmount paymentStatus paymentReceivedYmd updatedAt")
      .lean(),
  ]);

  const bookingEvents = bookings.map((b) => {
    const vehicle = [b.carMake, b.carModel].filter(Boolean).join(" ");
    const suffix = b.vehicleYear ? ` (${b.vehicleYear})` : "";
    return {
      id: `booking-${String(b._id)}`,
      kind: "booking",
      title: "New booking received",
      message: `${b.customerName || "Customer"}${vehicle ? ` · ${vehicle}${suffix}` : ""}${b.date ? ` · ${b.date}${b.time ? ` ${b.time}` : ""}` : ""}`,
      href: `/admin/bookings`,
      at: b.createdAt || new Date(),
    };
  });

  const quoteEvents = quotes.map((q) => {
    const rk = normalizedRequestKind(q);
    const title = rk === "enquiry" ? "New enquiry received" : "New quotation request";
    const topic = rk === "enquiry" ? q.enquiryTopic || q.serviceDescription || "Customer enquiry" : q.serviceNameSnapshot || q.serviceDescription || "Quotation request";
    return {
      id: `quote-${String(q._id)}`,
      kind: rk,
      title,
      message: `${q.customerName || "Customer"} · ${String(topic).slice(0, 120)}`,
      href: rk === "enquiry" ? `/admin/enquiries?open=${encodeURIComponent(String(q._id))}` : `/admin/quotes?open=${encodeURIComponent(String(q._id))}`,
      at: q.createdAt || new Date(),
    };
  });

  const threadEvents = quotes
    .map((q) => {
      const rk = normalizedRequestKind(q);
      const arr = Array.isArray(q.messages) ? q.messages : [];
      const lastMsg = arr.length > 0 ? arr[arr.length - 1] : null;
      if (!lastMsg || lastMsg.role !== "customer") return null;
      const at = q.lastThreadActivityAt || lastMsg.createdAt || q.createdAt || new Date();
      const snippet = String(lastMsg.body || "").trim().slice(0, 96);
      return {
        id: `thread-${String(q._id)}-${new Date(at).toISOString()}`,
        kind: rk === "enquiry" ? "enquiry-message" : "quotation-message",
        title: rk === "enquiry" ? "New customer reply on enquiry" : "New customer reply on quotation",
        message: `${q.customerName || "Customer"}${snippet ? ` · ${snippet}` : ""}`,
        href: rk === "enquiry" ? `/admin/enquiries?open=${encodeURIComponent(String(q._id))}` : `/admin/quotes?open=${encodeURIComponent(String(q._id))}`,
        at,
      };
    })
    .filter(Boolean);

  const paymentEvents = payments.map((b) => {
    const amount = Number.isFinite(Number(b.finalAmount)) ? Number(b.finalAmount) : 0;
    return {
      id: `payment-${String(b._id)}-${String(b.updatedAt || "")}`,
      kind: "payment",
      title: "Payment received",
      message: `${b.customerName || "Customer"} · ${amount > 0 ? `INR ${Math.round(amount).toLocaleString("en-IN")}` : "Amount updated"}${b.paymentStatus ? ` · ${String(b.paymentStatus).toUpperCase()}` : ""}${b.paymentReceivedYmd ? ` · ${formatYmdLocal(b.paymentReceivedYmd)}` : ""}`,
      href: `/admin/bookings`,
      at: b.updatedAt || new Date(),
    };
  });

  return [...bookingEvents, ...quoteEvents, ...threadEvents, ...paymentEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, Math.min(120, Math.max(10, limit)));
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
    const [totalBookings, todaysBookings, activeServices, completedAllTime, periodCounts, attention, insights, shopSales] =
      await Promise.all([
        Booking.countDocuments(),
        Booking.countDocuments({ date: today }),
        Service.countDocuments(),
        Booking.countDocuments({ status: "Completed" }),
        countByStatusOverall(),
        attentionSnapshot(today),
        workshopInsights(today, today, today, true),
        shopSalesSnapshot(true, null, null),
      ]);
    return res.json({
      totalBookings,
      todaysBookings,
      activeServices,
      completedAllTime,
      today,
      attention,
      insights,
      shopSales,
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
    shopSales,
  ] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ date: today }),
    Service.countDocuments(),
    Booking.countDocuments({ status: "Completed" }),
    countByStatusInDateRange(rangeStart, rangeEnd),
    attentionSnapshot(today),
    workshopInsights(rangeStart, rangeEnd, today, false),
    shopSalesSnapshot(false, rangeStart, rangeEnd),
  ]);

  res.json({
    totalBookings,
    todaysBookings,
    activeServices,
    completedAllTime,
    today,
    attention,
    insights,
    shopSales,
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

router.get("/notifications", async (req, res) => {
  try {
    const limitRaw = Number(req.query.limit);
    const limit = Math.min(120, Math.max(10, Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 40));
    const items = await buildAdminNotifications(limit);
    res.json({ items, generatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("GET /admin/notifications", e);
    res.status(500).json({ message: "Could not load notifications." });
  }
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
    const [submitted, pending, quoted, accepted, declined, closed, total] = await Promise.all([
      QuoteRequest.countDocuments({ ...scope, status: "Submitted" }),
      QuoteRequest.countDocuments({ ...scope, status: "Pending" }),
      QuoteRequest.countDocuments({ ...scope, status: "Quoted" }),
      QuoteRequest.countDocuments({ ...scope, status: "Accepted" }),
      QuoteRequest.countDocuments({ ...scope, status: "Declined" }),
      QuoteRequest.countDocuments({ ...scope, status: "Closed" }),
      QuoteRequest.countDocuments(scope),
    ]);
    res.json({ submitted, pending, quoted, accepted, declined, closed, total });
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

/** Upload a service hero image. Uses Cloudinary when configured; otherwise saves under /api/uploads/service-images/. */
router.post("/upload/service-image", (req, res, next) => {
  const uploader = isCloudinaryConfigured() ? uploadServiceImage : localServiceImage;
  uploader.single("image")(req, res, (err) => {
    if (err) {
      const msg = err.message || "Upload failed.";
      return res.status(400).json({ message: msg });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const url = isCloudinaryConfigured()
      ? req.file.path
      : publicImageUrl("service-images", req.file.filename);
    res.json({ url });
  } catch (e) {
    console.error("POST /upload/service-image", e);
    res.status(500).json({ message: e.message || "Upload failed." });
  }
});

/** Upload a shop product image. Uses Cloudinary when configured; otherwise saves under /api/uploads/shop-products/. */
router.post("/upload/shop-product-image", (req, res, next) => {
  const uploader = isCloudinaryConfigured() ? uploadShopProductImage : localShopProductImage;
  uploader.single("image")(req, res, (err) => {
    if (err) {
      const msg = err.message || "Upload failed.";
      return res.status(400).json({ message: msg });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    const url = isCloudinaryConfigured()
      ? req.file.path
      : publicImageUrl("shop-products", req.file.filename);
    res.json({ url });
  } catch (e) {
    console.error("POST /upload/shop-product-image", e);
    res.status(500).json({ message: e.message || "Upload failed." });
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

/** Single booking + job card for admin drill-down (e.g. customer service history). */
router.get("/bookings/:bookingId", async (req, res) => {
  try {
    const id = req.params.bookingId;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid booking id." });
    const booking = await Booking.findById(id).populate("serviceId");
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    const jc = await JobCard.findOne({ bookingId: id }).lean();
    const jobCard = jc
      ? {
          servicesDone: Array.isArray(jc.servicesDone) ? jc.servicesDone : [],
          partsUsed: Array.isArray(jc.partsUsed) ? jc.partsUsed : [],
          extraCharges: jc.extraCharges != null ? Number(jc.extraCharges) : 0,
          partsCostInr: jc.partsCostInr != null ? Number(jc.partsCostInr) : 0,
          miscCostsInr: jc.miscCostsInr != null ? Number(jc.miscCostsInr) : 0,
          notes: jc.notes ? String(jc.notes) : "",
        }
      : null;
    res.json({ booking, jobCard });
  } catch (e) {
    console.error("GET /admin/bookings/:bookingId", e);
    res.status(500).json({ message: "Could not load booking" });
  }
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
        message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) to frontend/backend/.env.",
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
        message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) to frontend/backend/.env.",
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

/** Manual outreach (offers, notes) — uses SMTP from frontend/backend/.env */
router.post("/customers/send-email", async (req, res) => {
  const { to, subject, text } = req.body || {};
  if (!to || !subject || typeof text !== "string") {
    return res.status(400).json({ message: "to, subject, and text are required." });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(400).json({
      message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to frontend/backend/.env.",
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

/** List quotation / enquiry requests (newest thread activity first; message counts without full thread payload). */
router.get("/quote-requests", async (req, res) => {
  const { status, kind, dateFrom, dateTo } = req.query;
  const query = {};
  if (status && String(status).trim()) {
    query.status = String(status).trim();
  }
  const k = kind ? String(kind).trim().toLowerCase() : "";
  if (k === "enquiry") {
    query.requestKind = "enquiry";
  } else if (k === "quotation") {
    query.$or = [
      { requestKind: "quotation" },
      { requestKind: { $exists: false } },
      { requestKind: null },
    ];
  }
  const df = dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(String(dateFrom)) ? String(dateFrom) : "";
  const dt = dateTo && /^\d{4}-\d{2}-\d{2}$/.test(String(dateTo)) ? String(dateTo) : "";
  if (df && dt && df <= dt) {
    query.createdAt = {
      $gte: new Date(`${df}T00:00:00.000Z`),
      $lte: new Date(`${dt}T23:59:59.999Z`),
    };
  }
  const list = await QuoteRequest.find(query).populate("serviceId").sort({ lastThreadActivityAt: -1, createdAt: -1 }).limit(500).lean();
  const out = list.map((r) => {
    const messageCount = Array.isArray(r.messages) ? r.messages.length : 0;
    const hasUnreadCustomerMessage =
      r.status !== "Closed" &&
      Array.isArray(r.messages) &&
      r.messages.length > 0
        ? String(r.messages[r.messages.length - 1]?.role || "") === "customer"
        : false;
    const { messages, ...rest } = r;
    return { ...rest, messageCount, hasUnreadCustomerMessage };
  });
  res.json(out);
});

/** Single quotation with full message thread (admin). */
router.get("/quote-request/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
  const quote = await QuoteRequest.findById(req.params.id).populate("serviceId");
  if (!quote) return res.status(404).json({ message: "Quote request not found." });
  res.json(quote);
});

/** Workshop reply in the enquiry conversation. */
router.post("/quote-request/:id/message", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  const attachments = sanitizeMessageAttachments(req.body?.attachments);
  if ((!body && attachments.length === 0) || body.length > 8000) {
    return res.status(400).json({ message: "Message or attachment is required (max 8000 characters)." });
  }
  const existing = await QuoteRequest.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Quote request not found." });
  const adminEmail = req.user?.email || "";
  const adminLabel = adminEmail.includes("@") ? adminEmail.split("@")[0].slice(0, 80) : "Workshop";
  const now = new Date();
  const quote = await QuoteRequest.findByIdAndUpdate(
    req.params.id,
    {
      $push: { messages: { role: "admin", body, attachments, createdAt: now, adminLabel } },
      $set: {
        lastThreadActivityAt: now,
        status: "Closed",
      },
    },
    { new: true }
  ).populate("serviceId");

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: String(process.env.SMTP_PASS || "").replace(/\s+/g, ""),
        },
      });
      const garage = process.env.JOB_SHEET_GARAGE_NAME || process.env.SMTP_FROM || "Workshop";
      const origin = String(process.env.PUBLIC_WEB_URL || process.env.SITE_URL || "http://localhost:3000")
        .trim()
        .replace(/\/$/, "");
      const trackPath = `/quote/track?id=${encodeURIComponent(String(quote._id))}&email=${encodeURIComponent(String(quote.email))}`;
      const trackUrl = `${origin}${trackPath}`;
      const html = `
        <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6f8fb;padding:18px">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e7ecf3;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0f172a,#2563eb);padding:16px 20px;color:#fff">
              <div style="font-size:12px;letter-spacing:.08em;opacity:.82;text-transform:uppercase">Enquiry update</div>
              <h2 style="margin:6px 0 0 0;font-size:20px;line-height:1.25">Admin sent you a new message</h2>
            </div>
            <div style="padding:18px 20px;color:#0f172a">
              <p style="margin:0 0 10px 0">Hi ${escapeHtml(quote.customerName)},</p>
              <p style="margin:0 0 12px 0">You received a new message from our workshop admin.</p>
              <p style="margin:0 0 14px 0">To read the latest reply and continue the conversation, open your Track enquiry page.</p>
              <a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:700">Track enquiry and reply</a>
              <p style="margin:12px 0 0 0;font-size:12px;color:#64748b">Request ID: ${escapeHtml(String(quote._id))} · Current status: Closed (auto-updated after admin reply)</p>
            </div>
          </div>
        </div>
      `;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: quote.email,
        subject: `Message from ${garage} — enquiry ${String(quote._id).slice(-8)}`,
        text: `Hi ${quote.customerName},\n\nYou have received a new message from our workshop admin.\n\nOpen Track enquiry to read and continue chat: ${trackUrl}\n\nRequest ID: ${String(quote._id)}\nCurrent status: Closed (auto-updated after admin reply)\n\n— ${garage}`,
        html,
      });
    } catch (e) {
      console.error("POST /quote-request/:id/message email:", e?.message || e);
    }
  }

  res.json(quote);
});

/** Edit a previously sent admin message in thread. */
router.patch("/quote-request/:id/message/:messageId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
  if (!mongoose.isValidObjectId(req.params.messageId)) return res.status(400).json({ message: "Invalid message id." });
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body || body.length > 8000) {
    return res.status(400).json({ message: "Message is required (max 8000 characters)." });
  }
  const quote = await QuoteRequest.findById(req.params.id);
  if (!quote) return res.status(404).json({ message: "Quote request not found." });
  const msg = quote.messages.id(req.params.messageId);
  if (!msg) return res.status(404).json({ message: "Message not found." });
  if (msg.role !== "admin") return res.status(400).json({ message: "Only admin messages can be edited." });
  msg.body = body;
  quote.lastThreadActivityAt = new Date();
  await quote.save();
  const updated = await QuoteRequest.findById(req.params.id).populate("serviceId");

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: String(process.env.SMTP_PASS || "").replace(/\s+/g, ""),
        },
      });
      const garage = process.env.JOB_SHEET_GARAGE_NAME || process.env.SMTP_FROM || "Workshop";
      const origin = String(process.env.PUBLIC_WEB_URL || process.env.SITE_URL || "http://localhost:3000")
        .trim()
        .replace(/\/$/, "");
      const trackUrl = `${origin}/quote/track?id=${encodeURIComponent(String(updated._id))}&email=${encodeURIComponent(String(updated.email))}`;
      const html = `
        <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f6f8fb;padding:18px">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e7ecf3;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0f172a,#2563eb);padding:16px 20px;color:#fff">
              <div style="font-size:12px;letter-spacing:.08em;opacity:.82;text-transform:uppercase">Message updated</div>
              <h2 style="margin:6px 0 0 0;font-size:20px;line-height:1.25">Admin updated a previous message</h2>
            </div>
            <div style="padding:18px 20px;color:#0f172a">
              <p style="margin:0 0 10px 0">Hi ${escapeHtml(updated.customerName)},</p>
              <p style="margin:0 0 12px 0">A message in your enquiry thread was updated by our admin.</p>
              <p style="margin:0 0 14px 0">Please open Track enquiry to view the updated reply.</p>
              <a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:700">Open Track enquiry</a>
            </div>
          </div>
        </div>
      `;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: updated.email,
        subject: `Updated message from ${garage} — enquiry ${String(updated._id).slice(-8)}`,
        text: `Hi ${updated.customerName},\n\nAdmin updated a message in your enquiry thread.\n\nOpen Track enquiry to view it: ${trackUrl}\n\nRequest ID: ${String(updated._id)}\n\n— ${garage}`,
        html,
      });
    } catch (e) {
      console.error("PATCH /quote-request/:id/message/:messageId email:", e?.message || e);
    }
  }

  res.json(updated);
});

router.post("/quote-request/:id/attachment", (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
  threadAttachmentUpload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    next();
  });
}, async (req, res) => {
  const existing = await QuoteRequest.findById(req.params.id).select("_id");
  if (!existing) return res.status(404).json({ message: "Quote request not found." });
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });
  const mime = String(req.file.mimetype || "").toLowerCase();
  const kind = mime === "application/pdf" ? "pdf" : "image";
  return res.json({
    kind,
    url: `/api/uploads/thread-attachments/${req.file.filename}`,
    name: String(req.file.originalname || req.file.filename || "").slice(0, 180),
    sizeBytes: Number(req.file.size || 0),
    mimeType: mime,
  });
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
  const explicitStatus =
    status && ["Submitted", "Pending", "Quoted", "Accepted", "Declined", "Closed"].includes(String(status));
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
      message: "SMTP is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to frontend/backend/.env.",
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
  const origin = String(process.env.PUBLIC_WEB_URL || process.env.SITE_URL || "http://localhost:3000")
    .trim()
    .replace(/\/$/, "");
  const trackUrl = `${origin}/quote/track?id=${encodeURIComponent(String(quote._id))}&email=${encodeURIComponent(String(quote.email))}`;
  const bodyHtml = renderMailCard({
    eyebrow: "Quotation ready",
    title: "Your service quotation is ready",
    intro: `Hi ${quote.customerName}, we reviewed your request and shared the quotation below.`,
    bodyHtml: `
      <p style="margin:0 0 8px 0"><strong>Request ID:</strong> ${escapeHtml(String(quote._id))}</p>
      <p style="margin:0 0 8px 0"><strong>Quoted amount:</strong> ${escapeHtml(fmt.format(amt))}</p>
      ${quote.quoteNotes ? `<p style="margin:0"><strong>Details:</strong><br/>${escapeHtml(quote.quoteNotes).replace(/\n/g, "<br/>")}</p>` : ""}
    `,
    ctaLabel: "Track enquiry and respond",
    ctaHref: trackUrl,
    footnote: "Use your request ID + email to accept/decline and continue chat.",
  });

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
      html: bodyHtml,
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

/** —— Shop products (headlights, wraps, kits) & orders —— */

function parseProductGroup(raw) {
  const g = String(raw || "").toLowerCase();
  if (g === "machine" || g === "accessory" || g === "other") return g;
  return "accessory";
}

router.get("/shop-products", async (_req, res) => {
  try {
    const rows = await ShopProduct.find().sort({ sortOrder: -1, createdAt: -1 }).lean();
    res.json(
      rows.map((p) => ({
        ...p,
        productGroup: parseProductGroup(p.productGroup),
        effectivePrice: effectiveUnitPriceInr(p),
        stock: p.stock == null || p.stock === undefined ? null : Math.floor(Number(p.stock)),
      }))
    );
  } catch (e) {
    console.error("admin GET /shop-products", e);
    res.status(500).json({ message: "Could not load products" });
  }
});

router.post("/shop-products", async (req, res) => {
  try {
    const { name, description, category, image, basePrice, discountPercent, isActive, sortOrder, productGroup, stock } = req.body || {};
    const n = typeof name === "string" ? name.trim() : "";
    if (!n) return res.status(400).json({ message: "Name is required." });
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: "Valid base price is required." });
    let baseSlug = slugify(n);
    let slug = baseSlug;
    let suf = 0;
    while (await ShopProduct.findOne({ slug })) {
      suf += 1;
      slug = `${baseSlug}-${suf}`;
    }
    const disc = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    let stockVal;
    if (stock === "" || stock === undefined || stock === null) stockVal = undefined;
    else {
      const s = Number(stock);
      if (!Number.isFinite(s) || s < 0 || !Number.isInteger(s)) {
        return res.status(400).json({ message: "Stock must be a whole number ≥ 0, or leave blank to not track stock." });
      }
      stockVal = s;
    }
    const doc = await ShopProduct.create({
      name: n,
      slug,
      description: typeof description === "string" ? description : "",
      productGroup: parseProductGroup(productGroup),
      category: typeof category === "string" && category.trim() ? category.trim() : "General",
      image: typeof image === "string" ? image.trim() : "",
      basePrice: price,
      discountPercent: disc,
      ...(stockVal !== undefined ? { stock: stockVal } : {}),
      isActive: isActive !== false,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });
    const o = doc.toObject();
    res.status(201).json({ ...o, effectivePrice: effectiveUnitPriceInr(o) });
  } catch (e) {
    console.error("admin POST /shop-products", e);
    res.status(500).json({ message: e.message || "Could not create product" });
  }
});

router.put("/shop-products/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
    const p = await ShopProduct.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Product not found." });
    const { name, description, category, image, basePrice, discountPercent, isActive, sortOrder, productGroup, stock } = req.body || {};
    if (name !== undefined) p.name = String(name).trim() || p.name;
    if (description !== undefined) p.description = typeof description === "string" ? description : p.description;
    if (productGroup !== undefined) p.productGroup = parseProductGroup(productGroup);
    if (category !== undefined) p.category = String(category).trim() || "General";
    if (image !== undefined) p.image = typeof image === "string" ? image : p.image;
    if (basePrice !== undefined) {
      const price = Number(basePrice);
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: "Invalid base price." });
      p.basePrice = price;
    }
    if (discountPercent !== undefined) {
      const d = Number(discountPercent);
      if (!Number.isFinite(d) || d < 0 || d > 100) return res.status(400).json({ message: "Discount must be 0–100." });
      p.discountPercent = d;
    }
    if (isActive !== undefined) p.isActive = Boolean(isActive);
    if (sortOrder !== undefined && Number.isFinite(Number(sortOrder))) p.sortOrder = Number(sortOrder);
    let unsetStock = false;
    if (stock !== undefined) {
      if (stock === "" || stock === null) unsetStock = true;
      else {
        const s = Number(stock);
        if (!Number.isFinite(s) || s < 0 || !Number.isInteger(s)) {
          return res.status(400).json({ message: "Stock must be a whole number ≥ 0, or clear to not track stock." });
        }
        p.stock = s;
      }
    }
    await p.save();
    if (unsetStock) {
      await ShopProduct.updateOne({ _id: p._id }, { $unset: { stock: 1 } });
    }
    const o = p.toObject();
    res.json({ ...o, effectivePrice: effectiveUnitPriceInr(o) });
  } catch (e) {
    console.error("admin PUT /shop-products/:id", e);
    res.status(500).json({ message: e.message || "Could not update product" });
  }
});

router.delete("/shop-products/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
    const p = await ShopProduct.findByIdAndUpdate(req.params.id, { $set: { isActive: false } }, { new: true });
    if (!p) return res.status(404).json({ message: "Product not found." });
    res.json({ ok: true, product: p });
  } catch (e) {
    console.error("admin DELETE /shop-products/:id", e);
    res.status(500).json({ message: "Could not archive product" });
  }
});

router.get("/shop-orders", async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const rows = await ShopOrder.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ orders: rows });
  } catch (e) {
    console.error("admin GET /shop-orders", e);
    res.status(500).json({ message: "Could not load orders" });
  }
});

router.patch("/shop-orders/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
    const { status } = req.body || {};
    const allowed = ["pending", "confirmed", "fulfilled", "cancelled"];
    if (!status || !allowed.includes(String(status))) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(", ")}` });
    }
    const order = await ShopOrder.findByIdAndUpdate(req.params.id, { $set: { status: String(status) } }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found." });
    res.json(order);
  } catch (e) {
    console.error("admin PATCH /shop-orders/:id", e);
    res.status(500).json({ message: "Could not update order" });
  }
});

/** Customer testimonials — approve to show on site, reject to remove from public view. */
router.get("/reviews", async (req, res) => {
  try {
    const rawStatus = req.query.status;
    const q = {};
    if (rawStatus && ["pending", "approved", "rejected"].includes(String(rawStatus))) {
      q.status = String(rawStatus);
    }
    const rows = await Review.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({ path: "bookingId", select: "customerName email date status" })
      .lean();
    res.json({
      items: rows.map((r) => {
        const b = r.bookingId;
        return {
          id: String(r._id),
          quote: r.quote,
          authorDisplay: r.authorDisplay,
          context: r.context,
          status: r.status,
          createdAt: r.createdAt,
          bookingId: b ? String(b._id) : String(r.bookingId),
          bookingEmail: b && b.email ? b.email : "",
          bookingDate: b && b.date ? b.date : "",
          bookingStatus: b && b.status ? b.status : "",
        };
      }),
    });
  } catch (e) {
    console.error("admin GET /reviews", e);
    res.status(500).json({ message: "Could not load reviews" });
  }
});

router.patch("/reviews/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid id." });
    const { status } = req.body || {};
    const allowed = ["approved", "rejected"];
    if (!status || !allowed.includes(String(status))) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(", ")}` });
    }
    const rev = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: { status: String(status) } },
      { new: true }
    );
    if (!rev) return res.status(404).json({ message: "Review not found." });
    res.json(rev);
  } catch (e) {
    console.error("admin PATCH /reviews/:id", e);
    res.status(500).json({ message: "Could not update review" });
  }
});

module.exports = router;
