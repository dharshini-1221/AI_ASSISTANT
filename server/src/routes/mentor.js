
const express = require("express");

const { protect } = require("../middleware/auth.js");
const {
  getCompletedInterviews,
  submitMentorReview,
} = require("../controllers/mentorcontroller.js");

const {
  authorizePermission,
} = require("../config/permissions.js");

const router = express.Router();

router.use(protect);

// Any role with permission can view completed interview summaries
router.get(
  "/interviews",
  authorizePermission("interviews:read_completed"),
  getCompletedInterviews
);

// Create a review
router.post(
  "/interviews/:interviewId/review",
  authorizePermission("reviews:create"),
  submitMentorReview
);

// Update an existing review
router.patch(
  "/interviews/:interviewId/review",
  authorizePermission("reviews:update_own"),
  submitMentorReview
);

module.exports = router;