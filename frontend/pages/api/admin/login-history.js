/* eslint-disable @typescript-eslint/no-require-imports */
const { requireAdmin } = require("./_auth");

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const now = new Date();
  const sampleItems = [
    {
      id: `hist-${Date.now()}`,
      at: now.toISOString(),
      email: auth.email || "admin@carcare.com",
      name: "Master Admin",
      ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").split(",")[0].trim(),
      locationLabel: "Admin Management Session",
      userAgent: String(req.headers["user-agent"] || "Modern Web Browser"),
      isoUtc: now.toISOString(),
      timezoneLine: "Asia/Kolkata (IST)",
    },
  ];

  return res.status(200).json({ items: sampleItems });
};
