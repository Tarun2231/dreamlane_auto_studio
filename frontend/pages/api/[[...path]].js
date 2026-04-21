/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const runtimeRequire = eval("require");
const repoRoot = path.join(process.cwd(), "..");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(repoRoot, "backend", ".env") });

function requireShared(modulePathInRepo, modulePathInPackage) {
  try {
    return runtimeRequire(modulePathInPackage);
  } catch {
    return runtimeRequire(path.join(repoRoot, modulePathInRepo));
  }
}

const connectMongo = requireShared("lib/mongodb", "car-service-business/lib/mongodb");
const app = requireShared("backend/src/app", "car-service-business/backend/src/app");
const { startServiceReminderCron } = requireShared(
  "backend/src/jobs/serviceReminders",
  "car-service-business/backend/src/jobs/serviceReminders"
);

let cronStarted = false;

const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

async function handler(req, res) {
  try {
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
