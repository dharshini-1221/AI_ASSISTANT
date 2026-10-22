const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    question: {
      type: String,
      required: true,
    },

    answer: {
      type: String,
      default: "",
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    feedback: {
      type: String,
      default: "",
    },

    technicalAccuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    communication: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    understanding: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    isCorrect: {
      type: Boolean,
      default: false,
    },

    skipped: {
      type: Boolean,
      default: false,
    },

    timeTaken: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: true }
);

const challengeAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: ["HR", "Technical", "Aptitude", "Domain-Specific"],
      required: true,
    },

    domain: {
      type: String,
      default: "General",
    },

    answers: {
      type: [answerSchema],
      default: [],
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    answeredQuestions: {
      type: Number,
      default: 0,
    },

    skippedQuestions: {
      type: Number,
      default: 0,
    },

    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    xpEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

challengeAttemptSchema.index({
  userId: 1,
  challengeId: 1,
});

module.exports = mongoose.model(
  "ChallengeAttempt",
  challengeAttemptSchema
);