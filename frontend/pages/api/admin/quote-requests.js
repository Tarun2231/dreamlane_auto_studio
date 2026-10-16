/* eslint-disable @typescript-eslint/no-require-imports */
const { listQuotes } = require("../../../lib/supabaseDb");
const { requireAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    try {
      const quotes = await listQuotes(req.query);
      return res.status(200).json(quotes);
    } catch (error) {
      console.error("GET /api/admin/quote-requests error:", error);
      return res.status(500).json({ message: "Could not load quote requests." });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
};
