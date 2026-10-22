const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User.js");
const ActiveSession = require("../models/ActiveSession.js");

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  try {
    const token = header.split(" ")[1];

    // Verify JWT signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Hash JWT to validate the active session
    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const session = await ActiveSession.findOne({
      userId: user._id,
      sessionTokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    // Reject missing, expired, or revoked sessions
    if (!session) {
      return res.status(401).json({
        message: "Session expired or revoked. Please log in again.",
      });
    }

    // Check whether the account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000
      );

      return res.status(423).json({
        message: `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    // Clear an expired account lock
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
      await user.save();
    }

    // Update session activity
    session.lastActiveAt = new Date();
    await session.save();

    // Attach authenticated user details for RBAC
    req.userId = user._id.toString();
    req.user = user;
    req.sessionId = session._id.toString();

    // Force password change when required.
    // Allow password change and logout endpoints.
    const allowedPaths = ["/change-password", "/logout"];
const currentPath = req.path.replace(/\/+$/, "") || "/";

if (
  user.requirePasswordChange === true &&
  !allowedPaths.includes(currentPath)
) {
      return res.status(403).json({
        message:
          "Password change required. Please update your password to continue.",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }

    next();
  } catch (err) {
    if (
      err.name === "TokenExpiredError" ||
      err.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token. Please log in again.",
      });
    }

    console.error("AUTH MIDDLEWARE ERROR:", err);

    return res.status(500).json({
      message: "Authentication failed due to a server error",
    });
  }
};

module.exports = { protect };
