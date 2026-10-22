
const PlatformSetting = require("../models/PlatformSetting.js");

async function getSettings(req, res) {
  try {
    let settings = await PlatformSetting.findOne({ key: "platform" });

    if (!settings) {
      settings = await PlatformSetting.create({ key: "platform" });
    }

    return res.status(200).json({
      settings: {
        allowRegistration: settings.allowRegistration,
        maintenanceMode: settings.maintenanceMode,
        requireEmailVerification: settings.requireEmailVerification,
        announcement: settings.announcement,
        supportEmail: settings.supportEmail,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ message: "Unable to load settings." });
  }
}

async function updateSettings(req, res) {
  try {
    const updates = {};
    const body = req.body || {};

    const booleanFields = [
      "allowRegistration",
      "maintenanceMode",
      "requireEmailVerification",
    ];

    for (const field of booleanFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "boolean") {
          return res.status(400).json({
            message: `${field} must be true or false.`,
          });
        }

        updates[field] = body[field];
      }
    }

    if (body.announcement !== undefined) {
      if (
        typeof body.announcement !== "string" ||
        body.announcement.length > 1000
      ) {
        return res.status(400).json({
          message: "Announcement must be a string under 1000 characters.",
        });
      }

      updates.announcement = body.announcement.trim();
    }

    if (body.supportEmail !== undefined) {
      if (
        typeof body.supportEmail !== "string" ||
        body.supportEmail.length > 254
      ) {
        return res.status(400).json({
          message: "Invalid support email.",
        });
      }

      const email = body.supportEmail.trim();

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          message: "Enter a valid support email.",
        });
      }

      updates.supportEmail = email;
    }

    const userId = req.user?._id || req.userId || null;

    const settings = await PlatformSetting.findOneAndUpdate(
      { key: "platform" },
      {
        $set: {
          ...updates,
          updatedBy: userId,
        },
        // Keep only key here; schema defaults handle other fields.
        $setOnInsert: {
          key: "platform",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      message: "Settings saved successfully.",
      settings: {
        allowRegistration: settings.allowRegistration,
        maintenanceMode: settings.maintenanceMode,
        requireEmailVerification: settings.requireEmailVerification,
        announcement: settings.announcement,
        supportEmail: settings.supportEmail,
      },
    });
  } catch (error) {
    console.error("Update settings error:", error);
    return res.status(500).json({ message: "Unable to save settings." });
  }
}

module.exports = { getSettings, updateSettings };
