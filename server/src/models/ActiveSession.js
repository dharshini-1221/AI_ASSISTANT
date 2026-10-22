
const mongoose = require("mongoose");
const {
  encrypt,
  decrypt,
} = require("../utils/encryption.js");

const activeSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Store only the SHA-256 hash of the session token
    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },

    device: {
      type: String,
      default: "Unknown device",
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt sensitive session metadata before saving
activeSessionSchema.pre("save", function () {
  for (const field of ["ipAddress", "userAgent"]) {
    if (this.isModified(field) && this[field]) {
      if (!String(this[field]).startsWith("enc:")) {
        this[field] = encrypt(this[field]);
      }
    }
  }
});

// Decrypt metadata when converting documents to JSON
activeSessionSchema.set("toJSON", {
  transform: function (doc, ret) {
    for (const field of ["ipAddress", "userAgent"]) {
      if (ret[field]) {
        ret[field] = decrypt(ret[field]);
      }
    }

    return ret;
  },
});

// Decrypt metadata when converting documents to plain objects
activeSessionSchema.set("toObject", {
  transform: function (doc, ret) {
    for (const field of ["ipAddress", "userAgent"]) {
      if (ret[field]) {
        ret[field] = decrypt(ret[field]);
      }
    }

    return ret;
  },
});

// Session lookup indexes
activeSessionSchema.index({ userId: 1, createdAt: -1 });
activeSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "ActiveSession",
  activeSessionSchema
);
