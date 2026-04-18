const User = require("../models/User");

/**
 * Creates a default admin if none exists (local dev / first deploy).
 * Credentials from ADMIN_EMAIL / ADMIN_PASSWORD or defaults in .env.example.
 */
async function ensureDefaultAdmin() {
  try {
    const count = await User.countDocuments({ role: "admin" });
    if (count > 0) return;

    const email = process.env.ADMIN_EMAIL || "admin@carcare.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";

    await User.create({
      name: "Admin",
      email,
      phone: "9999999999",
      password,
      role: "admin",
    });
    console.log(`[auth] Default admin user created: ${email}`);
  } catch (e) {
    console.error("[auth] Could not ensure default admin:", e.message);
  }
}

module.exports = ensureDefaultAdmin;
