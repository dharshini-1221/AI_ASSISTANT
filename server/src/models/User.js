
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// =========================
// USER SCHEMA
// =========================

const userSchema = new mongoose.Schema(
  {
    // BASIC DETAILS
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // =========================
    // TASK 11 - ROLE-BASED ACCESS
    // =========================

    role: {
      type: String,
      default: "Student",
      required: true,
      trim: true,
    },

    // Custom permissions assigned to this user
    permissions: {
      type: [String],
      default: [],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    candidateType: {
      type: String,
      enum: ["Fresher", "Internship Seeker", "Experienced"],
      default: "Fresher",
    },

    // =========================
    // EMAIL VERIFICATION
    // =========================

    emailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      select: false,
    },

    emailVerificationExpiresAt: {
      type: Date,
      select: false,
    },

    // =========================
    // PASSWORD RESET
    // =========================

    resetPasswordTokenHash: {
      type: String,
      select: false,
    },

    resetPasswordExpiresAt: {
      type: Date,
      select: false,
    },

    // =========================
    // ACCOUNT LOCKOUT
    // =========================

    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    // =========================
    // LOGIN ACTIVITY
    // =========================

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: null,
    },

    lastLoginUserAgent: {
      type: String,
      default: null,
    },

    // =========================
    // PASSWORD POLICY
    // =========================

    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

    requirePasswordChange: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: false,
    versionKey: "__v",
  }
);

// =========================
// PASSWORD HASHING
// =========================

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
  this.passwordChangedAt = new Date();
});

// =========================
// PASSWORD COMPARISON
// =========================

userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  if (!this.password) {
    throw new Error(
      "Password not selected. Use .select('+password') in the query."
    );
  }

  return bcrypt.compare(candidatePassword, this.password);
};

// =========================
// PERMISSION CHECK
// =========================

userSchema.methods.hasPermission = function (permission) {
  if (typeof permission !== "string" || !permission.trim()) {
    return false;
  }

  const { hasPermission } = require("../config/permissions.js");

  return hasPermission(this, permission);
};

// =========================
// EXPORT MODEL
// =========================

module.exports = mongoose.model("User", userSchema);
