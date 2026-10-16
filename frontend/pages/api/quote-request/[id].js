/* eslint-disable @typescript-eslint/no-require-imports */
const { getQuoteById, updateQuote } = require("../../../lib/supabaseDb");

module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "Quote ID is required." });
  }

  if (req.method === "GET") {
    try {
      const quote = await getQuoteById(String(id));
      if (!quote) {
        return res.status(404).json({ message: "Quote request not found." });
      }
      return res.status(200).json(quote);
    } catch (error) {
      console.error("GET /api/quote-request/[id] error:", error);
      return res.status(500).json({ message: "Error fetching quote details." });
    }
  }

  if (req.method === "PUT") {
    try {
      const updated = await updateQuote(String(id), req.body);
      if (!updated) {
        return res.status(404).json({ message: "Quote not found to update." });
      }
      return res.status(200).json(updated);
    } catch (error) {
      console.error("PUT /api/quote-request/[id] error:", error);
      return res.status(500).json({ message: "Error updating quote." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
