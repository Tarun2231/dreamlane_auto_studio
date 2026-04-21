const mongoose = require("mongoose");

const globalForMongo = global;

if (!globalForMongo.__frontendMongo) {
  globalForMongo.__frontendMongo = { conn: null, promise: null };
}

async function connectMongo() {
  if (globalForMongo.__frontendMongo.conn) return globalForMongo.__frontendMongo.conn;

  if (!globalForMongo.__frontendMongo.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI is not set");
    globalForMongo.__frontendMongo.promise = mongoose.connect(uri);
  }

  globalForMongo.__frontendMongo.conn = await globalForMongo.__frontendMongo.promise;
  return globalForMongo.__frontendMongo.conn;
}

module.exports = connectMongo;
