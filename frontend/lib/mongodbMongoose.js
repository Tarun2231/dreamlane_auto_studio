const mongoose = require("mongoose");

const globalForMongo = global;

if (!globalForMongo.__frontendMongo) {
  globalForMongo.__frontendMongo = { conn: null, promise: null };
}

async function connectMongo() {
  const cachedConn = globalForMongo.__frontendMongo.conn;
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }
  if (cachedConn && mongoose.connection.readyState !== 1) {
    globalForMongo.__frontendMongo.conn = null;
  }

  if (!globalForMongo.__frontendMongo.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI is not set");
    globalForMongo.__frontendMongo.promise = mongoose.connect(uri).catch((error) => {
      globalForMongo.__frontendMongo.promise = null;
      globalForMongo.__frontendMongo.conn = null;
      throw error;
    });
  }

  globalForMongo.__frontendMongo.conn = await globalForMongo.__frontendMongo.promise;
  return globalForMongo.__frontendMongo.conn;
}

module.exports = connectMongo;
