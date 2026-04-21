/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const runtimeRequire = eval("require");
const repoRoot = path.join(process.cwd(), "..");
const dotenv = runtimeRequire("dotenv");

dotenv.config({ path: path.join(repoRoot, "backend", ".env") });

const connectMongo = runtimeRequire(path.join(repoRoot, "lib", "mongodb"));
const app = runtimeRequire(path.join(repoRoot, "backend", "src", "app"));
const { startServiceReminderCron } = runtimeRequire(
  path.join(repoRoot, "backend", "src", "jobs", "serviceReminders")
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
