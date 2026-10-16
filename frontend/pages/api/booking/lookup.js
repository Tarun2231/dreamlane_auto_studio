/* eslint-disable @typescript-eslint/no-require-imports */
const { lookupBooking } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, email } = req.body || {};
    if (!id || !email) {
      return res.status(400).json({ message: "Booking reference ID and email are required." });
    }

    const booking = await lookupBooking(id, email);
    if (!booking) {
      return res.status(404).json({ message: "No booking matches that reference ID and email." });
    }

    return res.status(200).json(booking);
  } catch (error) {
    console.error("POST /api/booking/lookup error:", error);
    return res.status(500).json({ message: "Error looking up booking." });
  }
};
