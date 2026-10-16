/* eslint-disable @typescript-eslint/no-require-imports */
const { lookupQuote, updateQuote } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, email, response, action } = req.body || {};
    if (!id || !email) {
      return res.status(400).json({ message: "Quote ID and email are required." });
    }

    const quote = await lookupQuote(id, email);
    if (!quote) {
      return res.status(404).json({ message: "Quote request not found." });
    }

    const act = String(action || response || "").toLowerCase();
    const nextStatus = act === "accept" ? "Accepted" : "Declined";

    const updated = await updateQuote(quote._id, {
      status: nextStatus,
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("POST /api/quote-request/respond error:", error);
    return res.status(500).json({ message: "Error updating quote response." });
  }
};
