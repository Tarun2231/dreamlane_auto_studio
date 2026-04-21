const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("Please define the MONGO_URI environment variable");
}

const options = {};
let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

module.exports = clientPromise;
