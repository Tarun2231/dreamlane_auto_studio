const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Service = require("../models/Service");
const ShopProduct = require("../models/ShopProduct");
const ShopOrder = require("../models/ShopOrder");
const { effectiveUnitPriceInr, listTotalForQty } = require("../utils/shopHelpers");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const QuoteRequest = require("../models/QuoteRequest");
const Review = require("../models/Review");
const SitePresence = require("../models/SitePresence");
const User = require("../models/User");
const { buildInvoicePdfBuffer } = require("../utils/invoicePdf");

const router = express.Router();

const threadAttachmentDir = process.env.VERCEL
  ? path.join("/tmp", "thread-attachments")
  : path.join(__dirname, "..", "..", "uploads", "public", "thread-attachments");
try {
  fs.mkdirSync(threadAttachmentDir, { recursive: true });
} catch (e) {
  console.error("threadAttachmentDir init failed:", e);
}
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

/** Public support badge state used on homepage hero. */
router.get("/site-presence", async (_req, res) => {
  try {
    // Keep homepage responsive even when DB is temporarily unavailable.
    if (mongoose.connection.readyState !== 1) {
      return res.json({ supportStatus: "online", updatedAt: null });
    }
    let doc = await SitePresence.findOne().lean();
    if (!doc) {
      doc = await SitePresence.create({ supportStatus: "online" });
      doc = doc.toObject();
    }
    res.json({
      supportStatus: ["online", "offline", "break"].includes(String(doc.supportStatus)) ? doc.supportStatus : "online",
      updatedAt: doc.updatedAt || null,
    });
  } catch (e) {
    console.error("GET /site-presence", e);
    res.status(500).json({ message: "Could not load support status." });
  }
});

/** Gmail app passwords are often pasted with spaces; strip for nodemailer. */
function smtpPassword() {
  return String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function appBaseUrl() {
  return String(process.env.PUBLIC_WEB_URL || process.env.SITE_URL || "http://localhost:3000")
    .trim()
    .replace(/\/$/, "");
}

function renderMailCard({
  eyebrow,
  title,
  intro,
  bodyHtml,
  ctaLabel,
  ctaHref,
  footnote,
}) {
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

router.get("/services", async (_req, res) => {
  const services = await Service.find().sort({ createdAt: -1 });
  res.json(services);
});

router.get("/services/:id", async (req, res) => {
  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ message: "Service not found" });
  res.json(service);
});

router.get("/slots", async (req, res) => {
  const date = req.query.date;
  const query = date ? { date } : {};
  const slots = await Slot.find(query).sort({ date: 1, time: 1 });
  res.json(slots);
});

router.post("/booking", async (req, res) => {
  const {
    slotId,
    serviceId,
    vehicleType,
    date: rawDate,
    time: rawTime,
    customerName,
    phone,
    email,
    carMake: rawMake,
    carModel: rawModel,
    chassisNumber: rawChassis,
    vehicleYear: rawVehicleYear,
  } = req.body;

  const carMake = typeof rawMake === "string" ? rawMake.trim() : "";
  const carModel = typeof rawModel === "string" ? rawModel.trim() : "";
  const chassisNumber = typeof rawChassis === "string" ? rawChassis.trim() : "";
  const vehicleYear = Number(rawVehicleYear);
  const maxYear = new Date().getFullYear() + 1;
  if (!carMake || !carModel) {
    return res.status(400).json({ message: "Car make and model are required." });
  }
  if (!Number.isFinite(vehicleYear) || vehicleYear < 1990 || vehicleYear > maxYear) {
    return res.status(400).json({ message: "Select a valid vehicle year." });
  }
  if (!chassisNumber || chassisNumber.length < 6) {
    return res.status(400).json({
      message: "Enter the chassis number as on your RC (at least 6 characters).",
    });
  }

  /** Prefer slotId so date/time match the DB exactly (avoids HH:mm vs HH:mm:ss / whitespace mismatches). */
  let slot;
  if (slotId && mongoose.isValidObjectId(slotId)) {
    slot = await Slot.findOne({ _id: slotId, isAvailable: true });
  }
  if (!slot) {
    const date = typeof rawDate === "string" ? rawDate.trim() : "";
    const time = typeof rawTime === "string" ? rawTime.trim() : "";
    slot = await Slot.findOne({ date, time, isAvailable: true });
  }
  if (!slot) return res.status(409).json({ message: "Slot unavailable" });

  const date = slot.date;
  const time = slot.time;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: customerName,
      email,
      phone,
      password: `customer-${Date.now()}`,
      role: "customer",
    });
  }

  const booking = await Booking.create({
    userId: user._id,
    serviceId,
    vehicleType,
    date,
    time,
    customerName,
    phone,
    email,
    carMake,
    carModel,
    chassisNumber,
    vehicleYear,
  });

  slot.isAvailable = false;
  await slot.save();

  if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPassword(),
        },
      });

      const garage =
        process.env.JOB_SHEET_GARAGE_NAME || process.env.REMINDER_GARAGE_NAME || process.env.SMTP_FROM || "Our workshop";
      const origin = appBaseUrl();
      const bookingId = String(booking._id);
      const shortId = bookingId.slice(-8);
      const trackHref = `${origin}/booking/track?id=${encodeURIComponent(bookingId)}&email=${encodeURIComponent(
        String(email || "").trim()
      )}`;
      const invoiceHref = `${origin}/booking/confirmation/${encodeURIComponent(bookingId)}`;
      const bookingHtml = renderMailCard({
        eyebrow: "Booking confirmed",
        title: "Your service visit is booked",
        intro: `Hi ${customerName}, thanks for booking with ${garage}.`,
        bodyHtml: `
          <p style="margin:0 0 8px 0"><strong>Booking ID:</strong> ${escapeHtml(bookingId)}</p>
          <p style="margin:0 0 8px 0"><strong>Short ref:</strong> ${escapeHtml(shortId)}</p>
          <p style="margin:0 0 8px 0"><strong>Date & time:</strong> ${escapeHtml(date)} at ${escapeHtml(time)}</p>
          <p style="margin:0 0 8px 0"><strong>Service:</strong> ${escapeHtml(String(vehicleType || "General service"))}</p>
          <p style="margin:0 0 8px 0"><strong>Vehicle:</strong> ${escapeHtml(carMake)} ${escapeHtml(carModel)} (${escapeHtml(
            String(vehicleYear)
          )})</p>
          <p style="margin:0 0 12px 0"><strong>Chassis (RC):</strong> ${escapeHtml(chassisNumber)}</p>
          <a href="${escapeHtml(invoiceHref)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:700">Open booking & download invoice</a>
        `,
        ctaLabel: "Track booking",
        ctaHref: trackHref,
        footnote:
          "Use the same email address from this booking to view details and download your invoice. Keep your Booking ID safe.",
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com",
        to: email,
        subject: `Booking confirmed — ${shortId}`,
        html: bookingHtml,
        text: `Hi ${customerName},

Your booking is confirmed with ${garage}.

Booking ID: ${bookingId}
Short ref: ${shortId}
Date: ${date}
Time: ${time}
Service: ${vehicleType || "General service"}
Vehicle: ${carMake} ${carModel} (${vehicleYear})
Chassis (RC): ${chassisNumber}

Track your booking and download invoice:
${trackHref}

Open booking page (invoice section):
${invoiceHref}

Please keep this booking ID safe.

— ${garage}`,
      });
    } catch (mailErr) {
      // Booking is already saved; email issues should not fail the customer flow.
      console.error("Confirmation email failed:", mailErr?.message || mailErr);
    }
  }

  res.status(201).json(booking);
});

router.get("/booking/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("serviceId");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  res.json(booking);
});

/** Public lookup: booking ID + email must match (for “Track booking” without exposing other customers’ data). */
router.post("/booking/lookup", async (req, res) => {
  const { id, email } = req.body || {};
  if (!id || !email || typeof email !== "string") {
    return res.status(400).json({ message: "Booking ID and email are required." });
  }
  if (!mongoose.isValidObjectId(String(id))) {
    return res.status(404).json({ message: "Booking not found." });
  }
  const booking = await Booking.findById(id).populate("serviceId");
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  const a = String(email).trim().toLowerCase();
  const b = String(booking.email).trim().toLowerCase();
  if (a !== b) return res.status(404).json({ message: "Booking not found." });
  res.json(booking);
});

/**
 * Same identity check as /booking/lookup — returns invoice PDF only when ID + email match.
 */
router.post("/booking/invoice", async (req, res) => {
  const { id, email } = req.body || {};
  if (!id || !email || typeof email !== "string") {
    return res.status(400).json({ message: "Booking ID and email are required." });
  }
  if (!mongoose.isValidObjectId(String(id))) {
    return res.status(404).json({ message: "Booking not found." });
  }
  const booking = await Booking.findById(id);
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  const a = String(email).trim().toLowerCase();
  const b = String(booking.email).trim().toLowerCase();
  if (a !== b) return res.status(404).json({ message: "Booking not found." });
  try {
    const buf = await buildInvoicePdfBuffer(String(id));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${String(id)}.pdf"`);
    res.send(buf);
  } catch (e) {
    const code = e.statusCode || 500;
    res.status(code).json({ message: e.message || "Could not generate invoice PDF" });
  }
});

/** Public marketing reviews (admin-approved only). */
router.get("/reviews", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const rows = await Review.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();
    res.json(
      rows.map((r) => ({
        id: String(r._id),
        quote: r.quote,
        author: r.authorDisplay,
        context: r.context || "",
      }))
    );
  } catch (e) {
    console.error("GET /reviews", e);
    res.status(500).json({ message: "Could not load reviews" });
  }
});

function reviewAuthorFromBooking(customerName, override) {
  const o = typeof override === "string" ? override.trim() : "";
  if (o.length >= 2 && o.length <= 80) return o;
  const name = typeof customerName === "string" ? customerName.trim() : "";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) {
    const p = parts[0];
    return p.length > 24 ? `${p.slice(0, 22)}…` : p;
  }
  const first = parts[0];
  const li = parts[parts.length - 1][0];
  return li ? `${first} ${li.toUpperCase()}.` : first;
}

/**
 * Submit a review — only if booking ID + email match Track booking, and visit is completed.
 * Rejected reviews may be resubmitted (same booking): updates text and sets status to pending.
 */
router.post("/reviews", async (req, res) => {
  try {
    const { bookingId: rawBid, email: rawEmail, quote: rawQuote, authorDisplay: rawAuthor } = req.body || {};
    const bid = rawBid != null ? String(rawBid).trim() : "";
    const emailIn = typeof rawEmail === "string" ? rawEmail.trim() : "";
    const quote = typeof rawQuote === "string" ? rawQuote.trim() : "";

    if (!bid || !mongoose.isValidObjectId(bid)) {
      return res.status(400).json({ message: "Enter a valid booking ID from your confirmation email." });
    }
    if (!emailIn || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailIn)) {
      return res.status(400).json({ message: "Enter the same email you used when booking." });
    }
    if (quote.length < 10) {
      return res.status(400).json({ message: "Please write at least a short review (10+ characters)." });
    }
    if (quote.length > 1200) {
      return res.status(400).json({ message: "Review is too long (max 1200 characters)." });
    }

    const booking = await Booking.findById(bid).populate("serviceId");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found. Check your booking ID." });
    }
    const a = emailIn.toLowerCase();
    const b = String(booking.email).trim().toLowerCase();
    if (a !== b) {
      return res.status(404).json({ message: "Booking not found. Use the email from your booking." });
    }
    if (booking.status !== "Completed") {
      return res.status(400).json({
        message: "Reviews open after your visit is marked complete. Check back after service completion.",
      });
    }

    const serviceDoc = booking.serviceId;
    const context =
      serviceDoc && typeof serviceDoc === "object" && serviceDoc.name
        ? String(serviceDoc.name)
        : "Workshop visit";

    const authorDisplay = reviewAuthorFromBooking(booking.customerName, rawAuthor);

    const existing = await Review.findOne({ bookingId: booking._id });
    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({ message: "Your review is awaiting moderation — thank you." });
      }
      if (existing.status === "approved") {
        return res.status(400).json({ message: "You already submitted a review for this booking." });
      }
      existing.quote = quote;
      existing.authorDisplay = authorDisplay;
      existing.context = context;
      existing.status = "pending";
      await existing.save();
      return res.status(200).json({
        message: "Review resubmitted and pending moderation.",
        status: existing.status,
      });
    }

    await Review.create({
      bookingId: booking._id,
      quote,
      authorDisplay,
      context,
      status: "pending",
    });
    return res.status(201).json({ message: "Thank you — your review is pending moderation.", status: "pending" });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ message: "A review for this booking already exists." });
    }
    console.error("POST /reviews", e);
    res.status(500).json({ message: "Could not submit review" });
  }
});

const CUSTOM_SERVICE_ID = "__custom__";

/** Submit a quotation request (parts / custom work). */
router.post("/quote-request", async (req, res) => {
  const {
    customerName: rawName,
    email: rawEmail,
    phone: rawPhone,
    vehicleType: rawVt,
    carMake: rawMake,
    carModel: rawModel,
    vehicleYear: rawYear,
    serviceId: rawServiceId,
    serviceDescription: rawDesc,
    partsNotes: rawParts,
    enquiryTopic: rawTopic,
    preferredContact: rawPref,
    urgency: rawUrgency,
    requestKind: rawKind,
  } = req.body || {};

  const customerName = typeof rawName === "string" ? rawName.trim() : "";
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  const phone = typeof rawPhone === "string" ? rawPhone.trim() : "";
  const carMake = typeof rawMake === "string" ? rawMake.trim() : "";
  const carModel = typeof rawModel === "string" ? rawModel.trim() : "";
  const vehicleYear = Number(rawYear);
  const serviceDescription = typeof rawDesc === "string" ? rawDesc.trim() : "";
  const partsNotes = typeof rawParts === "string" ? rawParts.trim() : "";
  const vehicleType = typeof rawVt === "string" ? rawVt.trim() : "";
  const maxYear = new Date().getFullYear() + 1;

  if (customerName.length < 2) {
    return res.status(400).json({ message: "Please enter your name." });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (phone.length < 5) {
    return res.status(400).json({ message: "Enter a valid phone number." });
  }
  if (!["Hatchback", "Sedan", "SUV"].includes(vehicleType)) {
    return res.status(400).json({ message: "Select a vehicle body type." });
  }
  if (!carMake || !carModel) {
    return res.status(400).json({ message: "Select vehicle make and model." });
  }
  if (!Number.isFinite(vehicleYear) || vehicleYear < 1990 || vehicleYear > maxYear) {
    return res.status(400).json({ message: "Select a valid vehicle year." });
  }

  const sid = rawServiceId != null ? String(rawServiceId).trim() : "";
  const isCustom = !sid || sid === CUSTOM_SERVICE_ID || sid.toLowerCase() === "custom";
  let serviceId = null;
  let serviceNameSnapshot = "";

  if (!isCustom && mongoose.isValidObjectId(sid)) {
    const svc = await Service.findById(sid);
    if (!svc) {
      return res.status(400).json({ message: "Invalid service selected. Refresh the page and try again." });
    }
    serviceId = svc._id;
    serviceNameSnapshot = svc.name;
  } else {
    if (serviceDescription.length < 10) {
      return res.status(400).json({ message: "Describe the custom service you need (at least one sentence)." });
    }
    serviceNameSnapshot = "Custom work";
  }

  const vehicleHint = `${vehicleType} · ${carMake} ${carModel} (${vehicleYear})`;

  const enquiryTopic = typeof rawTopic === "string" ? rawTopic.trim().slice(0, 160) : "";
  let preferredContact = "either";
  if (rawPref === "email" || rawPref === "phone" || rawPref === "either") preferredContact = rawPref;
  let urgency = "routine";
  if (rawUrgency === "routine" || rawUrgency === "soon" || rawUrgency === "urgent") urgency = rawUrgency;

  let requestKind = "quotation";
  if (rawKind === "enquiry" || rawKind === "quotation") requestKind = rawKind;
  const initialStatus = requestKind === "enquiry" ? "Pending" : "Submitted";

  const quote = await QuoteRequest.create({
    requestKind,
    status: initialStatus,
    customerName,
    email,
    phone,
    vehicleHint,
    vehicleType,
    carMake,
    carModel,
    vehicleYear,
    serviceId,
    serviceNameSnapshot,
    serviceDescription,
    partsNotes,
    enquiryTopic,
    preferredContact,
    urgency,
    lastThreadActivityAt: new Date(),
  });

  const serviceBlock = `${serviceNameSnapshot}${serviceDescription ? `\nDetails / notes: ${serviceDescription}` : ""}`;

  let emailSent = { customer: false, workshop: false };
  let emailError = null;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPassword(),
        },
      });
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com";
      const garage =
        process.env.JOB_SHEET_GARAGE_NAME || process.env.REMINDER_GARAGE_NAME || process.env.SMTP_FROM || "Our workshop";
      const origin = appBaseUrl();
      const trackUrl = `${origin}/quote/track?id=${encodeURIComponent(String(quote._id))}&email=${encodeURIComponent(email)}`;
      const customerHtml = renderMailCard({
        eyebrow: requestKind === "enquiry" ? "Enquiry received" : "Quotation request received",
        title: "We received your request",
        intro: `Hi ${customerName}, thank you for contacting ${garage}.`,
        bodyHtml: `
          <p style="margin:0 0 8px 0"><strong>Request ID:</strong> ${escapeHtml(String(quote._id))}</p>
          <p style="margin:0 0 8px 0"><strong>Vehicle:</strong> ${escapeHtml(vehicleHint)}</p>
          <p style="margin:0 0 8px 0"><strong>Service:</strong> ${escapeHtml(serviceNameSnapshot)}</p>
          ${serviceDescription ? `<p style="margin:0 0 8px 0"><strong>Notes:</strong> ${escapeHtml(serviceDescription)}</p>` : ""}
          <p style="margin:0"><strong>Parts / notes:</strong> ${escapeHtml(partsNotes || "—")}</p>
        `,
        ctaLabel: "Track enquiry",
        ctaHref: trackUrl,
        footnote: "Use your request ID + email to continue chat anytime.",
      });
      await transporter.sendMail({
        from,
        to: email,
        subject: `We received your ${requestKind === "enquiry" ? "enquiry" : "quotation request"} — ${String(quote._id).slice(-8)}`,
        text: `Hi ${customerName},\n\nThank you — we have received your ${requestKind === "enquiry" ? "enquiry" : "quotation request"}.\n\nRequest ID: ${quote._id}\nVehicle: ${vehicleHint}\nService: ${serviceNameSnapshot}\n${serviceDescription ? `Notes: ${serviceDescription}\n` : ""}Parts / notes: ${partsNotes || "—"}\n\nTrack enquiry: ${trackUrl}\n\n— ${garage}`,
        html: customerHtml,
      });
      emailSent.customer = true;
      const workshopTo = process.env.WORKSHOP_QUOTE_EMAIL || process.env.JOB_SHEET_EMAIL;
      if (workshopTo) {
        const adminHtml = renderMailCard({
          eyebrow: requestKind === "enquiry" ? "New enquiry" : "New quotation request",
          title: `${customerName} submitted a new request`,
          intro: "A new customer request is waiting in admin.",
          bodyHtml: `
            <p style="margin:0 0 8px 0"><strong>ID:</strong> ${escapeHtml(String(quote._id))}</p>
            <p style="margin:0 0 8px 0"><strong>Name:</strong> ${escapeHtml(customerName)}</p>
            <p style="margin:0 0 8px 0"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin:0 0 8px 0"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
            <p style="margin:0 0 8px 0"><strong>Vehicle:</strong> ${escapeHtml(vehicleHint)}</p>
            <p style="margin:0 0 8px 0"><strong>Service:</strong> ${escapeHtml(serviceNameSnapshot)}</p>
            <p style="margin:0"><strong>Parts / notes:</strong> ${escapeHtml(partsNotes || "—")}</p>
          `,
          ctaLabel: "Open admin enquiries",
          ctaHref: `${origin}/admin/enquiries`,
          footnote: "Reply in thread from admin dashboard.",
        });
        await transporter.sendMail({
          from,
          to: workshopTo,
          subject: `New ${requestKind} ${quote._id} — ${customerName}`,
          text: `New ${requestKind}\n\nID: ${quote._id}\nName: ${customerName}\nEmail: ${email}\nPhone: ${phone}\n\nVehicle:\n${vehicleHint}\n\nService:\n${serviceBlock}\n\nParts / replacement notes:\n${partsNotes || "—"}\n`,
          html: adminHtml,
        });
        emailSent.workshop = true;
      }
    } catch (mailErr) {
      emailError = mailErr?.message || String(mailErr);
      console.error("Quote request email failed:", emailError);
    }
  } else {
    emailError = "SMTP not fully configured (SMTP_HOST, SMTP_USER, SMTP_PASS).";
  }

  const payload = typeof quote.toObject === "function" ? quote.toObject() : { ...quote };
  res.status(201).json({ ...payload, emailSent, ...(emailError ? { emailError } : {}) });
});

/**
 * Load full quote + message thread (id + email must match).
 */
router.post("/quote-request/thread", async (req, res) => {
  const { id, email } = req.body || {};
  if (!id || !email || typeof email !== "string") {
    return res.status(400).json({ message: "Request ID and email are required." });
  }
  if (!mongoose.isValidObjectId(String(id))) {
    return res.status(404).json({ message: "Request not found." });
  }
  const quote = await QuoteRequest.findById(id).populate("serviceId");
  if (!quote) return res.status(404).json({ message: "Request not found." });
  const a = String(email).trim().toLowerCase();
  const b = String(quote.email).trim().toLowerCase();
  if (a !== b) return res.status(404).json({ message: "Request not found." });
  res.json(quote);
});

/**
 * Customer follow-up message on an enquiry thread.
 */
router.post("/quote-request/message", async (req, res) => {
  const { id, email, body: rawBody } = req.body || {};
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  const attachments = sanitizeMessageAttachments(req.body?.attachments);
  if (!id || !email || typeof email !== "string") {
    return res.status(400).json({ message: "Request ID and email are required." });
  }
  if ((!body && attachments.length === 0) || body.length > 8000) {
    return res.status(400).json({ message: "Enter a message or upload attachment (max 8000 characters)." });
  }
  if (!mongoose.isValidObjectId(String(id))) {
    return res.status(404).json({ message: "Request not found." });
  }
  const existing = await QuoteRequest.findById(id);
  if (!existing) return res.status(404).json({ message: "Request not found." });
  const a = String(email).trim().toLowerCase();
  const b = String(existing.email).trim().toLowerCase();
  if (a !== b) return res.status(404).json({ message: "Request not found." });

  const quote = await QuoteRequest.findByIdAndUpdate(
    id,
    {
      $push: { messages: { role: "customer", body, attachments, createdAt: new Date() } },
      $set: {
        lastThreadActivityAt: new Date(),
        ...(existing.status === "Submitted" || existing.status === "Closed" ? { status: "Pending" } : {}),
      },
    },
    { new: true }
  ).populate("serviceId");

  if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword()) {
    const workshopTo = process.env.WORKSHOP_QUOTE_EMAIL || process.env.JOB_SHEET_EMAIL;
    if (workshopTo) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: smtpPassword() },
        });
        const garage =
          process.env.JOB_SHEET_GARAGE_NAME || process.env.REMINDER_GARAGE_NAME || process.env.SMTP_FROM || "Workshop";
        const attachmentInfo = attachments
          .map((a) => `- ${a.name || (a.kind === "pdf" ? "PDF attachment" : "Image attachment")}`)
          .join("\n");
        const origin = appBaseUrl();
        const bodyHtml = body
          ? `<p style="margin:0 0 8px 0"><strong>Message:</strong></p><p style="margin:0">${escapeHtml(body).replace(/\n/g, "<br/>")}</p>`
          : `<p style="margin:0">Attachment shared by customer.</p>`;
        const adminHtml = renderMailCard({
          eyebrow: "Customer reply",
          title: `New reply from ${existing.customerName}`,
          intro: "A customer sent a new message in an existing enquiry thread.",
          bodyHtml: `
            <p style="margin:0 0 8px 0"><strong>Request ID:</strong> ${escapeHtml(String(id))}</p>
            ${bodyHtml}
            ${attachmentInfo ? `<p style="margin:8px 0 0 0"><strong>Attachments:</strong><br/>${escapeHtml(attachmentInfo).replace(/\n/g, "<br/>")}</p>` : ""}
          `,
          ctaLabel: "Open admin enquiries",
          ctaHref: `${origin}/admin/enquiries`,
          footnote: `From ${existing.customerName} (${existing.email})`,
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com",
          to: workshopTo,
          subject: `New reply on enquiry ${String(id).slice(-8)} — ${existing.customerName}`,
          text: `${existing.customerName} replied on request ${id}.\n\n${body || "(Attachment shared)"}\n\n${attachmentInfo ? `Attachments:\n${attachmentInfo}\n\n` : ""}— ${garage}\nOpen Admin → Quotes to reply.`,
          html: adminHtml,
        });
      } catch (mailErr) {
        console.error("quote thread workshop notify:", mailErr?.message || mailErr);
      }
    }
  }

  res.json(quote);
});

router.post("/quote-request/attachment", (req, res, next) => {
  threadAttachmentUpload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    next();
  });
}, async (req, res) => {
  const { id, email } = req.body || {};
  if (!id || !email || typeof email !== "string") {
    return res.status(400).json({ message: "Request ID and email are required." });
  }
  if (!mongoose.isValidObjectId(String(id))) return res.status(404).json({ message: "Request not found." });
  const quote = await QuoteRequest.findById(String(id)).select("email");
  if (!quote) return res.status(404).json({ message: "Request not found." });
  if (String(email).trim().toLowerCase() !== String(quote.email).trim().toLowerCase()) {
    return res.status(404).json({ message: "Request not found." });
  }
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

/** Lookup quote by id + email (same pattern as booking track). */
router.post("/quote-request/lookup", async (req, res) => {
  const { id, email } = req.body || {};
  if (!id || !email || typeof email !== "string") {
    return res.status(400).json({ message: "Request ID and email are required." });
  }
  if (!mongoose.isValidObjectId(String(id))) {
    return res.status(404).json({ message: "Request not found." });
  }
  const quote = await QuoteRequest.findById(id);
  if (!quote) return res.status(404).json({ message: "Request not found." });
  const a = String(email).trim().toLowerCase();
  const b = String(quote.email).trim().toLowerCase();
  if (a !== b) return res.status(404).json({ message: "Request not found." });
  res.json(quote);
});

/** Customer accepts or declines a quoted price (email must match). */
router.post("/quote-request/respond", async (req, res) => {
  const { id, email, action } = req.body || {};
  if (!id || !email || typeof email !== "string" || !action) {
    return res.status(400).json({ message: "Request ID, email, and action are required." });
  }
  if (!["accept", "decline"].includes(String(action))) {
    return res.status(400).json({ message: "action must be accept or decline." });
  }
  if (!mongoose.isValidObjectId(String(id))) {
    return res.status(404).json({ message: "Request not found." });
  }
  const quote = await QuoteRequest.findById(id);
  if (!quote) return res.status(404).json({ message: "Request not found." });
  const a = String(email).trim().toLowerCase();
  const b = String(quote.email).trim().toLowerCase();
  if (a !== b) return res.status(404).json({ message: "Request not found." });
  if (quote.status !== "Quoted") {
    return res.status(400).json({ message: "There is no open quotation to respond to." });
  }
  quote.status = action === "accept" ? "Accepted" : "Declined";
  await quote.save();

  if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPassword(),
        },
      });
      const workshopTo = process.env.WORKSHOP_QUOTE_EMAIL || process.env.JOB_SHEET_EMAIL;
      if (workshopTo) {
        const origin = appBaseUrl();
        const adminHtml = renderMailCard({
          eyebrow: "Quotation response",
          title: `Customer ${action === "accept" ? "accepted" : "declined"} quotation`,
          intro: `${quote.customerName} has responded to a quotation.`,
          bodyHtml: `
            <p style="margin:0 0 8px 0"><strong>Request ID:</strong> ${escapeHtml(String(quote._id))}</p>
            <p style="margin:0 0 8px 0"><strong>Customer:</strong> ${escapeHtml(quote.customerName)} (${escapeHtml(quote.email)})</p>
            <p style="margin:0"><strong>Decision:</strong> ${action === "accept" ? "Accepted ✅" : "Declined ❌"}</p>
          `,
          ctaLabel: "Open admin quotes",
          ctaHref: `${origin}/admin/quotes`,
          footnote: "Follow up from admin dashboard.",
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com",
          to: workshopTo,
          subject: `Quote ${quote._id} ${action === "accept" ? "accepted" : "declined"} — ${quote.customerName}`,
          text: `Customer ${quote.customerName} (${quote.email}) ${action === "accept" ? "accepted" : "declined"} the quotation for request ${quote._id}.`,
          html: adminHtml,
        });
      }
    } catch (mailErr) {
      console.error("Quote respond notify failed:", mailErr?.message || mailErr);
    }
  }

  res.json(quote);
});

function ymdLocalOrder(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function serializeShopProduct(p) {
  const effective = effectiveUnitPriceInr(p);
  const pg = ["machine", "accessory", "other"].includes(String(p.productGroup)) ? p.productGroup : "accessory";
  const stockRaw = p.stock;
  const stock =
    stockRaw === undefined || stockRaw === null ? null : Math.min(999999, Math.max(0, Math.floor(Number(stockRaw))));
  return {
    _id: p._id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    productGroup: pg,
    category: p.category,
    image: p.image,
    basePrice: p.basePrice,
    discountPercent: p.discountPercent ?? 0,
    effectivePrice: effective,
    stock,
  };
}

/** Single active product by URL slug (detail page). */
router.get("/shop-product/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) return res.status(400).json({ message: "Invalid product." });
    const p = await ShopProduct.findOne({ slug, isActive: true }).lean();
    if (!p) return res.status(404).json({ message: "Product not found." });
    res.json(serializeShopProduct(p));
  } catch (e) {
    console.error("GET /shop-product/:slug", e);
    res.status(500).json({ message: "Could not load product" });
  }
});

/** Escape user input for use inside a RegExp (case-insensitive search). */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Public catalog (active products only). Optional ?category= &productGroup= &q= (search) &limit= */
router.get("/shop-products", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const q = { isActive: true };
    const cat = _req.query.category;
    if (cat && String(cat).trim()) q.category = String(cat).trim();
    const pg = String(_req.query.productGroup || "").toLowerCase();
    if (pg === "machine" || pg === "accessory" || pg === "other") q.productGroup = pg;
    const rawQ = String(_req.query.q || _req.query.search || "").trim();
    if (rawQ) {
      const rx = new RegExp(escapeRegex(rawQ), "i");
      q.$or = [{ name: rx }, { description: rx }, { category: rx }, { slug: rx }];
    }
    const rawLimit = Number(_req.query.limit);
    const limit = Math.min(60, Math.max(0, Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 0));
    let query = ShopProduct.find(q).sort({ sortOrder: -1, createdAt: -1 });
    if (limit > 0) query = query.limit(limit);
    const rows = await query.lean();
    res.json(rows.map(serializeShopProduct));
  } catch (e) {
    console.error("GET /shop-products", e);
    res.status(500).json({ message: "Could not load products" });
  }
});

router.get("/shop-product-categories", async (_req, res) => {
  try {
    const mq = { isActive: true };
    const pg = String(_req.query.productGroup || "").toLowerCase();
    if (pg === "machine" || pg === "accessory" || pg === "other") mq.productGroup = pg;
    const cats = await ShopProduct.distinct("category", mq);
    const sorted = cats.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
    res.json({ categories: sorted });
  } catch (e) {
    console.error("GET /shop-product-categories", e);
    res.status(500).json({ message: "Could not load categories" });
  }
});

/** Compatibility endpoint for dashboards expecting `/api/orders`. */
router.get("/orders", async (_req, res) => {
  try {
    const rows = await ShopOrder.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select("orderNumber customerName email phone totalInr status createdAt")
      .lean();
    return res.json(
      rows.map((r) => ({
        _id: String(r._id),
        orderNumber: r.orderNumber,
        customerName: r.customerName,
        email: r.email,
        phone: r.phone,
        totalInr: Number(r.totalInr || 0),
        status: r.status || "pending",
        createdAt: r.createdAt || null,
      }))
    );
  } catch (e) {
    console.error("GET /orders", e);
    return res.status(500).json({ message: "Could not load orders" });
  }
});

/** Place a product order (cart checkout). Prices are recomputed server-side. */
router.post("/shop/orders", async (req, res) => {
  try {
    const { customerName, email, phone, address, customerNote, items } = req.body || {};
    const name = typeof customerName === "string" ? customerName.trim() : "";
    const em = typeof email === "string" ? email.trim() : "";
    const ph = typeof phone === "string" ? phone.trim() : "";
    const addr = typeof address === "string" ? address.trim() : "";
    const note = typeof customerNote === "string" ? customerNote.trim().slice(0, 2000) : "";
    if (!name || !em || !ph) {
      return res.status(400).json({ message: "Name, email, and phone are required." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Add at least one product to your cart." });
    }

    const lineInputs = [];
    for (const raw of items) {
      const productId = raw?.productId;
      const qty = Math.floor(Number(raw?.qty));
      if (!mongoose.isValidObjectId(productId) || !Number.isFinite(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ message: "Invalid cart line." });
      }
      lineInputs.push({ productId, qty });
    }

    const ids = [...new Set(lineInputs.map((l) => String(l.productId)))];
    const products = await ShopProduct.find({ _id: { $in: ids }, isActive: true }).lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));
    const builtLines = [];
    let subtotalListInr = 0;
    let totalInr = 0;

    for (const { productId, qty } of lineInputs) {
      const p = byId.get(String(productId));
      if (!p) return res.status(400).json({ message: "One or more products are unavailable." });
      const tracked = p.stock != null && Number.isFinite(Number(p.stock));
      if (tracked && qty > Math.floor(Number(p.stock))) {
        return res.status(400).json({ message: `Not enough stock for ${p.name}. Reduce quantity or remove the line.` });
      }
      const unitList = Number(p.basePrice);
      const discPct = Math.min(100, Math.max(0, Number(p.discountPercent) || 0));
      const unitEff = effectiveUnitPriceInr(p);
      const lineList = listTotalForQty(p, qty);
      const lineTot = Math.round(unitEff * qty * 100) / 100;
      subtotalListInr = Math.round((subtotalListInr + lineList) * 100) / 100;
      totalInr = Math.round((totalInr + lineTot) * 100) / 100;
      const pGroup = ["machine", "accessory", "other"].includes(String(p.productGroup)) ? p.productGroup : "accessory";
      builtLines.push({
        productId: p._id,
        name: p.name,
        productGroup: pGroup,
        category: p.category || "",
        qty,
        unitPriceList: unitList,
        discountPercent: discPct,
        unitPriceEffective: unitEff,
        lineTotal: lineTot,
      });
    }

    const discountInr = Math.max(0, Math.round((subtotalListInr - totalInr) * 100) / 100);
    const orderDateYmd = ymdLocalOrder();
    const orderNumber = `SHOP-${orderDateYmd.replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const order = await ShopOrder.create({
      orderNumber,
      orderDateYmd,
      customerName: name,
      email: em,
      phone: ph,
      address: addr,
      customerNote: note,
      items: builtLines,
      subtotalListInr,
      discountInr,
      totalInr,
      status: "pending",
    });

    for (const { productId, qty } of lineInputs) {
      const p = byId.get(String(productId));
      if (!p) continue;
      const tracked = p.stock != null && Number.isFinite(Number(p.stock));
      if (tracked) {
        await ShopProduct.updateOne({ _id: p._id }, { $inc: { stock: -qty } });
      }
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword()) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: smtpPassword() },
        });
        const workshopTo = process.env.WORKSHOP_QUOTE_EMAIL || process.env.JOB_SHEET_EMAIL;
        const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
        const lines = builtLines.map((l) => `• ${l.name} x${l.qty} → ${fmt.format(l.lineTotal)}`).join("\n");
        const text = `New shop order ${orderNumber}\n\n${name}\n${em}\n${ph}\n${addr ? `${addr}\n` : ""}\n${lines}\n\nTotal: ${fmt.format(totalInr)}\n${note ? `\nCustomer note: ${note}\n` : ""}`;
        const targets = [workshopTo, process.env.SMTP_FROM].filter(Boolean);
        if (targets.length) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com",
            to: targets[0],
            subject: `Shop order ${orderNumber} — ${fmt.format(totalInr)}`,
            text,
          });
        }
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com",
          to: em,
          subject: `We received your order ${orderNumber}`,
          text: `Hi ${name},\n\nThank you. We received your product order ${orderNumber} for ${fmt.format(totalInr)}.\nWe will contact you to confirm payment and pickup or delivery.\n\n— Workshop`,
        });
      } catch (mailErr) {
        console.error("shop order email:", mailErr?.message || mailErr);
      }
    }

    res.status(201).json({
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalInr: order.totalInr,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (e) {
    console.error("POST /shop/orders", e);
    res.status(500).json({ message: e.message || "Order failed" });
  }
});

module.exports = router;
