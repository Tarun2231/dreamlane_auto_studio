const path = require("path");
const { createRequire } = require("module");
const backendRequire = createRequire(path.join(__dirname, "..", "backend", "package.json"));
const mongoose = backendRequire("mongoose");
const ensureDefaultAdmin = require("../backend/src/bootstrap/ensureAdmin");
const ensureDefaultServices = require("../backend/src/bootstrap/ensureDefaultServices");

const globalForMongo = global;

if (!globalForMongo.__mongo) {
  globalForMongo.__mongo = { conn: null, promise: null, bootstrapped: false };
}

async function connectMongo() {
  if (globalForMongo.__mongo.conn) return globalForMongo.__mongo.conn;

  if (!globalForMongo.__mongo.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set");
    }
    globalForMongo.__mongo.promise = mongoose.connect(uri);
  }

  globalForMongo.__mongo.conn = await globalForMongo.__mongo.promise;

  if (!globalForMongo.__mongo.bootstrapped) {
    await ensureDefaultAdmin();
    await ensureDefaultServices();
    globalForMongo.__mongo.bootstrapped = true;
  }

  return globalForMongo.__mongo.conn;
}

module.exports = connectMongo;
