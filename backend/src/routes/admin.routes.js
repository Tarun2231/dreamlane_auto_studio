const express = require("express");
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const { protectAdmin } = require("../middleware/auth");
const Service = require("../models/Service");
const Slot = require("../models/Slot");
const Booking = require("../models/Booking");
const JobCard = require("../models/JobCard");
const Inspection = require("../models/Inspection");

const router = express.Router();
const upload = multer({ storage });

router.use(protectAdmin);

router.get("/dashboard", async (_req, res) => {
  const [totalBookings, todaysBookings, activeServices] = await Promise.all([
    Booking.countDocuments(),
    Booking.countDocuments({ date: new Date().toISOString().slice(0, 10) }),
    Service.countDocuments(),
  ]);

  res.json({ totalBookings, todaysBookings, activeServices });
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
  const { date, status } = req.query;
  const query = {};
  if (date) query.date = date;
  if (status) query.status = status;
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

module.exports = router;
