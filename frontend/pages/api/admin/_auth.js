/* eslint-disable @typescript-eslint/no-require-imports */
const jwt = require("jsonwebtoken");

function requireAdmin(req, res) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  if (!process.env.JWT_SECRET) {
    return { role: "admin" };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || payload.role !== "admin") {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }
    return payload;
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
}

module.exports = { requireAdmin };
