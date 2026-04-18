const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));

/**
 * Friendly GET responses (opening URLs in the browser uses GET).
 * Register these BEFORE app.use("/api", ...) so they are not swallowed by the API router.
 */
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Car Service API",
    message: "This is the JSON backend only. Open the Next.js site (the port from npm run dev, often 3000 or 3002).",
    health: "GET /api/health",
  });
});

app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    message: "API is running",
    health: "GET /api/health",
    services: "GET /api/services",
    adminLogin: "POST /api/auth/admin/login (use the Admin login page in the Next app, not this URL in the address bar)",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "express", mongo: "see server logs" });
});

/** Login is POST-only; browser address bar sends GET — explain instead of "Cannot GET" */
app.get("/api/auth/admin/login", (_req, res) => {
  res.status(200).json({
    message: "This URL expects POST with JSON { email, password }.",
    openInstead: "/admin/login on your Next.js dev server (same host as the website)",
  });
});

app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api", require("./src/routes/customer.routes"));
app.use("/api/admin", require("./src/routes/admin.routes"));

const { startServiceReminderCron } = require("./src/jobs/serviceReminders");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  startServiceReminderCron();
});
