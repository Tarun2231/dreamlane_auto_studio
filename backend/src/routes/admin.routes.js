const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { storage } = require("../config/cloudinary");
const { protectAdmin } = require("../middleware/auth");
const Service = require("../models/Service");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
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

function dayRangeYmd(refYmd) {
  const ref = parseYmdToLocalDate(refYmd) || new Date();
  const s = ymdLocal(ref);
  return { rangeStart: s, rangeEnd: s };
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

router.get("/dashboard", async (req, res) => {
  const today = ymdLocal();
  const period = ["day", "week", "month"].includes(String(req.query.period)) ? String(req.query.period) : "day";
  const ref =
    req.query.ref && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.ref)) ? String(req.query.ref) : today;

  let range;
  if (period === "week") range = weekRangeContainingYmd(ref);
  else if (period === "month") range = monthRangeContainingYmd(ref);
  else range = dayRangeYmd(ref);

  const [
    totalBookings,
    todaysBookings,
    activeServices,
    completedAllTime,
    periodCounts,
  ] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ date: today }),
    Service.countDocuments(),
    Booking.countDocuments({ status: "Completed" }),
    countByStatusInDateRange(range.rangeStart, range.rangeEnd),
  ]);

  res.json({
    totalBookings,
    todaysBookings,
    activeServices,
    completedAllTime,
    today,
    period: {
      type: period,
      ref,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      ...periodCounts,
    },
  });
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

router.put("/slots/:id", async (req, res) => {
  const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!slot) return res.status(404).json({ message: "Slot not found" });
  res.json(slot);
});

router.get("/bookings", async (req, res) => {
  const { date, dateFrom, dateTo, status } = req.query;
  const query = {};
  if (dateFrom && dateTo) {
    query.date = { $gte: String(dateFrom), $lte: String(dateTo) };
  } else if (dateFrom) {
    query.date = String(dateFrom);
  } else if (date) {
    query.date = String(date);
  }
  if (status) query.status = String(status);
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

module.exports = router;
