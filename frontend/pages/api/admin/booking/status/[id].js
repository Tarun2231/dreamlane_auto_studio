/* eslint-disable @typescript-eslint/no-require-imports */
const { updateBooking } = require("../../../../../lib/supabaseDb");
const { requireAdmin } = require("../../_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { status } = req.body || {};
    if (!id || !status) {
      return res.status(400).json({ message: "Booking ID and status are required." });
    }

    const updated = await updateBooking(String(id), { status });
    return res.status(200).json(updated);
  } catch (error) {
    console.error("PUT /api/admin/booking/status/[id] error:", error);
    return res.status(500).json({ message: "Could not update booking status." });
  }
};
