/* eslint-disable @typescript-eslint/no-require-imports */
const jwt = require("jsonwebtoken");

const DEFAULT_JWT_SECRET = "dreamlane-secret-jwt-key-2026-secure-token";

function requireAdmin(req, res) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload || !["admin", "owner", "viewer"].includes(payload.role)) {
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
