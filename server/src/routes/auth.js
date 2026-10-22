
const express = require("express");

const authController = require("../controllers/authcontroller.js");
const { protect } = require("../middleware/auth.js");

const router = express.Router();

// Existing authentication routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", protect, authController.getMe);
router.patch(
  "/change-password",
  protect,
  authController.changePassword
);

router.get("/login-history", protect, authController.getLoginHistory);

router.get("/active-sessions", protect, authController.getActiveSessions);
router.delete(
  "/active-sessions/:sessionId",
  protect,
  authController.revokeSession
);



// Email verification
router.post("/verify-email", authController.verifyEmail);

// Password reset
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/logout", protect, authController.logout);
module.exports = router;
