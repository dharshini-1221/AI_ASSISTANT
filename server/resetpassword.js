require("dotenv").config();

const dns = require("dns");
const mongoose = require("mongoose");
const User = require("./src/models/User.js");

// Use Google DNS for MongoDB SRV resolution
dns.setServers([
  "8.8.8.8",
  "8.8.4.4",
]);

const resetPassword = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    // Existing account email
    const email = "dharshinia2106@gmail.com";

    // New password
    const newPassword = "dharsh2106";

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      console.log("❌ User not found:", email);
      return;
    }

    // IMPORTANT:
    // Do NOT bcrypt.hash() here.
    // User.js pre-save hook will hash it automatically.
    user.password = newPassword;

    await user.save();

    console.log("✅ Password reset successfully!");
    console.log("Email:", user.email);
    console.log("Now login using your new password.");
  } catch (error) {
    console.error("❌ Password reset failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

resetPassword();