const mongoose = require("mongoose");

const categoryStatsSchema = new mongoose.Schema(
  {
    challenges: {
      type: Number,
      default: 0,
      min: 0,
    },

    completed: {
      type: Number,
      default: 0,
      min: 0,
    },

    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    bestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const badgeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    icon: {
      type: String,
      default: "🏆",
    },

    earnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const peerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    xp: {
      type: Number,
      default: 0,
      min: 0,
    },

    rank: {
      type: String,
      default: "Novice",
    },

    leaderboardPosition: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },

    longestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastChallengeDate: {
      type: Date,
      default: null,
    },

    totalChallenges: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedChallenges: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    bestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    categoryStats: {
      HR: {
        type: categoryStatsSchema,
        default: () => ({}),
      },

      Technical: {
        type: categoryStatsSchema,
        default: () => ({}),
      },

      Aptitude: {
        type: categoryStatsSchema,
        default: () => ({}),
      },

      DomainSpecific: {
        type: categoryStatsSchema,
        default: () => ({}),
      },
    },

    badges: {
      type: [badgeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PeerProfile", peerProfileSchema);