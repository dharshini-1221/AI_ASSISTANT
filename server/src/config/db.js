const mongoose = require("mongoose");
const dns = require("dns");

/*
  Some hosts (including serverless platforms) resolve MongoDB
  SRV records slowly through the default resolver. Google DNS is
  used as a fallback. This is best-effort only, so a failure to
  set the servers must not stop the app from booting.
*/
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (_) {
  // Ignore: the platform resolver is used instead.
}

/*
  Serverless functions are short-lived and invoked concurrently.
  Reusing a single connection promise avoids opening a new pool
  on every cold start, and a small pool keeps the Atlas
  connection count predictable.
*/
const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  maxPoolSize: 5,
  minPoolSize: 0,
};

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI, CONNECTION_OPTIONS)
    .then((instance) => {
      console.log("MongoDB connected successfully");

      return instance.connection;
    })
    .catch((error) => {
      /*
        Reset so the next invocation can retry instead of
        reusing a permanently rejected promise.
      */
      connectionPromise = null;

      console.error(
        "MongoDB connection failed:",
        error.message
      );

      throw error;
    });

  return connectionPromise;
}

module.exports = connectDB;
