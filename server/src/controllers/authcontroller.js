
const jwt = require("jsonwebtoken");
const ActiveSession = require("../models/ActiveSession.js");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User.js");
const EmailVerificationToken = require("../models/EmailVerificationToken.js");
const PasswordResetToken = require("../models/PasswordResetToken.js");
const {
  sendVerificationEmail,
  sendSuspiciousLoginAlert,
  sendPasswordChangedAlert,
} = require("../utils/email.js");

const LoginHistory = require("../models/LoginHistory.js");


const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// =========================
// PASSWORD STRENGTH
// =========================

const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const exists = await User.findOne({
      email: normalizedEmail,
    });

    if (exists) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      emailVerified: false,
    });

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await EmailVerificationToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    // Send verification email
    try {
      await sendVerificationEmail(
        user.email,
        user.name,
        rawToken
      );
    } catch (mailError) {
      await EmailVerificationToken.deleteMany({
        userId: user._id,
      });

      await User.deleteOne({
        _id: user._id,
      });

      console.error("VERIFICATION EMAIL ERROR:", mailError.message);

      return res.status(503).json({
        message:
          "Unable to send verification email. Please try again later.",
      });
    }

    return res.status(201).json({
      message:
        "Registration successful. Please verify your email to continue.",
      verificationRequired: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email already in use",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// LOGIN
// =========================

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Account lock check
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000
      );

      return res.status(423).json({
        message: `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    // Clear expired lock
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
      await user.save();
    }

    // Password check
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      
await LoginHistory.create({
  userId: user._id,
  email: user.email,
  status: "failed",
  ipAddress:
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null,
  userAgent: req.get("user-agent") || null,
  device: req.get("user-agent") || "Unknown device",
  failureReason: "Invalid password",
});


      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);
        await user.save();

        return res.status(423).json({
          message:
            "Too many failed login attempts. Account locked for 15 minutes.",
        });
      }

      await user.save();

      const remainingAttempts =
        MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts;

      return res.status(401).json({
        message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    // Email verification check
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        verificationRequired: true,
      });
    }

    // Successful login
    
    // Detect a new device or IP address
    const currentIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const currentDevice = req.get("user-agent") || "Unknown device";

    const isNewLogin =
      (user.lastLoginIp && user.lastLoginIp !== currentIp) ||
      (user.lastLoginUserAgent &&
        user.lastLoginUserAgent !== currentDevice);

    // Send alert without blocking the login if email delivery fails
    if (isNewLogin) {
      sendSuspiciousLoginAlert(
        user.email,
        user.name,
        currentIp,
        currentDevice
      ).catch((mailError) => {
        console.error("SUSPICIOUS LOGIN ALERT ERROR:", mailError.message);
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    user.lastLoginIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    user.lastLoginUserAgent = req.get("user-agent") || null;
    
await LoginHistory.create({
  userId: user._id,
  email: user.email,
  status: "success",
  ipAddress:
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null,
  userAgent: req.get("user-agent") || null,
  device: req.get("user-agent") || "Unknown device",
});


    await user.save();

   
const token = signToken(user._id.toString());

// Create active session using a hash of the JWT
const sessionTokenHash = crypto
  .createHash("sha256")
  .update(token)
  .digest("hex");
// Revoke previous active sessions for this account
await ActiveSession.updateMany(
  {
    userId: user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  },
  {
    $set: { revokedAt: new Date() },
  }
);

await ActiveSession.create({
  userId: user._id,
  sessionTokenHash,
  device: req.get("user-agent") || "Unknown device",
  ipAddress:
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    null,
  userAgent: req.get("user-agent") || null,
  lastActiveAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});

return res.json({
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  },
});
} catch (err) {
  console.error("LOGIN ERROR:", err);

  return res.status(500).json({
    message: "Server error",
  });
}
};

// =========================
// VERIFY EMAIL
// =========================

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (typeof token !== "string" || !token) {
      return res.status(400).json({
        message: "Verification token is required",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const verificationToken = await EmailVerificationToken.findOne({
      tokenHash,
    });

    if (!verificationToken) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
      });
    }

    if (verificationToken.expiresAt <= new Date()) {
      await EmailVerificationToken.deleteOne({
        _id: verificationToken._id,
      });

      return res.status(400).json({
        message: "Verification token has expired",
      });
    }

    const user = await User.findById(verificationToken.userId);

    if (!user) {
      await EmailVerificationToken.deleteOne({
        _id: verificationToken._id,
      });

      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    await EmailVerificationToken.deleteOne({
      _id: verificationToken._id,
    });

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// =========================
// FORGOT PASSWORD
// =========================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    const genericMessage =
      "If an account exists with this email, a password reset link will be sent.";

    // Do not reveal whether the account exists
    if (!user) {
      return res.status(200).json({
        message: genericMessage,
      });
    }

    // Remove previous reset tokens
    await PasswordResetToken.deleteMany({
      userId: user._id,
    });

    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const resetUrl =
      `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"AI Mock Interview" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: "Reset your password",
        text:
          `Use this link to reset your password. ` +
          `It expires in 15 minutes: ${resetUrl}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
            <h2>Password Reset</h2>
            <p>Hello ${user.name},</p>
            <p>Click the link below to reset your password.
               This link expires in 15 minutes.</p>
            <a href="${resetUrl}"
               style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
              Reset Password
            </a>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (mailError) {
      await PasswordResetToken.deleteMany({
        userId: user._id,
      });

      console.error(
        "PASSWORD RESET EMAIL ERROR:",
        mailError.message
      );

      return res.status(503).json({
        message:
          "Unable to send the password reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      message: genericMessage,
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


 // =========================
// RESET PASSWORD
// =========================

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (
      typeof token !== "string" ||
      !token ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Reset token and new password are required",
      });
    }

    // Validate new password strength
    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    // Hash the token received from the reset link
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken = await PasswordResetToken.findOne({
      tokenHash,
    });

    if (!resetToken) {
      return res.status(400).json({
        message: "Invalid or expired password reset link",
      });
    }

    // Check expiry
    if (resetToken.expiresAt <= new Date()) {
      await PasswordResetToken.deleteOne({
        _id: resetToken._id,
      });

      return res.status(400).json({
        message: "Password reset link has expired",
      });
    }

    const user = await User.findById(resetToken.userId);

    if (!user) {
      await PasswordResetToken.deleteOne({
        _id: resetToken._id,
      });

      return res.status(404).json({
        message: "User not found",
      });
    }

    
    // Update password; User model hashes it with bcrypt
    user.password = password;
    
    user.passwordChangedAt = new Date();

    // Clear failed login attempts and account lock
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.requirePasswordChange = false;

    await user.save();

    sendPasswordChangedAlert(user.email, user.name).catch((mailError) => {
    console.error("PASSWORD RESET ALERT ERROR:", mailError.message);
  });
    // Revoke all existing active sessions
    await ActiveSession.updateMany(
      {
        userId: user._id,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      }
    );

    // Invalidate all reset tokens for this user
    await PasswordResetToken.deleteMany({
      userId: user._id,
    });


    return res.status(200).json({
      message: "Password reset successfully. Please log in again.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};


// =========================
// GET CURRENT USER
// =========================

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      user,
    });
  } catch (err) {
    console.error("GET ME ERROR:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

const getLoginHistory = async (req, res) => {
  try {
    const history = await LoginHistory.find({
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-__v");

    return res.status(200).json({
      count: history.length,
      history,
    });
  } catch (err) {
    console.error("LOGIN HISTORY ERROR:", err);

    return res.status(500).json({
      message: "Unable to fetch login history",
    });
  }
};


const getActiveSessions = async (req, res) => {
  try {
    const sessions = await ActiveSession.find({
      userId: req.userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .select("-sessionTokenHash -__v")
      .sort({ lastActiveAt: -1 });

    return res.status(200).json({
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    console.error("ACTIVE SESSIONS ERROR:", err);

    return res.status(500).json({
      message: "Unable to fetch active sessions",
    });
  }
};

const mongoose = require("mongoose");

const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({
        message: "Invalid session ID",
      });
    }

    const session = await ActiveSession.findOneAndUpdate(
      {
        _id: sessionId,
        userId: req.userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { revokedAt: new Date() } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        message: "Active session not found",
      });
    }

    return res.json({
      message: "Session revoked successfully",
    });
  } catch (err) {
    console.error("REVOKE SESSION ERROR:", err);
    return res.status(500).json({
      message: "Unable to revoke session",
    });
  }
};



const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError,
      });
    }

    const user = await User.findById(req.userId).select("+password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isCurrentPasswordValid =
      await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different",
      });
    }

    user.password = newPassword;
user.requirePasswordChange = false;
await user.save();

// Revoke all active sessions after password change
await ActiveSession.updateMany(
  {
    userId: user._id,
    revokedAt: null,
  },
  {
    $set: { revokedAt: new Date() },
  }
);

// Send security alert without failing the password change
sendPasswordChangedAlert(user.email, user.name).catch((mailError) => {
  console.error("PASSWORD CHANGE ALERT ERROR:", mailError.message);
});

return res.status(200).json({
  message: "Password changed successfully. Please log in again.",
});
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Unable to change password",
    });
  }
};


const logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const session = await ActiveSession.findOneAndUpdate(
      {
        userId: req.userId,
        sessionTokenHash,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        message: "Active session not found to revoke",
      });
    }

    return res.status(200).json({
      message: "Logged out successfully",
      sessionId: session._id,
      revokedAt: session.revokedAt,
    });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);

    return res.status(500).json({
      message: "Unable to log out",
    });
  }
};



// =========================
// EXPORTS
// =========================

module.exports = {
  register,
  login,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getLoginHistory,
   getActiveSessions,
    revokeSession,
    changePassword,
   logout,
};
