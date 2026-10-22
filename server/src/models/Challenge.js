const mongoose = require("mongoose");

const challengeQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["HR", "Technical", "Aptitude", "Domain-Specific"],
      required: true,
    },

    domain: {
      type: String,
      default: "General",
      trim: true,
    },

    difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 2,
    },

    expectedAnswer: {
      type: String,
      default: "",
    },

    topic: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true }
);

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      enum: ["HR", "Technical", "Aptitude", "Domain-Specific"],
      required: true,
    },

    domain: {
      type: String,
      default: "General",
      trim: true,
    },

    difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 2,
    },

    challengeType: {
      type: String,
      enum: ["Daily", "Weekly"],
      default: "Daily",
    },

    questions: {
      type: [challengeQuestionSchema],
      default: [],
    },

    totalQuestions: {
      type: Number,
      default: 5,
      min: 1,
    },

    xpReward: {
      type: Number,
      default: 50,
      min: 0,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    generatedByAI: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Challenge", challengeSchema);