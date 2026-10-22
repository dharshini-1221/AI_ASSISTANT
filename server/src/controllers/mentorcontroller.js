const mongoose = require("mongoose");
const Interview = require("../models/Interview.js");

const {
  hasPermissionAsync,
} = require("../config/permissions.js");

// ============================================================
// GET ALL COMPLETED INTERVIEWS
// Requires: interviews:read_completed
// ============================================================
const getCompletedInterviews = async (req, res) => {
  try {
    if (!req.user || !req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const canReview = await hasPermissionAsync(
      req.user,
      "interviews:read_completed"
    );

    if (!canReview) {
      return res.status(403).json({
        message: "Missing interviews:read_completed permission",
      });
    }

    const interviews = await Interview.find({
      isComplete: true,
    })
      .select(
        "userId domain score communicationScore duration questionsAnswered questionsSkipped finalReport mentorReview createdAt"
      )
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      success: true,
      interviews,
    });
  } catch (error) {
    console.error("getCompletedInterviews error:", error);

    return res.status(500).json({
      message: "Failed to fetch completed interviews",
    });
  }
};

// ============================================================
// CREATE OR UPDATE REVIEW
//
// POST  -> reviews:create
// PATCH -> reviews:update_own
// A reviewer can update only their own review.
// ============================================================
const submitMentorReview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { feedback, rating } = req.body;

    if (!req.user || !req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!mongoose.isValidObjectId(interviewId)) {
      return res.status(400).json({
        message: "Invalid interview ID",
      });
    }

    if (
      typeof feedback !== "string" ||
      !feedback.trim() ||
      feedback.trim().length > 2000
    ) {
      return res.status(400).json({
        message:
          "Feedback is required and must be under 2000 characters",
      });
    }

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        message: "Rating must be an integer from 1 to 5",
      });
    }

    const isCreate = req.method === "POST";
    const isUpdate = req.method === "PATCH";

    if (!isCreate && !isUpdate) {
      return res.status(405).json({
        message: "Method not allowed",
      });
    }

    const requiredPermission = isCreate
      ? "reviews:create"
      : "reviews:update_own";

    const allowed = await hasPermissionAsync(
      req.user,
      requiredPermission
    );

    if (!allowed) {
      return res.status(403).json({
        message: `Missing ${requiredPermission} permission`,
        requiredPermission,
      });
    }

    const interview = await Interview.findOne({
      _id: interviewId,
      isComplete: true,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Completed interview not found",
      });
    }

    const existingReview = interview.mentorReview;

    if (isCreate && existingReview?.reviewedBy) {
      return res.status(409).json({
        message: "A review already exists. Use update instead.",
      });
    }

    if (isUpdate) {
      if (!existingReview?.reviewedBy) {
        return res.status(404).json({
          message: "No review exists to update",
        });
      }

      if (
        String(existingReview.reviewedBy) !==
        String(req.userId)
      ) {
        return res.status(403).json({
          message: "You can update only your own review",
        });
      }
    }

    interview.mentorReview = {
      feedback: feedback.trim(),
      rating,
      reviewedBy: req.userId,
      reviewedAt: new Date(),
    };

    await interview.save();

    return res.status(200).json({
      success: true,
      message: isCreate
        ? "Review submitted successfully"
        : "Review updated successfully",
      mentorReview: interview.mentorReview,
    });
  } catch (error) {
    console.error("submitMentorReview error:", error);

    return res.status(500).json({
      message: "Failed to save review",
    });
  }
};

module.exports = {
  getCompletedInterviews,
  submitMentorReview,
};
