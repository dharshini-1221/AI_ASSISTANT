const { createLazyGroq } = require("../utils/groqClient.js");

const Challenge = require("../models/Challenge.js");
const ChallengeAttempt = require("../models/ChallengeAttempt.js");
const PeerProfile = require("../models/PeerProfile.js");
const RankingHistory = require("../models/RankingHistory.js");

const groq = createLazyGroq({ timeout: 45000 });

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function clamp(n, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(max, Math.round(Number(n) || 0))
  );
}

function unique(items) {
  return [
    ...new Set(
      (items || [])
        .filter(Boolean)
        .map(String)
    ),
  ];
}

function normalizeCategory(category) {
  const allowed = [
    "HR",
    "Technical",
    "Aptitude",
    "Domain-Specific",
  ];

  return allowed.includes(category)
    ? category
    : null;
}

function getCategoryStatsKey(category) {
  if (category === "Domain-Specific") {
    return "DomainSpecific";
  }

  return category;
}

function calculateXP(score, completed = true) {
  if (!completed) return 0;

  const baseXP = 25;
  const performanceXP = Math.round(
    clamp(score) * 0.75
  );

  return baseXP + performanceXP;
}

function getRankFromXP(xp) {
  if (xp >= 3000) return "Elite Candidate";
  if (xp >= 2000) return "Placement Pro";
  if (xp >= 1200) return "Interview Warrior";
  if (xp >= 700) return "Skilled Candidate";
  if (xp >= 300) return "Rising Candidate";

  return "Novice";
}

// --------------------------------------------------
// AI CHALLENGE GENERATION
// --------------------------------------------------

async function generateAIChallenge({
  category,
  domain,
  challengeType,
  difficulty,
}) {
  const fallbackQuestions = {
    HR: [
      {
        question:
          "Tell me about a time when you worked with a difficult team member. How did you handle the situation?",
        topic: "Teamwork",
      },
      {
        question:
          "Why should we hire you for this role?",
        topic: "Career",
      },
      {
        question:
          "Describe a situation where you had to solve a problem under pressure.",
        topic: "Problem Solving",
      },
      {
        question:
          "Where do you see yourself professionally in the next three years?",
        topic: "Career Goals",
      },
      {
        question:
          "How do you handle constructive criticism?",
        topic: "Communication",
      },
    ],

    Technical: [
      {
        question:
          "What is the difference between an array and a linked list?",
        topic: "Data Structures",
      },
      {
        question:
          "Explain the four main principles of Object-Oriented Programming.",
        topic: "OOP",
      },
      {
        question:
          "What is normalization in DBMS and why is it used?",
        topic: "DBMS",
      },
      {
        question:
          "What is the difference between INNER JOIN and LEFT JOIN in SQL?",
        topic: "SQL",
      },
      {
        question:
          "What is time complexity and why is it important?",
        topic: "Algorithms",
      },
    ],

    Aptitude: [
      {
        question:
          "A train travels 120 km in 2 hours. What is its average speed?",
        topic: "Quantitative Aptitude",
      },
      {
        question:
          "If a number is increased by 20% and becomes 240, what was the original number?",
        topic: "Percentage",
      },
      {
        question:
          "Find the next number in the sequence: 2, 6, 12, 20, 30, ?",
        topic: "Logical Reasoning",
      },
      {
        question:
          "If 5 workers complete a task in 12 days, how many days would 10 workers take at the same rate?",
        topic: "Time and Work",
      },
      {
        question:
          "A product costs ₹800 and is sold for ₹920. What is the profit percentage?",
        topic: "Profit and Loss",
      },
    ],

    "Domain-Specific": [
      {
        question:
          "Explain one important concept from your selected technical domain and give a practical example.",
        topic: "Domain Knowledge",
      },
      {
        question:
          "Describe a project where you applied your domain knowledge to solve a real problem.",
        topic: "Projects",
      },
      {
        question:
          "What tools or technologies are commonly used in your selected domain?",
        topic: "Tools and Technologies",
      },
      {
        question:
          "Explain a common challenge in your selected domain and how you would solve it.",
        topic: "Problem Solving",
      },
      {
        question:
          "What recent development or industry trend is important in your selected domain?",
        topic: "Industry Awareness",
      },
    ],
  };

  const fallback =
    fallbackQuestions[category] ||
    fallbackQuestions.Technical;

  // --------------------------------------------------
  // FALLBACK WHEN GROQ API KEY IS NOT AVAILABLE
  // --------------------------------------------------

  if (!process.env.GROQ_API_KEY) {
    return {
      questions: fallback.map((q) => ({
        ...q,
        category,
        domain: domain || "General",
        difficulty,
        expectedAnswer: "",
      })),
    };
  }

  // --------------------------------------------------
  // AI PROMPT
  // --------------------------------------------------

  const prompt = `
You are an AI interview challenge generator.

Create a ${challengeType.toLowerCase()} interview challenge.

Category: ${category}
Domain: ${domain || "General"}
Difficulty: ${difficulty}/5
Number of questions: 5

The challenge is for candidates preparing for interviews.

Category rules:

HR:
Focus on behavioral, communication, teamwork, leadership,
situational judgment and career questions.

Technical:
Focus on programming, DSA, OOP, DBMS, SQL,
OS, networking or the selected domain.

Aptitude:
Focus on quantitative aptitude, logical reasoning,
analytical reasoning, percentages, time/work, profit/loss,
number series or similar placement aptitude topics.

Domain-Specific:
Focus specifically on the provided domain and practical
industry knowledge.

Return ONLY valid JSON.

Required JSON structure:

{
  "questions": [
    {
      "question": "string",
      "category": "${category}",
      "topic": "string",
      "expectedAnswer": "string"
    }
  ]
}

Rules:
- Exactly 5 questions.
- Questions must be different from each other.
- Do not repeat the same concept.
- Every question MUST have category: "${category}".
- Every question must belong to the requested category.
- Difficulty must match ${difficulty}/5.
- Keep questions suitable for interview preparation.
- For aptitude questions, provide a clear expected answer.
- Do not include markdown.
- Do not include explanations outside the JSON.
`;

  try {
    const response =
      await groq.chat.completions.create({
        model:
          process.env.GROQ_MODEL ||
          "openai/gpt-oss-120b",

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.4,

        response_format: {
          type: "json_object",
        },
      });

    const raw =
      response.choices?.[0]?.message?.content ||
      "{}";

    const ai = JSON.parse(raw);

    if (
      !Array.isArray(ai.questions) ||
      ai.questions.length < 5
    ) {
      throw new Error(
        "AI returned insufficient questions"
      );
    }

    const questions = ai.questions
      .slice(0, 5)
      .map((q) => ({
        question: String(
          q.question || ""
        ).trim(),

        category,

        domain: domain || "General",

        topic: String(
          q.topic || "General"
        ).trim(),

        expectedAnswer: String(
          q.expectedAnswer || ""
        ).trim(),

        difficulty,
      }))
      .filter((q) => q.question);

    if (questions.length < 5) {
      throw new Error(
        "AI returned invalid questions"
      );
    }

    return {
      questions,
    };
  } catch (err) {
    console.error(
      "AI challenge generation failed. Using fallback:",
      err.message
    );

    return {
      questions: fallback.map((q) => ({
        ...q,
        category,
        domain: domain || "General",
        difficulty,
        expectedAnswer: "",
      })),
    };
  }
}

// --------------------------------------------------
// GENERATE NEW CHALLENGE
// --------------------------------------------------

const generateChallenge = async (req, res) => {
  try {
    const {
      category,
      domain = "General",
      challengeType = "Daily",
      difficulty = 2,
    } = req.body;

    const normalized =
      normalizeCategory(category);

    if (!normalized) {
      return res.status(400).json({
        message:
          "Invalid category. Use HR, Technical, Aptitude or Domain-Specific.",
      });
    }

    if (
      !["Daily", "Weekly"].includes(
        challengeType
      )
    ) {
      return res.status(400).json({
        message:
          "challengeType must be Daily or Weekly",
      });
    }

    const safeDifficulty = Math.max(
      1,
      Math.min(
        5,
        Number(difficulty) || 2
      )
    );

    const startDate = new Date();

    const endDate = new Date(startDate);

    if (challengeType === "Daily") {
      endDate.setDate(
        endDate.getDate() + 1
      );
    } else {
      endDate.setDate(
        endDate.getDate() + 7
      );
    }

    const aiChallenge =
      await generateAIChallenge({
        category: normalized,
        domain,
        challengeType,
        difficulty: safeDifficulty,
      });

    const title =
      `${challengeType} ${normalized} Challenge`;

    const challenge =
      await Challenge.create({
        title,

        description:
          `AI-generated ${challengeType.toLowerCase()} challenge for ${normalized} interview preparation.`,

        category: normalized,

        domain,

        difficulty: safeDifficulty,

        challengeType,

        questions:
          aiChallenge.questions,

        totalQuestions:
          aiChallenge.questions.length,

        xpReward:
          challengeType === "Weekly"
            ? 100
            : 50,

        startDate,

        endDate,

        isActive: true,

        generatedByAI: true,
      });

    res.status(201).json({
      message:
        "Challenge generated successfully",

      challenge,
    });
  } catch (err) {
    console.error(
      "generateChallenge error:",
      err
    );

    res.status(500).json({
      message:
        "Failed to generate challenge",

      error: err.message,
    });
  }
};

// --------------------------------------------------
// GET ACTIVE CHALLENGES
// --------------------------------------------------

const getActiveChallenges =
  async (req, res) => {
    try {
      const now = new Date();

      const challenges =
        await Challenge.find({
          isActive: true,

          startDate: {
            $lte: now,
          },

          endDate: {
            $gte: now,
          },
        }).sort({
          createdAt: -1,
        });

      res.json({
        challenges,
      });
    } catch (err) {
      console.error(
        "getActiveChallenges error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to get active challenges",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// GET SINGLE CHALLENGE
// --------------------------------------------------

const getChallengeById =
  async (req, res) => {
    try {
      const challenge =
        await Challenge.findById(
          req.params.id
        );

      if (!challenge) {
        return res.status(404).json({
          message:
            "Challenge not found",
        });
      }

      res.json({
        challenge,
      });
    } catch (err) {
      console.error(
        "getChallengeById error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to get challenge",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// START CHALLENGE
// --------------------------------------------------

const startChallenge =
  async (req, res) => {
    try {
      const userId = req.userId;

      const {
        challengeId,
      } = req.body;

      if (!challengeId) {
        return res.status(400).json({
          message:
            "challengeId is required",
        });
      }

      const challenge =
        await Challenge.findById(
          challengeId
        );

      if (!challenge) {
        return res.status(404).json({
          message:
            "Challenge not found",
        });
      }

      if (!challenge.isActive) {
        return res.status(400).json({
          message:
            "This challenge is no longer active",
        });
      }

      const now = new Date();

      if (
        now < challenge.startDate ||
        now > challenge.endDate
      ) {
        return res.status(400).json({
          message:
            "This challenge is outside its active period",
        });
      }

      // Prevent multiple unfinished attempts
      const existingAttempt =
        await ChallengeAttempt.findOne({
          userId,
          challengeId,
          completed: false,
        });

      if (existingAttempt) {
        return res.json({
          message:
            "Existing challenge attempt resumed",

          attempt:
            existingAttempt,

          challenge,
        });
      }

      const attempt =
        await ChallengeAttempt.create({
          userId,

          challengeId,

          category:
            challenge.category,

          domain:
            challenge.domain,

          totalQuestions:
            challenge.totalQuestions,

          answers: [],

          startedAt: new Date(),
        });

      await PeerProfile.findOneAndUpdate(
        {
          userId,
        },

        {
          $inc: {
            totalAttempts: 1,
            totalChallenges: 1,
          },
        },

        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      res.status(201).json({
        message:
          "Challenge started successfully",

        attemptId:
          attempt._id,

        challenge,

        attempt,
      });
    } catch (err) {
      console.error(
        "startChallenge error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to start challenge",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// AI ANSWER EVALUATION
// --------------------------------------------------

async function evaluateAnswer({
  category,
  domain,
  question,
  expectedAnswer,
  answer,
}) {
  const fallbackScore =
    answer.trim() ? 60 : 0;

  if (!process.env.GROQ_API_KEY) {
    return {
      score: fallbackScore,

      technicalAccuracy:
        fallbackScore,

      communication:
        fallbackScore,

      understanding:
        fallbackScore,

      isCorrect:
        fallbackScore >= 60,

      feedback:
        answer.trim()
          ? "Answer recorded successfully."
          : "No answer provided.",
    };
  }

  const prompt = `
You are an expert interview evaluator.

Evaluate this candidate answer.

Category: ${category}
Domain: ${domain}
Question: ${question}
Expected Answer: ${
    expectedAnswer ||
    "Use your own expert knowledge."
  }
Candidate Answer: ${answer}

Return ONLY JSON:

{
  "score": 0,
  "technicalAccuracy": 0,
  "communication": 0,
  "understanding": 0,
  "isCorrect": false,
  "feedback": "short useful feedback"
}

Scoring:
0 = completely incorrect/no meaningful answer
1-39 = very weak
40-59 = partially correct
60-79 = good
80-100 = excellent

Rules:
- Score based on correctness and relevance.
- Do not reward an answer merely for being long.
- For HR answers, evaluate relevance, clarity, structure and professionalism.
- For Aptitude, correctness is the main factor.
- For Technical and Domain-Specific, evaluate technical accuracy and understanding.
- Keep feedback concise.
`;

  try {
    const response =
      await groq.chat.completions.create({
        model:
          process.env.GROQ_MODEL ||
          "openai/gpt-oss-120b",

        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.2,

        response_format: {
          type: "json_object",
        },
      });

    const raw =
      response.choices?.[0]?.message?.content ||
      "{}";

    const ai = JSON.parse(raw);

    return {
      score: clamp(ai.score),

      technicalAccuracy:
        clamp(
          ai.technicalAccuracy
        ),

      communication:
        clamp(ai.communication),

      understanding:
        clamp(ai.understanding),

      isCorrect:
        Boolean(ai.isCorrect),

      feedback:
        String(
          ai.feedback ||
            "Answer evaluated successfully."
        ).trim(),
    };
  } catch (err) {
    console.error(
      "AI answer evaluation failed:",
      err.message
    );

    return {
      score: fallbackScore,

      technicalAccuracy:
        fallbackScore,

      communication:
        fallbackScore,

      understanding:
        fallbackScore,

      isCorrect:
        fallbackScore >= 60,

      feedback:
        "Answer recorded. AI evaluation was temporarily unavailable.",
    };
  }
}

// --------------------------------------------------
// UPDATE STREAK
// --------------------------------------------------

function calculateStreak(profile) {
  const today = new Date();

  if (!profile.lastChallengeDate) {
    profile.currentStreak = 1;

    profile.longestStreak =
      Math.max(
        profile.longestStreak || 0,
        1
      );

    profile.lastChallengeDate =
      today;

    return;
  }

  const last = new Date(
    profile.lastChallengeDate
  );

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const lastDate = new Date(
    last.getFullYear(),
    last.getMonth(),
    last.getDate()
  );

  const difference =
    Math.round(
      (todayDate - lastDate) /
        (1000 * 60 * 60 * 24)
    );

  if (difference === 0) {
    return;
  }

  if (difference === 1) {
    profile.currentStreak =
      (profile.currentStreak || 0) +
      1;
  } else {
    profile.currentStreak = 1;
  }

  profile.longestStreak =
    Math.max(
      profile.longestStreak || 0,
      profile.currentStreak
    );

  profile.lastChallengeDate =
    today;
}

// --------------------------------------------------
// BADGES
// --------------------------------------------------

function addBadge(
  profile,
  name,
  description,
  icon
) {
  const exists =
    profile.badges.some(
      (badge) =>
        badge.name === name
    );

  if (!exists) {
    profile.badges.push({
      name,
      description,
      icon,
      earnedAt: new Date(),
    });
  }
}

function updateBadges(profile) {
  if (
    profile.completedChallenges >= 1
  ) {
    addBadge(
      profile,
      "First Challenge",
      "Completed your first peer challenge.",
      "🎯"
    );
  }

  if (
    profile.completedChallenges >= 10
  ) {
    addBadge(
      profile,
      "Challenge Master",
      "Completed 10 peer challenges.",
      "🏆"
    );
  }

  if (
    profile.currentStreak >= 3
  ) {
    addBadge(
      profile,
      "3-Day Streak",
      "Completed challenges for 3 consecutive days.",
      "🔥"
    );
  }

  if (
    profile.currentStreak >= 7
  ) {
    addBadge(
      profile,
      "7-Day Streak",
      "Maintained a 7-day challenge streak.",
      "🔥"
    );
  }

  if (
    profile.bestScore >= 100
  ) {
    addBadge(
      profile,
      "Perfect Score",
      "Achieved a perfect challenge score.",
      "💯"
    );
  }
}

// --------------------------------------------------
// SAVE RANKING HISTORY
// --------------------------------------------------

// async function saveRankingHistory({
//   userId,
//   rank,
//   xp,
//   score,
//   challengesCompleted,
// }) {
//   try {
//     const leaderboard =
//       await PeerProfile.find({})
//         .sort({
//           xp: -1,
//           bestScore: -1,
//           completedChallenges: -1,
//           updatedAt: 1,
//         })
//         .select(
//           "_id xp bestScore completedChallenges"
//         );

//     const position =
//       leaderboard.findIndex(
//         (profile) =>
//           String(profile._id) ===
//           String(
//             (
//               awaitPeerProfileId(userId)
//             )
//           )
//       ) + 1;

//     const safePosition =
//       position > 0
//         ? position
//         : 1;

//     await RankingHistory.create({
//       userId,

//       rank: safePosition,

//       xp,

//       score,

//       challengesCompleted,
//     });

//     return safePosition;
//   } catch (err) {
//     console.error(
//       "saveRankingHistory error:",
//       err.message
//     );

//     return 0;
//   }
// }

// // Helper used by ranking history
// async function awaitPeerProfileId(
//   userId
// ) {
//   const profile =
//     await PeerProfile.findOne({
//       userId,
//     }).select("_id");

//   return profile?._id;
// }

// --------------------------------------------------
// UPDATE LEADERBOARD POSITIONS
// --------------------------------------------------

async function updateLeaderboardPositions() {
  const profiles =
    await PeerProfile.find({}).sort({
      xp: -1,
      bestScore: -1,
      completedChallenges: -1,
      _id: 1,
    });

  const bulkOperations = profiles.map(
    (profile, index) => ({
      updateOne: {
        filter: {
          _id: profile._id,
        },
        update: {
          $set: {
            leaderboardPosition:
              index + 1,
          },
        },
      },
    })
  );

  if (bulkOperations.length > 0) {
    await PeerProfile.bulkWrite(
      bulkOperations
    );
  }

  return profiles;
}

// --------------------------------------------------
// UPDATE PEER PROFILE
// --------------------------------------------------

async function updatePeerProfile({
  userId,
  attempt,
  challenge,
}) {
  let profile =
    await PeerProfile.findOne({
      userId,
    });

  if (!profile) {
    profile = new PeerProfile({
      userId,
    });
  }

  profile.completedChallenges += 1;

  profile.averageScore =
    clamp(
      (
        (
          profile.averageScore *
          (profile.completedChallenges - 1)
        ) +
        attempt.score
      ) /
        profile.completedChallenges
    );

  profile.bestScore =
    Math.max(
      profile.bestScore || 0,
      attempt.score
    );

  profile.xp +=
    attempt.xpEarned;

  profile.rank =
    getRankFromXP(
      profile.xp
    );

  calculateStreak(profile);

  const categoryKey =
    getCategoryStatsKey(
      challenge.category
    );

  const stats =
    profile.categoryStats[
      categoryKey
    ];

  if (stats) {
    const previousCount =
      stats.completed;

    stats.challenges =
      (stats.challenges || 0) +
      1;

    stats.completed =
      (stats.completed || 0) +
      1;

    stats.averageScore =
      clamp(
        (
          (stats.averageScore || 0) *
            previousCount +
          attempt.score
        ) /
          (previousCount + 1)
      );

    stats.bestScore =
      Math.max(
        stats.bestScore || 0,
        attempt.score
      );
  }

  updateBadges(profile);

  // Save profile first
  await profile.save();

  // Recalculate leaderboard positions
  await updateLeaderboardPositions();

  // Get latest current-user profile
  profile =
    await PeerProfile.findOne({
      userId,
    });

  // Save ranking history
  if (profile) {
    await RankingHistory.create({
      userId,

      rank:
        profile.leaderboardPosition ||
        1,

      xp:
        profile.xp,

      score:
        attempt.score,

      challengesCompleted:
        profile.completedChallenges,
    });
  }

  return profile;
}
// --------------------------------------------------
// SUBMIT ANSWER
// --------------------------------------------------

const submitChallengeAnswer =
  async (req, res) => {
    try {
      const userId =
        req.userId;

      const {
        attemptId,
        questionId,
        answer = "",
        timeTaken = 0,
        skipped = false,
      } = req.body;

      if (
        !attemptId ||
        !questionId
      ) {
        return res.status(400).json({
          message:
            "attemptId and questionId are required",
        });
      }

      const attempt =
        await ChallengeAttempt.findOne(
          {
            _id: attemptId,
            userId,
          }
        );

      if (!attempt) {
        return res.status(404).json({
          message:
            "Challenge attempt not found",
        });
      }

      if (attempt.completed) {
        return res.status(400).json({
          message:
            "Challenge is already completed",
        });
      }

      const challenge =
        await Challenge.findById(
          attempt.challengeId
        );

      if (!challenge) {
        return res.status(404).json({
          message:
            "Challenge not found",
        });
      }

      const question =
        challenge.questions.id(
          questionId
        );

      if (!question) {
        return res.status(404).json({
          message:
            "Question not found",
        });
      }

      // Prevent duplicate submission
      const alreadyAnswered =
        attempt.answers.some(
          (a) =>
            String(a.questionId) ===
            String(questionId)
        );

      if (alreadyAnswered) {
        return res.status(400).json({
          message:
            "This question has already been answered",
        });
      }

      let evaluation = {
        score: 0,

        technicalAccuracy: 0,

        communication: 0,

        understanding: 0,

        isCorrect: false,

        feedback:
          "Question skipped.",
      };

      if (
        !skipped &&
        String(answer).trim()
      ) {
        evaluation =
          await evaluateAnswer({
            category:
              challenge.category,

            domain:
              challenge.domain,

            question:
              question.question,

            expectedAnswer:
              question.expectedAnswer,

            answer:
              String(answer).trim(),
          });
      }

      attempt.answers.push({
        questionId:
          question._id,

        question:
          question.question,

        answer:
          String(answer || ""),

        score:
          evaluation.score,

        feedback:
          evaluation.feedback,

        technicalAccuracy:
          evaluation.technicalAccuracy,

        communication:
          evaluation.communication,

        understanding:
          evaluation.understanding,

        isCorrect:
          evaluation.isCorrect,

        skipped:
          Boolean(skipped),

        timeTaken:
          Number(timeTaken) || 0,
      });

      attempt.answeredQuestions =
        attempt.answers.filter(
          (a) => !a.skipped
        ).length;

      attempt.skippedQuestions =
        attempt.answers.filter(
          (a) => a.skipped
        ).length;

      const answeredScores =
        attempt.answers
          .filter(
            (a) => !a.skipped
          )
          .map(
            (a) => a.score
          );

      attempt.score =
        answeredScores.length
          ? clamp(
              answeredScores.reduce(
                (a, b) =>
                  a + b,
                0
              ) /
                answeredScores.length
            )
          : 0;

      attempt.accuracy =
        attempt.answers.length
          ? clamp(
              (
                attempt.answers.filter(
                  (a) =>
                    a.isCorrect
                ).length /
                attempt.answers.length
              ) *
                100
            )
          : 0;

      const completed =
        attempt.answers.length >=
        challenge.totalQuestions;

      if (completed) {
        attempt.completed =
          true;

        attempt.completedAt =
          new Date();

        const challengeBonus =
          challenge.xpReward || 50;

        const performanceXP =
          Math.round(
            attempt.score * 0.5
          );

        attempt.xpEarned =
          challengeBonus +
          performanceXP;

        await attempt.save();

        const profile =
          await updatePeerProfile({
            userId,

            attempt,

            challenge,
          });

        res.json({
          message:
            "Challenge completed successfully",

          completed: true,

          evaluation,

          attempt,

          profile,
        });

        return;
      }

      await attempt.save();

      res.json({
        message:
          "Answer submitted successfully",

        completed: false,

        evaluation,

        attempt,

        remainingQuestions:
          challenge.totalQuestions -
          attempt.answers.length,
      });
    } catch (err) {
      console.error(
        "submitChallengeAnswer error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to submit challenge answer",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// GET USER PROFILE
// --------------------------------------------------

const getPeerProfile =
  async (req, res) => {
    try {
      // Always refresh leaderboard positions
      await updateLeaderboardPositions();

      const profile =
        await PeerProfile.findOne({
          userId: req.userId,
        });

      if (!profile) {
        return res.json({
          profile: {
            xp: 0,
            rank: "Novice",
            leaderboardPosition: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalChallenges: 0,
            completedChallenges: 0,
            totalAttempts: 0,
            averageScore: 0,
            bestScore: 0,
            badges: [],
          },
        });
      }

      res.json({
        profile,
      });
    } catch (err) {
      console.error(
        "getPeerProfile error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to get peer profile",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// GET USER ATTEMPTS
// --------------------------------------------------

const getMyAttempts =
  async (req, res) => {
    try {
      const attempts =
        await ChallengeAttempt.find({
          userId: req.userId,
        })
          .populate(
            "challengeId",
            "title category domain challengeType difficulty"
          )
          .sort({
            createdAt: -1,
          });

      res.json({
        attempts,
      });
    } catch (err) {
      console.error(
        "getMyAttempts error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to get challenge history",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// GET RANKING HISTORY
// --------------------------------------------------

const getRankingHistory =
  async (req, res) => {
    try {
      const history =
        await RankingHistory.find({
          userId: req.userId,
        })
          .sort({
            recordedAt: -1,
          })
          .limit(100);

      res.json({
        history,
      });
    } catch (err) {
      console.error(
        "getRankingHistory error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to get ranking history",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// GET LEADERBOARD
// --------------------------------------------------

const getLeaderboard =
  async (req, res) => {
    try {
      // Recalculate and persist latest positions
      await updateLeaderboardPositions();

      const profiles =
        await PeerProfile.find({})
          .populate(
            "userId",
            "name email"
          )
          .sort({
            xp: -1,
            bestScore: -1,
            completedChallenges: -1,
            _id: 1,
          });

      const leaderboard =
        profiles.map(
          (profile, index) => ({
            position:
              index + 1,

            userId:
              profile.userId?._id ||
              profile.userId,

            name:
              profile.userId?.name ||
              "Candidate",

            xp:
              profile.xp || 0,

            rank:
              profile.rank ||
              "Novice",

            score:
              profile.averageScore ||
              0,

            bestScore:
              profile.bestScore ||
              0,

            completedChallenges:
              profile.completedChallenges ||
              0,

            currentStreak:
              profile.currentStreak ||
              0,

            badges:
              profile.badges || [],
          })
        );

      const myEntry =
        leaderboard.find(
          (entry) =>
            String(entry.userId) ===
            String(req.userId)
        );

      res.json({
        leaderboard,

        currentUser:
          myEntry || null,
      });
    } catch (err) {
      console.error(
        "getLeaderboard error:",
        err
      );

      res.status(500).json({
        message:
          "Failed to get leaderboard",

        error: err.message,
      });
    }
  };

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  generateChallenge,

  getActiveChallenges,

  getChallengeById,

  startChallenge,

  submitChallengeAnswer,

  getPeerProfile,

  getMyAttempts,

  getRankingHistory,

  getLeaderboard,
};