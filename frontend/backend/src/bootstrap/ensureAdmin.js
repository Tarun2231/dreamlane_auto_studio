const User = require("../models/User");

/**
 * Creates a default admin if none exists (local dev / first deploy).
 * Credentials from ADMIN_EMAIL / ADMIN_PASSWORD or defaults in .env.example.
 */
async function ensureDefaultAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || "admin@carcare.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const existingAdmin = await User.findOne({ role: "admin" });

    if (!existingAdmin) {
      await User.create({
        name: "Admin",
        email,
        phone: "9999999999",
        password,
        role: "admin",
      });
      console.log(`[auth] Default admin user created: ${email}`);
      return;
    }

    let changed = false;
    if (existingAdmin.email !== email) {
      existingAdmin.email = email;
      changed = true;
    }
    const isSamePassword = await existingAdmin.comparePassword(password);
    if (!isSamePassword) {
      existingAdmin.password = password;
      changed = true;
    }
    if (changed) {
      await existingAdmin.save();
      console.log(`[auth] Admin credentials synced from environment for: ${email}`);
    }
  } catch (e) {
    console.error("[auth] Could not ensure default admin:", e.message);
  }
}

module.exports = ensureDefaultAdmin;
