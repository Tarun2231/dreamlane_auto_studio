/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const clientPromise = require("../../../../lib/mongodb");

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
    const emailNorm = String(email).trim().toLowerCase();
    const defaultAdminEmail = String(process.env.ADMIN_EMAIL || "admin@carcare.com")
      .trim()
      .toLowerCase();
    const defaultAdminPassword = String(process.env.ADMIN_PASSWORD || "admin123");

    const client = await clientPromise;
    const dbName = process.env.MONGO_DB_NAME || "car-service";
    const db = client.db(dbName);
    const users = db.collection("users");
    let admin = await users.findOne({ email: emailNorm, role: "admin" });

    if (admin) {
      const hashed = String(admin.password || "");
      const looksHashed = hashed.startsWith("$2a$") || hashed.startsWith("$2b$") || hashed.startsWith("$2y$");
      const isMatch = looksHashed ? await bcrypt.compare(password, hashed) : password === hashed;

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Transparently migrate legacy plaintext password records to bcrypt.
      if (!looksHashed) {
        const migratedHash = await bcrypt.hash(password, 10);
        await users.updateOne({ _id: admin._id }, { $set: { password: migratedHash } });
        admin.password = migratedHash;
      }
    } else {
      // Bootstrap fallback: allow default admin credentials to self-heal missing admin record.
      if (emailNorm !== defaultAdminEmail || password !== defaultAdminPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
      const now = new Date();
      await users.updateOne(
        { email: emailNorm },
        {
          $set: {
            name: "Admin",
            email: emailNorm,
            phone: "9999999999",
            role: "admin",
            password: hashedPassword,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );
      admin = await users.findOne({ email: emailNorm, role: "admin" });
      if (!admin) {
        return res.status(500).json({ message: "Login failed" });
      }
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
