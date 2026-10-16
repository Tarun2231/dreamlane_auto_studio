/* eslint-disable @typescript-eslint/no-require-imports */
const { getBookingById } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: "Booking ID is required." });
    }

    const booking = await getBookingById(String(id));
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    return res.status(200).json(booking);
  } catch (error) {
    console.error("GET /api/booking/[id] error:", error);
    return res.status(500).json({ message: "Error fetching booking details." });
  }
};
