/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const clientPromise = require("../../../../lib/mongodb");

const DEFAULT_JWT_SECRET = "dreamlane-secret-jwt-key-2026-secure-token";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const defaultAdminEmail = String(process.env.ADMIN_EMAIL || "admin@carcare.com")
      .trim()
      .toLowerCase();
    const defaultAdminPassword = String(process.env.ADMIN_PASSWORD || "admin123");

    const isDemoMatch =
      (emailNorm === "admin@carcare.com" || emailNorm === "tarunn8n@gmail.com") &&
      password === "admin123";

    const isEnvMatch =
      emailNorm === defaultAdminEmail &&
      password === defaultAdminPassword;

    let admin = null;

    try {
      const client = await clientPromise;
      if (client) {
        const dbName = process.env.MONGO_DB_NAME || "car-service";
        const db = client.db(dbName);
        const users = db.collection("users");
        admin = await users.findOne({ email: emailNorm, role: { $in: ["owner", "admin", "viewer"] } });

        if (admin) {
          if (admin.isActive === false) {
            return res.status(403).json({ message: "This admin account is disabled." });
          }

          if (!isDemoMatch && !isEnvMatch) {
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
          }
        } else if (isDemoMatch || isEnvMatch) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const now = new Date();
          await users.updateOne(
            { email: emailNorm },
            {
              $set: {
                name: "Admin",
                email: emailNorm,
                phone: "9999999999",
                role: "admin",
                isActive: true,
                password: hashedPassword,
                updatedAt: now,
              },
              $setOnInsert: { createdAt: now },
            },
            { upsert: true }
          );
          admin = await users.findOne({ email: emailNorm, role: "admin" });
        }
      }
    } catch (dbErr) {
      console.warn("Database connection unavailable during admin login; validating credentials via fallback:", dbErr?.message);
    }

    // Fallback: If DB is unreachable or disconnected, but credentials match demo / env admin
    if (!admin && (isDemoMatch || isEnvMatch)) {
      admin = {
        _id: "admin-master-id",
        name: "Admin",
        email: emailNorm,
        role: "admin",
      };
    }

    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      jwtSecret,
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
