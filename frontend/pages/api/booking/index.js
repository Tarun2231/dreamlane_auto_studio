/* eslint-disable @typescript-eslint/no-require-imports */
const { createBooking, listBookings } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const payload = req.body || {};
      const {
        customerName,
        customer_name,
        email,
        phone,
        carMake,
        car_make,
        carModel,
        car_model,
        date,
        time,
      } = payload;

      const name = String(customerName || customer_name || "").trim();
      const mail = String(email || "").trim();
      const ph = String(phone || "").trim();
      const make = String(carMake || car_make || "").trim();
      const model = String(carModel || car_model || "").trim();

      if (!name || name.length < 2) {
        return res.status(400).json({ message: "Customer name is required." });
      }
      if (!mail || !mail.includes("@")) {
        return res.status(400).json({ message: "Valid email address is required." });
      }
      if (!ph || ph.length < 5) {
        return res.status(400).json({ message: "Valid phone number is required." });
      }
      if (!make || !model) {
        return res.status(400).json({ message: "Vehicle make and model are required." });
      }
      if (!date || !time) {
        return res.status(400).json({ message: "Service date and time slot are required." });
      }

      const booking = await createBooking(payload);
      return res.status(201).json(booking);
    } catch (error) {
      console.error("POST /api/booking error:", error?.message || error);
      const status = error.statusCode || 500;
      return res.status(status).json({ message: error.message || "Could not create booking. Please try again." });
    }
  }

  if (req.method === "GET") {
    try {
      const bookings = await listBookings(req.query);
      return res.status(200).json(bookings);
    } catch (error) {
      console.error("GET /api/booking error:", error);
      return res.status(500).json({ message: "Could not load bookings." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
