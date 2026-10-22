const mongoose = require("mongoose");

const rankingHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rank: {
      type: Number,
      required: true,
      min: 1,
    },

    xp: {
      type: Number,
      default: 0,
      min: 0,
    },

    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    challengesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },

    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

rankingHistorySchema.index({
  userId: 1,
  recordedAt: -1,
});

module.exports = mongoose.model(
  "RankingHistory",
  rankingHistorySchema
);