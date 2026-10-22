
const express = require("express");

const { protect } = require("../middleware/auth.js");
const authorize = require("../middleware/authorize.js");

const {
  saveSkillAssessment,
  getSkillAssessments,
} = require("../controllers/skillcontroller.js");

const router = express.Router();

// All skill assessment routes require authentication
router.use(protect);

// Students can save their own skill assessments
router.post(
  "/",
  authorize("Student"),
  saveSkillAssessment
);

// Students can view their own skill assessments
router.get(
  "/",
  authorize("Student"),
  getSkillAssessments
);

module.exports = router;
