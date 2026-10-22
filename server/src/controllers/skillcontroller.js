const SkillAssessment = require("../models/SkillAssessment.js");

// Save a skill assessment
const saveSkillAssessment = async (req, res) => {
  try {
    const userId = req.userId;
    const { skillName, score } = req.body;

    if (!skillName || score === undefined) {
      return res.status(400).json({
        message: "skillName and score are required",
      });
    }

    if (score < 0 || score > 100) {
      return res.status(400).json({
        message: "Score must be between 0 and 100",
      });
    }

    const assessment = await SkillAssessment.create({
      userId,
      skillName,
      score,
    });

    res.status(201).json({
      message: "Skill assessment saved successfully",
      assessment,
    });
  } catch (err) {
    console.error(
      "saveSkillAssessment error:",
      err,
    );

    res.status(500).json({
      message: "Failed to save skill assessment",
      error: err.message,
    });
  }
};

// Get user's skill assessments
const getSkillAssessments = async (req, res) => {
  try {
    const userId = req.userId;

    const assessments = await SkillAssessment.find({
      userId,
    }).sort({ createdAt: -1 });

    res.json({
      assessments,
    });
  } catch (err) {
    console.error(
      "getSkillAssessments error:",
      err,
    );

    res.status(500).json({
      message: "Failed to get skill assessments",
      error: err.message,
    });
  }
};

module.exports = {
  saveSkillAssessment,
  getSkillAssessments,
};