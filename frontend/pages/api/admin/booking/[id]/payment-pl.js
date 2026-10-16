/* eslint-disable @typescript-eslint/no-require-imports */
const { updateBooking, getBookingById } = require("../../../../../lib/supabaseDb");
const { requireAdmin } = require("../../_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { finalAmount, paymentMethod, paymentReference, paymentReceivedYmd, paymentStatus } = req.body || {};

    const updates = {};
    if (finalAmount !== undefined) updates.finalAmount = Number(finalAmount);
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (paymentReference !== undefined) updates.paymentReference = paymentReference;
    if (paymentReceivedYmd !== undefined) updates.paymentReceivedYmd = paymentReceivedYmd;
    if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;

    const updated = await updateBooking(String(id), updates);
    return res.status(200).json(updated);
  } catch (error) {
    console.error("PUT /api/admin/booking/[id]/payment-pl error:", error);
    return res.status(500).json({ message: "Could not update payment details." });
  }
};
