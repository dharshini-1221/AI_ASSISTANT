
const mongoose = require("mongoose");

const platformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "platform",
    },
    allowRegistration: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    requireEmailVerification: {
      type: Boolean,
      default: true,
    },
    announcement: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    supportEmail: {
      type: String,
      default: "",
      maxlength: 254,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PlatformSetting ||
  mongoose.model("PlatformSetting", platformSettingSchema);
