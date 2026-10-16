/* eslint-disable @typescript-eslint/no-require-imports */
const { listQuotes } = require("../../../lib/supabaseDb");
const { requireAdmin } = require("./_auth");

function validYmd(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
}

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const allQuotes = await listQuotes();
    const df = validYmd(req.query.dateFrom) ? String(req.query.dateFrom) : null;
    const dt = validYmd(req.query.dateTo) ? String(req.query.dateTo) : null;

    const filtered = allQuotes.filter((q) => {
      const ymd = (q.createdAt || "").slice(0, 10);
      if (df && dt && df <= dt) {
        return ymd >= df && ymd <= dt;
      }
      return true;
    });

    const count = (status) => filtered.filter((q) => (q.status || "").toLowerCase() === status.toLowerCase()).length;
    const submitted = count("Submitted");
    const pending = count("Pending");
    const quoted = count("Quoted");
    const accepted = count("Accepted");
    const declined = count("Declined");
    const closed = count("Closed");
    const total = filtered.length;

    return res.status(200).json({ submitted, pending, quoted, accepted, declined, closed, total });
  } catch (error) {
    console.error("/api/admin/quote-stats failed:", error?.message);
    return res.status(200).json({ submitted: 0, pending: 0, quoted: 0, accepted: 0, declined: 0, closed: 0, total: 0 });
  }
};
