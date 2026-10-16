/* eslint-disable @typescript-eslint/no-require-imports */
const { getSlots } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const date = req.query.date ? String(req.query.date).trim() : null;
    const slots = await getSlots(date);
    const available = slots.filter((s) => s.isAvailable);
    return res.status(200).json(available);
  } catch (error) {
    console.error("GET /api/slots/available error:", error?.message);
    return res.status(200).json([]);
  }
};
