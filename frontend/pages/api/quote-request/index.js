/* eslint-disable @typescript-eslint/no-require-imports */
const { createQuote, listQuotes } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const payload = req.body || {};
      const name = String(payload.customerName || payload.customer_name || "").trim();
      const mail = String(payload.email || "").trim();
      const ph = String(payload.phone || "").trim();

      if (!name || name.length < 2) {
        return res.status(400).json({ message: "Customer name is required." });
      }
      if (!mail || !mail.includes("@")) {
        return res.status(400).json({ message: "Valid email address is required." });
      }
      if (!ph || ph.length < 5) {
        return res.status(400).json({ message: "Valid phone number is required." });
      }

      const quote = await createQuote(payload);
      return res.status(201).json(quote);
    } catch (error) {
      console.error("POST /api/quote-request error:", error);
      return res.status(500).json({ message: "Could not submit quotation request. Please try again." });
    }
  }

  if (req.method === "GET") {
    try {
      const quotes = await listQuotes(req.query);
      return res.status(200).json(quotes);
    } catch (error) {
      console.error("GET /api/quote-request error:", error);
      return res.status(500).json({ message: "Could not load quote requests." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
