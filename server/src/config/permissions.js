
const CustomRole = require("../models/CustomRole.js");

// ==========================================
// BUILT-IN ROLE PERMISSIONS
// ==========================================

const ROLE_PERMISSIONS = {
  Student: [
    "interviews:create",
    "interviews:read_own",
    "reports:read_own",
    "resume:analyze",
    "challenges:participate",
  ],

  Mentor: [
    "interviews:read_completed",
    "reviews:create",
    "reviews:update_own",
  ],

  Administrator: [
    "users:read",
    "users:update_role",
    "activity:read",
    "settings:read",
    "settings:update",
    "*",
  ],
};

// ==========================================
// VALIDATE PERMISSION INPUT
// ==========================================

const isValidPermissionRequest = (user, permission) => {
  return Boolean(
    user &&
    typeof user.role === "string" &&
    user.role.trim() &&
    typeof permission === "string" &&
    permission.trim()
  );
};

// ==========================================
// CHECK PERMISSION IN ARRAY
// ==========================================

const permissionExists = (permissions, permission) => {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
};

// ==========================================
// SYNCHRONOUS PERMISSION CHECK
// ==========================================

const hasPermission = (user, permission) => {
  if (!isValidPermissionRequest(user, permission)) {
    return false;
  }

  // User-specific permissions
  if (permissionExists(user.permissions, permission)) {
    return true;
  }

  // Built-in roles
  const rolePermissions = ROLE_PERMISSIONS[user.role];

  if (rolePermissions) {
    return permissionExists(rolePermissions, permission);
  }

  // Custom roles require asynchronous DB lookup.
  return false;
};

// ==========================================
// ASYNCHRONOUS PERMISSION CHECK
// ==========================================

const hasPermissionAsync = async (user, permission) => {
  if (!isValidPermissionRequest(user, permission)) {
    return false;
  }

  // User-specific permissions
  if (permissionExists(user.permissions, permission)) {
    return true;
  }

  // Built-in roles
  if (
    Object.prototype.hasOwnProperty.call(
      ROLE_PERMISSIONS,
      user.role
    )
  ) {
    return permissionExists(
      ROLE_PERMISSIONS[user.role],
      permission
    );
  }

  // Custom roles from MongoDB
  try {
    const customRole = await CustomRole.findOne({
      name: user.role,
      isActive: true,
    })
      .select("name permissions isActive")
      .lean();

    if (!customRole) {
      return false;
    }

    return permissionExists(
      customRole.permissions,
      permission
    );
  } catch (error) {
    console.error(
      "Custom role permission lookup failed:",
      error.message
    );

    // Deny access if permission verification fails.
    return false;
  }
};

// ==========================================
// EXPRESS PERMISSION MIDDLEWARE
// ==========================================

const authorizePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (
      typeof permission !== "string" ||
      !permission.trim()
    ) {
      return res.status(500).json({
        message: "Invalid permission configuration",
      });
    }

    try {
      const allowed = await hasPermissionAsync(
        req.user,
        permission
      );

      if (!allowed) {
        return res.status(403).json({
          message:
            "You do not have permission to perform this action",
          requiredPermission: permission,
        });
      }

      return next();
    } catch (error) {
      console.error(
        "Authorization middleware error:",
        error.message
      );

      return res.status(500).json({
        message: "Unable to verify permissions",
      });
    }
  };
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  hasPermissionAsync,
  authorizePermission,
};
