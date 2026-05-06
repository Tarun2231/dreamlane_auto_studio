const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");
const getMongoUris = require("./resolveMongoUri");

function resolveBackendEnvPath() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "backend", ".env"),
    path.join(cwd, "frontend", "backend", ".env"),
    path.join(cwd, "..", "backend", ".env"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

// For local dev, allow fallback to frontend/backend/.env if MONGO_URI is not present in frontend env.
if (!process.env.MONGO_URI) {
  const backendEnvPath = resolveBackendEnvPath();
  if (backendEnvPath) {
    dotenv.config({ path: backendEnvPath });
  }
}

const options = {
  connectTimeoutMS: 3000,
  serverSelectionTimeoutMS: 3000,
};
let client;
let clientPromise;
let resolvedUri;

const { primary: uri } = getMongoUris();

if (!uri) {
  throw new Error("Please define the MONGO_URI environment variable");
}

async function createConnectionPromise() {
  const { ordered } = getMongoUris();
  let firstError = null;
  for (const candidateUri of ordered) {
    const candidateClient = new MongoClient(candidateUri, options);
    try {
      resolvedUri = candidateUri;
      client = candidateClient;
      return await candidateClient.connect();
    } catch (error) {
      if (!firstError) firstError = error;
    }
  }
  // Allow subsequent requests to retry instead of staying stuck on a rejected promise.
  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise = null;
  } else {
    clientPromise = null;
  }
  throw firstError || new Error("Could not connect to MongoDB.");
}

function getClientPromise() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createConnectionPromise();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = createConnectionPromise();
  }
  return clientPromise;
}

// Keep backward compatibility with existing `await clientPromise` call sites.
const thenableClientPromise = {
  then(onFulfilled, onRejected) {
    return getClientPromise().then(onFulfilled, onRejected);
  },
  catch(onRejected) {
    return getClientPromise().catch(onRejected);
  },
  finally(onFinally) {
    return getClientPromise().finally(onFinally);
  },
};

module.exports = thenableClientPromise;
module.exports.getResolvedMongoUri = () => resolvedUri;
