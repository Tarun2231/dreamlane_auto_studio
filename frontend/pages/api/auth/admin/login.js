/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const jwt = require("jsonwebtoken");
const connectMongo = require("../../../../lib/mongodbMongoose");
const runtimeRequire = eval("require");

const repoRoot = path.join(process.cwd(), "..");
function requireShared(modulePathInRepo, modulePathInPackage) {
  try {
    return runtimeRequire(modulePathInPackage);
  } catch {
    return runtimeRequire(path.join(repoRoot, modulePathInRepo));
  }
}
const User = requireShared("backend/src/models/User", "car-service-business/backend/src/models/User");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server misconfiguration: JWT_SECRET is not set" });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    await connectMongo();
    const admin = await User.findOne({ email: String(email).trim(), role: "admin" });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error("admin/login api error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};
