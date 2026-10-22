const mongoose = require("mongoose");

const companyProfileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "Product Based",
        "Service Based",
        "Startup",
      ],
    },

    description: {
      type: String,
      default: "",
    },

    interviewStyle: {
      type: String,
      required: true,
    },

    focusAreas: {
      type: [String],
      default: [],
    },

    questionPatterns: {
      type: [String],
      default: [],
    },

    evaluationCriteria: {
      type: [String],
      default: [],
    },

    expectedStandard: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
    },

    feedbackStyle: {
      type: String,
      default: "",
    },

    difficultyRange: {
      min: {
        type: Number,
        default: 1,
        min: 1,
        max: 5,
      },

      max: {
        type: Number,
        default: 5,
        min: 1,
        max: 5,
      },
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "CompanyProfile",
  companyProfileSchema
);