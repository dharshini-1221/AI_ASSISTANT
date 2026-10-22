const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema(
  {
    candidateType: {
      type: String,
      enum: ["Fresher", "Internship Seeker", "Experienced"],
    },
    resumeScore: { type: Number, min: 0, max: 100 },
    interviewScore: { type: Number, min: 0, max: 100 },
    communicationScore: { type: Number, min: 0, max: 100 },
    skillScore: { type: Number, min: 0, max: 100 },
    overallScore: { type: Number, min: 0, max: 100 },
    category: {
      type: String,
      enum: [
        "Placement Ready",
        "Needs Improvement",
        "High Potential Candidate",
      ],
    },
    weakTechnicalAreas: { type: [String], default: [] },
    communicationGaps: { type: [String], default: [] },
    missingIndustrySkills: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const PlacementReadinessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    candidateType: {
      type: String,
      enum: ["Fresher", "Internship Seeker", "Experienced"],
      default: "Fresher",
    },

    resumeScore: { type: Number, min: 0, max: 100, default: 0 },
    interviewScore: { type: Number, min: 0, max: 100, default: 0 },
    communicationScore: { type: Number, min: 0, max: 100, default: 0 },
    skillScore: { type: Number, min: 0, max: 100, default: 0 },
    overallScore: { type: Number, min: 0, max: 100, default: 0 },

    category: {
      type: String,
      enum: [
        "Placement Ready",
        "Needs Improvement",
        "High Potential Candidate",
      ],
      default: "Needs Improvement",
    },

    weakTechnicalAreas: { type: [String], default: [] },
    communicationGaps: { type: [String], default: [] },
    missingIndustrySkills: { type: [String], default: [] },

    recommendations: {
      technologies: { type: [String], default: [] },
      projects: { type: [String], default: [] },
      certifications: { type: [String], default: [] },
      interviewTopics: { type: [String], default: [] },
    },

    scoreWeights: {
      resume: { type: Number, default: 25 },
      interview: { type: Number, default: 35 },
      communication: { type: Number, default: 20 },
      skills: { type: Number, default: 20 },
    },

    categoryRules: {
      placementReady: { type: Number, default: 80 },
      highPotential: { type: Number, default: 60 },
    },

    history: {
      type: [HistorySchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PlacementReadiness", PlacementReadinessSchema);
