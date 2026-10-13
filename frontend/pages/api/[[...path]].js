/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Backend env file if present
const backendEnvPath = path.join(__dirname, "../../backend/.env");
if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}

const connectMongo = require("../../lib/mongodbMongoose");
const app = require("../../backend/src/app");
const { startServiceReminderCron } = require("../../backend/src/jobs/serviceReminders");
const ensureDefaultAdmin = require("../../backend/src/bootstrap/ensureAdmin");
const ensureDefaultServices = require("../../backend/src/bootstrap/ensureDefaultServices");

let cronStarted = false;
let bootstrapped = false;

const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

async function handler(req, res) {
  try {
    await connectMongo();
    if (!bootstrapped) {
      try {
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
    const msg = String(error?.message || error || "");
    const dbDown =
      /ECONNREFUSED/i.test(msg) || /ServerSelectionError/i.test(String(error?.name || "")) || /MONGO_URI/i.test(msg);
    res.status(500).json({
      message: dbDown
        ? "Database is unavailable. Start MongoDB (or set a reachable MONGO_URI) and try again."
        : `API bootstrap failed: ${msg}`,
    });
  }
}

module.exports = handler;
module.exports.config = config;
