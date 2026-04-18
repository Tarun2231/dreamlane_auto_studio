const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Service = require("../models/Service");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const QuoteRequest = require("../models/QuoteRequest");
const User = require("../models/User");
const { buildInvoicePdfBuffer } = require("../utils/invoicePdf");

const router = express.Router();

/** Gmail app passwords are often pasted with spaces; strip for nodemailer. */
function smtpPassword() {
  return String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
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
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com",
        to: email,
        subject: `We received your service booking — ${String(booking._id).slice(-8)}`,
        text: `Hi ${customerName},\n\nThank you — we have received your service booking.\n\nWe will get in touch with you if we need any further details before your visit.\n\n--- Your booking ---\nBooking ID: ${booking._id}\nDate: ${date}\nTime: ${time}\nVehicle: ${carMake} ${carModel} (${vehicleYear})\nChassis (RC): ${chassisNumber}\n\nSave your booking ID to track your appointment on our website.\n\n— ${garage}`,
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

  const quote = await QuoteRequest.create({
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
      await transporter.sendMail({
        from,
        to: email,
        subject: `We received your quotation request — ${String(quote._id).slice(-8)}`,
        text: `Hi ${customerName},\n\nThank you — we have received your quotation request.\n\nWe will review your details and get back to you with a quotation. You can also check status anytime using "Track quote" on our website with your reference and email.\n\n--- Reference ---\nRequest ID: ${quote._id}\n\n--- What you sent ---\nVehicle: ${vehicleHint}\nService:\n${serviceBlock}\n\nParts / notes: ${partsNotes || "—"}\n\n— ${garage}`,
      });
      emailSent.customer = true;
      const workshopTo = process.env.WORKSHOP_QUOTE_EMAIL || process.env.JOB_SHEET_EMAIL;
      if (workshopTo) {
        await transporter.sendMail({
          from,
          to: workshopTo,
          subject: `New quote request ${quote._id} — ${customerName}`,
          text: `New quotation request\n\nID: ${quote._id}\nName: ${customerName}\nEmail: ${email}\nPhone: ${phone}\n\nVehicle:\n${vehicleHint}\n\nService:\n${serviceBlock}\n\nParts / replacement notes:\n${partsNotes || "—"}\n`,
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
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@carcare.com",
          to: workshopTo,
          subject: `Quote ${quote._id} ${action === "accept" ? "accepted" : "declined"} — ${quote.customerName}`,
          text: `Customer ${quote.customerName} (${quote.email}) ${action === "accept" ? "accepted" : "declined"} the quotation for request ${quote._id}.`,
        });
      }
    } catch (mailErr) {
      console.error("Quote respond notify failed:", mailErr?.message || mailErr);
    }
  }

  res.json(quote);
});

module.exports = router;
