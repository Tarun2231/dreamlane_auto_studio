/* eslint-disable @typescript-eslint/no-require-imports */
const mongoose = require("mongoose");
const getMongoUris = require("./resolveMongoUri");

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
    const { primary: uri } = getMongoUris();
    if (!uri) throw new Error("MONGO_URI is not set");
    const { ordered } = getMongoUris();
    globalForMongo.__frontendMongo.promise = (async () => {
      let firstError = null;
      for (const candidateUri of ordered) {
        try {
          const conn = await mongoose.connect(candidateUri, {
            connectTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000,
          });
          try {
            const backendMongoosePath = require("path").join(process.cwd(), "backend", "node_modules", "mongoose");
            if (require("fs").existsSync(backendMongoosePath)) {
              const backendMongoose = eval("require")(backendMongoosePath);
              if (backendMongoose !== mongoose && backendMongoose.connection.readyState !== 1) {
                await backendMongoose.connect(candidateUri, {
                  connectTimeoutMS: 5000,
                  serverSelectionTimeoutMS: 5000,
                });
              }
            }
          } catch {
            // non-fatal
          }
          return conn;
        } catch (error) {
          if (!firstError) firstError = error;
        }
      }
      globalForMongo.__frontendMongo.promise = null;
      globalForMongo.__frontendMongo.conn = null;
      throw firstError || new Error("Could not connect to MongoDB.");
    })();
  }

  globalForMongo.__frontendMongo.conn = await globalForMongo.__frontendMongo.promise;
  return globalForMongo.__frontendMongo.conn;
}

module.exports = connectMongo;
