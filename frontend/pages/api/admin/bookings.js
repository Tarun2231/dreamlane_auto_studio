/* eslint-disable @typescript-eslint/no-require-imports */
const { listBookings } = require("../../../lib/supabaseDb");
const { requireAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const bookings = await listBookings(req.query);
      return res.status(200).json(bookings);
    } catch (error) {
      console.error("GET /api/admin/bookings error:", error);
      return res.status(500).json({ message: "Could not load bookings." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
