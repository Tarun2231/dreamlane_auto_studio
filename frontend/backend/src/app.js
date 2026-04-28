const path = require("path");
const Module = require("module");

const sharedNodePaths = [
  path.join(process.cwd(), "node_modules"),
  path.join(process.cwd(), "..", "node_modules"),
  path.join(process.cwd(), "frontend", "node_modules"),
];
const sharedNodePath = sharedNodePaths.join(path.delimiter);
process.env.NODE_PATH = process.env.NODE_PATH
  ? `${sharedNodePath}${path.delimiter}${process.env.NODE_PATH}`
  : sharedNodePath;
Module._initPaths();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

/** When behind nginx/Caddy/etc., set TRUST_PROXY_HOPS=1 so client IPs from X-Forwarded-For are trusted. */
const trustHops = process.env.TRUST_PROXY_HOPS;
if (trustHops !== undefined && String(trustHops).trim() !== "") {
  const n = Number(trustHops);
  app.set("trust proxy", Number.isFinite(n) && n >= 0 ? n : 1);
}

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Car Service API",
    message: "Vercel API is running via Next.js",
    health: "GET /api/health",
  });
});

app.get("/api", (_req, res) => {
  res.json({
    ok: true,
    message: "API is running",
    health: "GET /api/health",
    services: "GET /api/services",
    adminLogin: "POST /api/auth/admin/login",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "next-api-express", mongo: "connected" });
});

/** Local admin uploads (when Cloudinary is not configured). Served at /api/uploads/... */
app.use(
  "/api/uploads",
  express.static(path.join(__dirname, "..", "uploads", "public"), {
    maxAge: "7d",
    immutable: false,
  })
);

/** Login is POST-only; browser address bar sends GET — explain instead of "Cannot GET" */
app.get("/api/auth/admin/login", (_req, res) => {
  res.status(200).json({
    message: "This URL expects POST with JSON { email, password }.",
    openInstead: "/admin/login on your Next.js site",
  });
});
app.get("/api/auth/login", (_req, res) => {
  res.status(200).json({
    message: "This URL expects POST with JSON { email, password }.",
    openInstead: "/admin/login on your Next.js site",
  });
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api", require("./routes/customer.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

// Ensure all API failures return JSON in serverless runtime.
app.use((err, _req, res, _next) => {
  console.error("Unhandled API error:", err);
  return res.status(500).json({ message: err?.message || "Internal server error" });
});

module.exports = app;
