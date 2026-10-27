const mongoose = require("mongoose");
const dns = require("dns");

/*
  Some hosts resolve MongoDB SRV records slowly through the default
  resolver, so Google DNS can be used as a fallback. This is best-effort
  only, so a failure to set the servers must not stop the app from
  booting.

  On Vercel the platform resolver handles Atlas SRV lookups correctly
  and outbound DNS to a third-party resolver is an extra failure mode,
  so the override is skipped there unless DB_DNS_SERVERS is set
  explicitly.
*/
const dnsServers = process.env.DB_DNS_SERVERS
  ? process.env.DB_DNS_SERVERS.split(",")
      .map((server) => server.trim())
      .filter(Boolean)
  : process.env.VERCEL
    ? []
    : ["8.8.8.8", "8.8.4.4"];

if (dnsServers.length > 0) {
  try {
    dns.setServers(dnsServers);
  } catch (_) {
    // Ignore: the platform resolver is used instead.
  }
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
