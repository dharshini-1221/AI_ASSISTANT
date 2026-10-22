
const express = require("express");
const router = express.Router();

const {
  calculateReadiness,
  updateCandidateType,
  getRules,
  getHistory,
} = require("../controllers/placementcontroller.js");

const { protect } = require("../middleware/auth.js");
const authorize = require("../middleware/authorize.js");

// All placement routes require authentication
router.use(protect);

// Student-only placement readiness routes
router.get("/readiness", authorize("Student"), calculateReadiness);

router.get("/rules", authorize("Student"), getRules);

router.get("/history", authorize("Student"), getHistory);

router.patch(
  "/candidate-type",
  authorize("Student"),
  updateCandidateType
);

module.exports = router;
