const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────
// Message Schema
// ─────────────────────────────────────────────────────────────

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["ai", "user"],
    required: true,
  },

  content: {
    type: String,
    required: true,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// ─────────────────────────────────────────────────────────────
// Question Schema
// ─────────────────────────────────────────────────────────────

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },

  answer: {
    type: String,
    default: "",
  },

  difficulty: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },

  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // Main technical topic identified by AI
  topic: {
    type: String,
    default: "",
  },

  // AI feedback for this answer
  feedback: {
    type: String,
    default: "",
  },

  // Adaptive difficulty decision
  decision: {
    type: String,
    enum: ["increase", "decrease", "maintain"],
    default: "maintain",
  },

  // Whether candidate skipped this question
  skipped: {
    type: Boolean,
    default: false,
  },

  // Time when question was skipped
  skippedAt: {
    type: Date,
    default: null,
  },

  // Whether candidate repeated a previous answer
  repeatedAnswer: {
    type: Boolean,
    default: false,
  },

  // Detailed AI evaluation
  communicationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  technicalAccuracy: {
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

  // Answer strengths
  strengths: {
    type: [String],
    default: [],
  },

  // Answer weaknesses
  weaknesses: {
    type: [String],
    default: [],
  },

  // Question creation time
  askedAt: {
    type: Date,
    default: Date.now,
  },

  // Answer submission time
  answeredAt: {
    type: Date,
    default: null,
  },
});

// ─────────────────────────────────────────────────────────────
// Company Profile Snapshot Schema
// ─────────────────────────────────────────────────────────────
//
// This stores the company profile used when the interview started.
// Keeping a snapshot ensures that the interview remains explainable
// even if the company configuration changes later.
// ─────────────────────────────────────────────────────────────

const CompanyProfileSnapshotSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: "",
    },

    name: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    interviewStyle: {
      type: String,
      default: "",
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
      min: 0,
      max: 100,
      default: 0,
    },

    feedbackStyle: {
      type: String,
      default: "",
    },

    difficultyRange: {
      min: {
        type: Number,
        min: 1,
        max: 5,
        default: 1,
      },

      max: {
        type: Number,
        min: 1,
        max: 5,
        default: 5,
      },
    },
  },
  {
    _id: false,
  }
);

// ─────────────────────────────────────────────────────────────
// Interview Schema
// ─────────────────────────────────────────────────────────────

const InterviewSchema = new mongoose.Schema({
  // ─────────────────────────────────────────────────────────
  // Logged-in user
  // ─────────────────────────────────────────────────────────

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // ─────────────────────────────────────────────────────────
  // Interview domain
  // ─────────────────────────────────────────────────────────

  domain: {
    type: String,
    required: true,
  },

  // ─────────────────────────────────────────────────────────
  // TASK 3 — AI RECRUITER SIMULATOR
  // ─────────────────────────────────────────────────────────

  // General = existing Task 1 interview
  // CompanyRecruiter = Task 3 company-specific simulation
  interviewMode: {
    type: String,
    enum: ["General", "CompanyRecruiter"],
    default: "General",
  },

  // Selected company identifier
  // Example: google, amazon, microsoft
  companyId: {
    type: String,
    default: "",
    trim: true,
  },

  // Selected company name
  // Example: Google
  companyName: {
    type: String,
    default: "",
    trim: true,
  },

  // Company category
  // Example: Product Based / Service Based / Startup
  companyType: {
    type: String,
    default: "",
    trim: true,
  },

  // Snapshot of the exact company profile used
  // for this interview.
  companyProfile: {
    type: CompanyProfileSnapshotSchema,
    default: null,
  },

  // Expected score defined by the selected
  // company simulation profile.
  companyExpectedStandard: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // Final comparison against the company standard.
  // This will be populated when the interview is completed.
  meetsCompanyStandard: {
    type: Boolean,
    default: false,
  },

  // Difference between candidate score and
  // company expected standard.
  companyScoreGap: {
    type: Number,
    default: 0,
  },

  // Company-specific final feedback.
  companyFeedback: {
    type: String,
    default: "",
  },

  // ─────────────────────────────────────────────────────────
  // Current adaptive difficulty
  //
  // 1 = Basic
  // 2 = Foundational
  // 3 = Intermediate
  // 4 = Advanced
  // 5 = Expert
  // ─────────────────────────────────────────────────────────

  currentDifficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 2,
  },

  // Difficulty at interview start
  startingDifficulty: {
    type: Number,
    min: 1,
    max: 5,
    default: 2,
  },

  // ─────────────────────────────────────────────────────────
  // Structured question history
  // ─────────────────────────────────────────────────────────

  questions: {
    type: [QuestionSchema],
    default: [],
  },

  // ─────────────────────────────────────────────────────────
  // Chat history used by UI/context
  // ─────────────────────────────────────────────────────────

  messages: {
    type: [MessageSchema],
    default: [],
  },

  // ─────────────────────────────────────────────────────────
  // Final interview score
  // ─────────────────────────────────────────────────────────

  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  communicationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // ─────────────────────────────────────────────────────────
  // Interview duration
  // ─────────────────────────────────────────────────────────

  duration: {
    type: Number,
    default: 0,
  },

  // ─────────────────────────────────────────────────────────
  // Number of answered questions
  // ─────────────────────────────────────────────────────────

  questionsAnswered: {
    type: Number,
    default: 0,
  },

  // ─────────────────────────────────────────────────────────
  // Number of skipped questions
  // ─────────────────────────────────────────────────────────

  questionsSkipped: {
    type: Number,
    default: 0,
  },

  // ─────────────────────────────────────────────────────────
  // Number of repeated answers
  // ─────────────────────────────────────────────────────────

  repeatedAnswers: {
    type: Number,
    default: 0,
  },

  // ─────────────────────────────────────────────────────────
  // Difficulty progression history
  // ─────────────────────────────────────────────────────────

  difficultyHistory: {
    type: [
      {
        questionNumber: {
          type: Number,
        },

        difficulty: {
          type: Number,
          min: 1,
          max: 5,
        },

        score: {
          type: Number,
          min: 0,
          max: 100,
        },

        decision: {
          type: String,
          enum: [
            "increase",
            "decrease",
            "maintain",
          ],
        },
      },
    ],

    default: [],
  },

  // ─────────────────────────────────────────────────────────
  // Final interview report
  // ─────────────────────────────────────────────────────────

  finalReport: {
    summary: {
      type: String,
      default: "",
    },

    strengths: {
      type: [String],
      default: [],
    },

    weaknesses: {
      type: [String],
      default: [],
    },

    progression: {
      type: String,
      default: "",
    },

    recommendation: {
      type: String,
      default: "",
    },

    // ───────────────────────────────────────────────────────
    // TASK 3 — Company-specific report
    // ───────────────────────────────────────────────────────

    companySummary: {
      type: String,
      default: "",
    },

    companyStrengths: {
      type: [String],
      default: [],
    },

    companyWeaknesses: {
      type: [String],
      default: [],
    },

    companyRecommendation: {
      type: String,
      default: "",
    },

    companyStandardResult: {
      type: String,
      default: "",
    },
  },

  // ─────────────────────────────────────────────────────────
  // General/latest feedback
  // ─────────────────────────────────────────────────────────

  
  // General/latest feedback
  feedback: {
    type: String,
    default: "",
  },

  // Mentor review — RBAC Task 6
  mentorReview: {
    feedback: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },

  // Interview completion status
  isComplete: {
    type: Boolean,
    default: false,
  },


  // ─────────────────────────────────────────────────────────
  // Interview creation time
  // ─────────────────────────────────────────────────────────

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ─────────────────────────────────────────────────────────────
// Export Model
// ─────────────────────────────────────────────────────────────

module.exports = mongoose.model(
  "Interview",
  InterviewSchema
);