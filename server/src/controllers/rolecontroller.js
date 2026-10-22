
const mongoose = require("mongoose");
const CustomRole = require("../models/CustomRole.js");
const { ROLE_PERMISSIONS } = require("../config/permissions.js");

const BUILT_IN_ROLES = Object.keys(ROLE_PERMISSIONS);

const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return null;

  const normalized = [
    ...new Set(
      permissions.map((permission) =>
        typeof permission === "string" ? permission.trim() : permission
      )
    ),
  ];

  if (
    normalized.some(
      (permission) =>
        typeof permission !== "string" ||
        !permission ||
        permission.length > 100
    )
  ) {
    return null;
  }

  // Prevent custom roles from receiving unrestricted access.
  if (normalized.includes("*")) {
    return null;
  }

  return normalized;
};

// GET /api/admin/roles
const getRoles = async (req, res) => {
  try {
    const customRoles = await CustomRole.find()
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      roles: [
        ...BUILT_IN_ROLES.map((name) => ({
          name,
          isSystem: true,
          isActive: true,
          permissions: ROLE_PERMISSIONS[name],
        })),
        ...customRoles,
      ],
    });
  } catch (error) {
    console.error("Get roles error:", error);
    return res.status(500).json({ message: "Failed to retrieve roles." });
  }
};

// POST /api/admin/roles
const createRole = async (req, res) => {
  try {
    const name =
      typeof req.body.name === "string" ? req.body.name.trim() : "";
    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";
    const permissions = normalizePermissions(req.body.permissions);

    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({
        message: "Role name must contain 2–50 characters.",
      });
    }

    if (BUILT_IN_ROLES.includes(name)) {
      return res.status(409).json({
        message: "This role name is reserved for a built-in role.",
      });
    }

    if (permissions === null) {
      return res.status(400).json({
        message: "Permissions must contain only allowed permission names.",
      });
    }

    const role = await CustomRole.create({
      name,
      description,
      permissions,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Custom role created successfully.",
      role,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A role with this name already exists.",
      });
    }

    console.error("Create role error:", error);
    return res.status(500).json({ message: "Failed to create role." });
  }
};

// PATCH /api/admin/roles/:roleId
const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({ message: "Invalid role ID." });
    }

    const role = await CustomRole.findById(roleId);

    if (!role) {
      return res.status(404).json({ message: "Custom role not found." });
    }

    if (role.isSystem) {
      return res.status(403).json({
        message: "Built-in roles cannot be modified here.",
      });
    }

    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return res.status(400).json({ message: "Invalid role name." });
      }

      const name = req.body.name.trim();

      if (
        name.length < 2 ||
        name.length > 50 ||
        BUILT_IN_ROLES.includes(name)
      ) {
        return res.status(400).json({
          message: "Invalid or reserved role name.",
        });
      }

      role.name = name;
    }

    if (req.body.description !== undefined) {
      if (
        typeof req.body.description !== "string" ||
        req.body.description.length > 250
      ) {
        return res.status(400).json({ message: "Invalid description." });
      }

      role.description = req.body.description.trim();
    }

    if (req.body.permissions !== undefined) {
      const permissions = normalizePermissions(req.body.permissions);

      if (permissions === null) {
        return res.status(400).json({
          message: "Permissions must contain only allowed permission names.",
        });
      }

      role.permissions = permissions;
    }

    if (req.body.isActive !== undefined) {
      if (typeof req.body.isActive !== "boolean") {
        return res.status(400).json({ message: "Invalid active status." });
      }

      role.isActive = req.body.isActive;
    }

    await role.save();

    return res.status(200).json({
      message: "Custom role updated successfully.",
      role,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A role with this name already exists.",
      });
    }

    console.error("Update role error:", error);
    return res.status(500).json({ message: "Failed to update role." });
  }
};

// DELETE /api/admin/roles/:roleId
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({ message: "Invalid role ID." });
    }

    const role = await CustomRole.findById(roleId);

    if (!role) {
      return res.status(404).json({ message: "Custom role not found." });
    }

    if (role.isSystem) {
      return res.status(403).json({
        message: "Built-in roles cannot be deleted.",
      });
    }

    const User = require("../models/User.js");
    const assignedUsers = await User.countDocuments({ role: role.name });

    if (assignedUsers > 0) {
      return res.status(409).json({
        message: "Reassign users before deleting this role.",
        assignedUsers,
      });
    }

    await role.deleteOne();

    return res.status(200).json({
      message: "Custom role deleted successfully.",
    });
  } catch (error) {
    console.error("Delete role error:", error);
    return res.status(500).json({ message: "Failed to delete role." });
  }
};

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
};
