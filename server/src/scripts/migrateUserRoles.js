
require("dotenv").config();

const dns = require("dns");
const mongoose = require("mongoose");
const User = require("../models/User.js");

// Match the DNS configuration used by db.js
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const migrateUserRoles = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");

    const result = await User.updateMany(
      {
        $or: [
          { role: { $exists: false } },
          { role: null },
          { role: "" },
        ],
      },
      {
        $set: { role: "Student" },
      }
    );

    console.log("Users matched:", result.matchedCount);
    console.log("Users updated:", result.modifiedCount);
    console.log("Role migration completed.");
  } catch (error) {
    console.error("Role migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

migrateUserRoles();
