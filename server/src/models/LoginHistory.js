
const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/encryption.js");

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["success", "failed", "blocked"],
      required: true,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    device: {
      type: String,
      default: "Unknown device",
    },

    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt sensitive fields before saving new or modified records.
loginHistorySchema.pre("save", function () {
  for (const field of ["ipAddress", "userAgent"]) {
    if (this.isModified(field) && this[field]) {
      // Avoid encrypting a value twice.
      if (!String(this[field]).startsWith("enc:")) {
        this[field] = encrypt(this[field]);
      }
    }
  }
});

// Decrypt sensitive fields when returning a document as JSON.
loginHistorySchema.set("toJSON", {
  transform: function (doc, ret) {
    for (const field of ["ipAddress", "userAgent"]) {
      if (ret[field]) {
        ret[field] = decrypt(ret[field]);
      }
    }

    return ret;
  },
});

// Same behavior for object conversion.
loginHistorySchema.set("toObject", {
  transform: function (doc, ret) {
    for (const field of ["ipAddress", "userAgent"]) {
      if (ret[field]) {
        ret[field] = decrypt(ret[field]);
      }
    }

    return ret;
  },
});

loginHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("LoginHistory", loginHistorySchema);
