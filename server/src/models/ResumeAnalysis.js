const mongoose = require("mongoose");

const ResumeAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    summary: {
      type: String,
      default: "",
    },

    experienceLevel: {
      type: String,
      enum: ["Junior", "Mid", "Senior"],
      default: "Junior",
    },

    skillsDetected: {
      type: [String],
      default: [],
    },

    strengths: {
      type: [String],
      default: [],
    },

    recommendedDomains: [
      {
        label: String,
        reason: String,
        confidence: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "ResumeAnalysis",
  ResumeAnalysisSchema,
);