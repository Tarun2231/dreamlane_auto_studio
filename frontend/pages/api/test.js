/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const runtimeRequire = eval("require");

const repoRoot = path.join(process.cwd(), "..");
const connectMongo = runtimeRequire(path.join(repoRoot, "lib", "mongodb"));
const mongoose = runtimeRequire("module")
  .createRequire(path.join(repoRoot, "backend", "package.json"))("mongoose");

module.exports = async function handler(_req, res) {
  try {
    await connectMongo();
    const db = mongoose.connection.db;

    const result = await db.collection("test").insertOne({
      message: "MongoDB connected successfully",
      time: new Date(),
    });

    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
