const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { processAdminLoginFollowUp } = require("../utils/adminLoginFollowUp");

const router = express.Router();

router.post("/admin/login", async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing — set it in backend/.env");
      return res.status(500).json({ message: "Server misconfiguration: JWT_SECRET is not set" });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

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

    void processAdminLoginFollowUp(req, admin).catch((err) => {
      console.error("[admin-login-follow-up]", err?.message || err);
    });

    return res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("admin/login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

router.post("/seed-admin", async (_req, res) => {
  const existing = await User.findOne({ role: "admin" });
  if (existing) return res.json({ message: "Admin already exists" });

  const admin = await User.create({
    name: "Admin",
    email: process.env.ADMIN_EMAIL || "admin@carcare.com",
    phone: "9999999999",
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
  });

  return res.status(201).json({ id: admin._id, email: admin.email });
});

module.exports = router;
