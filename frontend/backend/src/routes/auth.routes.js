const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { processAdminLoginFollowUp } = require("../utils/adminLoginFollowUp");

const router = express.Router();

async function handleAdminLogin(req, res) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing — set it in frontend/backend/.env");
      return res.status(500).json({ message: "Server misconfiguration: JWT_SECRET is not set" });
    }

    const { email, password } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "").trim();
    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const envAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const envAdminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
    
    // Built-in demo accounts that always work
    const isBuiltInDemo =
      (normalizedEmail === "admin@carcare.com" || normalizedEmail === "tarunn8n@gmail.com") &&
      normalizedPassword === "admin123";

    const isEnvMatch =
      envAdminEmail &&
      envAdminPassword &&
      normalizedEmail === envAdminEmail &&
      normalizedPassword === envAdminPassword;

    let admin;
    if (isEnvMatch || isBuiltInDemo) {
      admin = await User.findOne({ email: normalizedEmail });
      if (admin) {
        if (!["owner", "admin"].includes(admin.role)) admin.role = "admin";
        admin.email = normalizedEmail;
        admin.password = normalizedPassword;
        admin.isActive = true;
        if (!admin.name) admin.name = "Admin";
        if (!admin.phone) admin.phone = "9999999999";
        await admin.save();
      } else {
        admin = await User.create({
          name: "Admin",
          email: normalizedEmail,
          phone: "9999999999",
          password: normalizedPassword,
          role: "admin",
          isActive: true,
        });
      }
    } else {
      admin = await User.findOne({
        email: normalizedEmail,
        role: { $in: ["owner", "admin", "viewer"] },
      });
      if (!admin) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (admin.isActive === false) {
        return res.status(403).json({ message: "This admin account is disabled." });
      }

      const isMatch = await admin.comparePassword(normalizedPassword);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
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
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        mustResetPassword: admin.mustResetPassword === true,
      },
    });
  } catch (err) {
    console.error("admin/login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
}

router.post("/admin/login", handleAdminLogin);
router.post("/login", handleAdminLogin);

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
