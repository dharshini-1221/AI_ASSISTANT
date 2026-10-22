
const mongoose = require("mongoose");
const User = require("../models/User.js");
const LoginHistory = require("../models/LoginHistory.js");
const ActiveSession = require("../models/ActiveSession.js");
const CustomRole = require("../models/CustomRole.js");
const { ROLE_PERMISSIONS } = require("../config/permissions.js");

const BUILT_IN_ROLES = Object.keys(ROLE_PERMISSIONS);

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select(
        "-password -resetPasswordTokenHash -resetPasswordToken -emailVerificationTokenHash -emailVerificationToken -__v"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error.message);
    return res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};

// PATCH /api/admin/users/:userId/role
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestedRole =
      typeof req.body.role === "string" ? req.body.role.trim() : "";

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!requestedRole) {
      return res.status(400).json({ message: "Role is required" });
    }

    // Check built-in roles and active custom roles.
    if (!BUILT_IN_ROLES.includes(requestedRole)) {
      const customRole = await CustomRole.findOne({
        name: requestedRole,
        isActive: true,
      }).select("_id name");

      if (!customRole) {
        return res.status(400).json({
          message: "Role does not exist or is inactive",
        });
      }
    }

    // Prevent administrators from changing their own role.
    if (String(req.user?._id || req.userId) === String(userId)) {
      return res.status(403).json({
        message: "You cannot change your own role",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === requestedRole) {
      return res.status(200).json({
        message: "User already has this role",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    // Prevent removal of the final administrator.
    if (
      user.role === "Administrator" &&
      requestedRole !== "Administrator"
    ) {
      const adminCount = await User.countDocuments({
        role: "Administrator",
      });

      if (adminCount <= 1) {
        return res.status(409).json({
          message: "Cannot remove the last Administrator",
        });
      }
    }

    user.role = requestedRole;
    await user.save();

    // Revoke sessions so the changed role takes effect after login.
    await ActiveSession.updateMany(
      {
        userId: user._id,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      }
    );

    return res.status(200).json({
      message: "User role updated successfully. They must log in again.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("UPDATE USER ROLE ERROR:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate value detected",
      });
    }

    return res.status(500).json({
      message: "Failed to update user role",
    });
  }
};

// GET /api/admin/activity
const getPlatformActivity = async (req, res) => {
  try {
    // Do not use lean(): the LoginHistory model decrypts protected fields
    // through its document serialization transforms.
    const activities = await LoginHistory.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select("-__v");

    return res.status(200).json({
      count: activities.length,
      activities,
    });
  } catch (error) {
    console.error("PLATFORM ACTIVITY ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to fetch platform activity",
    });
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  getPlatformActivity,
};
