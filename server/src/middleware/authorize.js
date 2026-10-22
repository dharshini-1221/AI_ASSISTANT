
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Authentication middleware must run first
    if (!req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // The protect middleware should attach the authenticated user
    if (!req.user) {
      return res.status(401).json({
        message: "Authenticated user details not found",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to perform this action.",
      });
    }

    next();
  };
};

module.exports = authorize;
