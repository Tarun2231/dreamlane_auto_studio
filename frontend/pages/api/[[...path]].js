/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const runtimeRequire = eval("require");
const moduleLib = require("module");
const repoRoot = path.join(process.cwd(), "..");
const dotenv = require("dotenv");

const frontendNodeModules = path.join(process.cwd(), "node_modules");
process.env.NODE_PATH = process.env.NODE_PATH
  ? `${frontendNodeModules}${path.delimiter}${process.env.NODE_PATH}`
  : frontendNodeModules;
moduleLib.Module._initPaths();
const originalResolveFilename = moduleLib.Module._resolveFilename;
moduleLib.Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (error) {
    const isBareImport = typeof request === "string" && !request.startsWith(".") && !path.isAbsolute(request);
    if (!isBareImport || error?.code !== "MODULE_NOT_FOUND") {
      throw error;
    }
    const fallbackOptions = {
      ...(options || {}),
      paths: [frontendNodeModules, ...((options && options.paths) || [])],
    };
    return originalResolveFilename.call(this, request, parent, isMain, fallbackOptions);
  }
};

dotenv.config({ path: path.join(repoRoot, "backend", ".env") });

function requireShared(modulePathInRepo, modulePathInPackage) {
  try {
    return runtimeRequire(modulePathInPackage);
  } catch {
    return runtimeRequire(path.join(repoRoot, modulePathInRepo));
  }
}

const connectMongo = require("../../lib/mongodbMongoose");

let cronStarted = false;
let app = null;
let startServiceReminderCron = null;

function ensureBackendLoaded() {
  if (app && startServiceReminderCron) return;
  app = requireShared("backend/src/app", "car-service-business/backend/src/app");
  ({ startServiceReminderCron } = requireShared(
    "backend/src/jobs/serviceReminders",
    "car-service-business/backend/src/jobs/serviceReminders"
  ));
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
    if (!cronStarted) {
      startServiceReminderCron();
      cronStarted = true;
    }
    app(req, res);
  } catch (error) {
    console.error("API bootstrap failed:", error);
    res.status(500).json({ message: "API bootstrap failed" });
  }
}

module.exports = handler;
module.exports.config = config;
