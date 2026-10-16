const jwt = require("jsonwebtoken");

const DEFAULT_JWT_SECRET = "dreamlane-secret-jwt-key-2026-secure-token";

const protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
    const payload = jwt.verify(token, secret);
    if (!["owner", "admin", "viewer"].includes(String(payload.role || ""))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = payload;
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { protectAdmin };
