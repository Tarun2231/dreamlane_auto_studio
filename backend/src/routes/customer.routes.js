const express = require("express");
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
    serviceId,
    vehicleType,
    date,
    time,
    customerName,
    phone,
    email,
    carModel,
  } = req.body;

  const slot = await Slot.findOne({ date, time, isAvailable: true });
  if (!slot) return res.status(409).json({ message: "Slot unavailable" });

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
  }

  res.status(201).json(booking);
});

router.get("/booking/:id", async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("serviceId");
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  res.json(booking);
});

module.exports = router;
