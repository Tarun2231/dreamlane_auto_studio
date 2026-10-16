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
    } catch (dbErr) {
      console.warn("[API catch-all] MongoDB not connected:", dbErr?.message || dbErr);
    }
    app(req, res);
  } catch (error) {
    console.error("API catch-all failed:", error);
    res.status(404).json({
      message: "API endpoint not found.",
      path: req.url,
    });
  }
}

module.exports = handler;
module.exports.config = config;
