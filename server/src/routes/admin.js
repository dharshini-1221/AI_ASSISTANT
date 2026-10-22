
const express = require("express");

const { protect } = require("../middleware/auth.js");
const authorize = require("../middleware/authorize.js");

const {
  getUsers,
  updateUserRole,
  getPlatformActivity,
} = require("../controllers/admincontroller.js");

const {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/rolecontroller.js");

const {
  authorizePermission,
} = require("../config/permissions.js");

const router = express.Router();
const {
  getSettings,
  updateSettings,
} = require("../controllers/settingscontroller.js");

// All admin routes require authentication.
router.use(protect);

// Only Administrators can access these endpoints.
router.use(authorize("Administrator"));

// List platform users.
router.get(
  "/users",
  authorizePermission("users:read"),
  getUsers
);

// Update a user's built-in role.
router.patch(
  "/users/:userId/role",
  authorizePermission("users:update_role"),
  updateUserRole
);

// View platform login activity.
router.get(
  "/activity",
  authorizePermission("activity:read"),
  getPlatformActivity
);

// List built-in and custom roles.
router.get(
  "/roles",
  authorizePermission("settings:read"),
  getRoles
);

// Create a custom role.
router.post(
  "/roles",
  authorizePermission("settings:update"),
  createRole
);

// Update a custom role.
router.patch(
  "/roles/:roleId",
  authorizePermission("settings:update"),
  updateRole
);

// Delete a custom role.
router.delete(
  "/roles/:roleId",
  authorizePermission("settings:update"),
  deleteRole
);
router.get(
  "/settings",
  authorizePermission("settings:read"),
  getSettings
);

router.patch(
  "/settings",
  authorizePermission("settings:update"),
  updateSettings
);

module.exports = router;
