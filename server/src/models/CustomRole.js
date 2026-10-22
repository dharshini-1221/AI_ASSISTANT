
const mongoose = require("mongoose");

const customRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (permissions) =>
          Array.isArray(permissions) &&
          permissions.every(
            (permission) =>
              typeof permission === "string" &&
              permission.trim().length > 0
          ),
        message: "Every permission must be a non-empty string.",
      },
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CustomRole ||
  mongoose.model("CustomRole", customRoleSchema);
