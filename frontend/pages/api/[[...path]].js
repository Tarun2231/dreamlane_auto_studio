/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");
const runtimeRequire = eval("require");
const moduleLib = require("module");
const dotenv = require("dotenv");
// Keep these static imports so Turbopack traces backend runtime deps into the serverless bundle.
require("express");
require("cors");
require("morgan");
require("nodemailer");
require("multer");
require("multer-storage-cloudinary");
require("cloudinary");
require("bcryptjs");
require("jsonwebtoken");
require("node-cron");
require("pdfkit");

const frontendNodeModules = path.join(process.cwd(), "node_modules");
const parentNodeModules = path.join(process.cwd(), "..", "node_modules");
const fallbackNodeModules = [frontendNodeModules, parentNodeModules];
const fallbackNodePath = fallbackNodeModules.join(path.delimiter);
process.env.NODE_PATH = process.env.NODE_PATH
  ? `${fallbackNodePath}${path.delimiter}${process.env.NODE_PATH}`
  : fallbackNodePath;
moduleLib.Module._initPaths();
const originalResolveFilename = moduleLib.Module._resolveFilename;
moduleLib.Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request === "mongoose") {
    try {
      return originalResolveFilename.call(this, "mongoose", parent, isMain, {
        ...(options || {}),
        paths: [frontendNodeModules, ...fallbackNodeModules],
      });
    } catch {
      // fallback to standard resolution
    }
  }
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    const isBareImport = typeof request === "string" && !request.startsWith(".") && !path.isAbsolute(request);
    if (!isBareImport || error?.code !== "MODULE_NOT_FOUND") {
      throw error;
    }
    const fallbackOptions = {
      ...(options || {}),
      paths: [...fallbackNodeModules, ...((options && options.paths) || [])],
    };
    return originalResolveFilename.call(this, request, parent, isMain, fallbackOptions);
  }
};

function resolveRepoRoot() {
  const cwd = process.cwd();
  const candidates = [cwd, path.join(cwd, "..")];
  return (
    candidates.find((candidate) =>
      fs.existsSync(path.join(candidate, "backend", "src", "app.js")) ||
      fs.existsSync(path.join(candidate, "frontend", "backend", "src", "app.js"))
    ) || cwd
  );
}

const repoRoot = resolveRepoRoot();
const backendRoot = fs.existsSync(path.join(repoRoot, "backend", "src", "app.js"))
  ? path.join(repoRoot, "backend")
  : path.join(repoRoot, "frontend", "backend");
const backendEnvPath = path.join(backendRoot, ".env");
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

function requireShared(modulePathInBackend) {
  return runtimeRequire(path.join(backendRoot, modulePathInBackend));
}

const connectMongo = require("../../lib/mongodbMongoose");

let cronStarted = false;
let bootstrapped = false;
let app = null;
let startServiceReminderCron = null;

function ensureBackendLoaded() {
  if (app && startServiceReminderCron) return;
  app = requireShared("src/app");
  ({ startServiceReminderCron } = requireShared("src/jobs/serviceReminders"));
}

const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

async function handler(req, res) {
  try {
    ensureBackendLoaded();
    await connectMongo();
    if (!bootstrapped) {
      try {
        const ensureDefaultAdmin = requireShared("src/bootstrap/ensureAdmin");
        const ensureDefaultServices = requireShared("src/bootstrap/ensureDefaultServices");
        await ensureDefaultAdmin();
        await ensureDefaultServices();
      } catch (bootErr) {
        console.warn("[bootstrap] Non-fatal bootstrap warning:", bootErr?.message || bootErr);
      }
      bootstrapped = true;
    }
    if (!cronStarted) {
      startServiceReminderCron();
      cronStarted = true;
    }
    app(req, res);
  } catch (error) {
    console.error("API bootstrap failed:", error);
    const msg = String(error?.message || "");
    const dbDown =
      /ECONNREFUSED/i.test(msg) || /ServerSelectionError/i.test(String(error?.name || "")) || /MONGO_URI/i.test(msg);
    res.status(500).json({
      message: dbDown
        ? "Database is unavailable. Start MongoDB (or set a reachable MONGO_URI) and try again."
        : "API bootstrap failed",
    });
  }
}

module.exports = handler;
module.exports.config = config;
