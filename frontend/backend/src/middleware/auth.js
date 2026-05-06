const jwt = require("jsonwebtoken");

const protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
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
