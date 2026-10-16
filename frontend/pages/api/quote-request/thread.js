/* eslint-disable @typescript-eslint/no-require-imports */
const { lookupQuote } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, email } = req.body || {};
    if (!id || !email) {
      return res.status(400).json({ message: "Quote ID and email are required." });
    }

    const quote = await lookupQuote(id, email);
    if (!quote) {
      return res.status(404).json({ message: "Quote not found." });
    }

    return res.status(200).json(quote);
  } catch (error) {
    console.error("POST /api/quote-request/thread error:", error);
    return res.status(500).json({ message: "Error fetching message thread." });
  }
};
