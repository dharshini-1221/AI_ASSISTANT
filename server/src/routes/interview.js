
const express = require("express");

const {
  startInterview,
  submitAnswer,
  skipQuestion,
  getInterviews,
  getInterview,
} = require("../controllers/interviewcontroller.js");

const { protect } = require("../middleware/auth.js");
const authorize = require("../middleware/authorize.js");

const {
  authorizePermission,
} = require("../config/permissions.js");

const router = express.Router();

// All interview routes require authentication
router.use(protect);

// Students only: interview practice
router.post(
  "/start",
  authorize("Student"),
  startInterview
);

router.post(
  "/submit-answer",
  authorize("Student"),
  submitAnswer
);

router.post(
  "/skip",
  authorize("Student"),
  skipQuestion
);

// Student: own interview history
// Reviewer/Mentor: completed interview summaries with permission
router.get(
  "/",
  (req, res, next) => {
    if (req.user?.role === "Student") {
      return next();
    }

    return authorizePermission(
      "interviews:read_completed"
    )(req, res, next);
  },
  getInterviews
);

// Interview details
// Students: access controlled by getInterview ownership check
// Reviewers/Mentors: require interviews:read_completed
router.get(
  "/:id",
  (req, res, next) => {
    if (req.user?.role === "Student") {
      return authorize("Student")(req, res, next);
    }

    return authorizePermission(
      "interviews:read_completed"
    )(req, res, next);
  },
  getInterview
);

module.exports = router;
