/* eslint-disable @typescript-eslint/no-require-imports */
const { getQuoteById, updateQuote } = require("../../../../lib/supabaseDb");
const { requireAdmin } = require("../_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: "Quote ID is required." });
  }

  if (req.method === "GET") {
    try {
      const quote = await getQuoteById(String(id));
      if (!quote) {
        return res.status(404).json({ message: "Quote not found." });
      }
      return res.status(200).json(quote);
    } catch (error) {
      console.error("GET /api/admin/quote-request/[id] error:", error);
      return res.status(500).json({ message: "Error fetching quote." });
    }
  }

  if (req.method === "PUT") {
    try {
      const updated = await updateQuote(String(id), req.body);
      if (!updated) {
        return res.status(404).json({ message: "Quote not found." });
      }
      return res.status(200).json(updated);
    } catch (error) {
      console.error("PUT /api/admin/quote-request/[id] error:", error);
      return res.status(500).json({ message: "Error updating quote." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
