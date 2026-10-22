
const express = require("express");

const {
  generateChallenge,
  getActiveChallenges,
  getChallengeById,
  startChallenge,
  submitChallengeAnswer,
  getPeerProfile,
  getMyAttempts,
  getRankingHistory,
  getLeaderboard,
} = require("../controllers/challengecontroller.js");

const { protect } = require("../middleware/auth.js");
const authorize = require("../middleware/authorize.js");

const router = express.Router();

// All challenge routes require authentication and Student role
router.use(protect);
router.use(authorize("Student"));

// Challenge routes
router.post("/generate", generateChallenge);
router.get("/", getActiveChallenges);
router.post("/start", startChallenge);
router.post("/submit-answer", submitChallengeAnswer);

// Current student's profile and history
router.get("/profile/me", getPeerProfile);
router.get("/attempts/me", getMyAttempts);
router.get("/ranking-history/me", getRankingHistory);

// Leaderboard
router.get("/leaderboard", getLeaderboard);

// Single challenge — keep last
router.get("/:id", getChallengeById);

module.exports = router;
