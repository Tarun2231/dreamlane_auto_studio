/* eslint-disable @typescript-eslint/no-require-imports */
const { requireAdmin } = require("./_auth");

const ALLOWED = new Set(["online", "offline", "break"]);
let currentPresence = "online";

module.exports = async function handler(req, res) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  try {
    if (req.method === "GET") {
      return res.status(200).json({ supportStatus: currentPresence });
    }

    if (req.method === "PUT") {
      const next = String(req.body?.supportStatus || "").toLowerCase();
      if (!ALLOWED.has(next)) {
        return res.status(400).json({ message: "Invalid support status." });
      }
      currentPresence = next;
      return res.status(200).json({ supportStatus: next });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("/api/admin/site-presence failed:", error?.message);
    return res.status(200).json({ supportStatus: currentPresence });
  }
};
