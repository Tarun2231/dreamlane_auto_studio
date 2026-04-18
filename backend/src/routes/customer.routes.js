const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Service = require("../models/Service");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const User = require("../models/User");

const router = express.Router();

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
    carModel,
  } = req.body;

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
    carModel,
  });

  slot.isAvailable = false;
  await slot.save();

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
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
        to: email,
        subject: `Booking Confirmation #${booking._id}`,
        text: `Hi ${customerName}, your booking is confirmed for ${date} at ${time}. Booking ID: ${booking._id}.`,
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

module.exports = router;
