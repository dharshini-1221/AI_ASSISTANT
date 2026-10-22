const Groq = require("groq-sdk");
const Interview = require("../models/Interview.js");
const companyProfiles = require("../config/companyProfiles");

// ============================================================
// INTERVIEW CONFIGURATION
// ============================================================

const TOTAL_QUESTIONS = 5;

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;

const MAX_QUESTION_GENERATION_ATTEMPTS = 3;

const ANSWER_SIMILARITY_THRESHOLD = 0.85;
const ANSWER_SEMANTIC_SIMILARITY_THRESHOLD = 0.35;
const QUESTION_SIMILARITY_THRESHOLD = 0.72;
const QUESTION_CHARACTER_THRESHOLD = 0.86;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// GENERAL HELPERS
// ============================================================

const clamp = (value, min = 0, max = 100) => {
  const numericValue = Number(value);

  const safeValue = Number.isFinite(numericValue)
    ? numericValue
    : 0;

  const safeMin = Number.isFinite(Number(min))
    ? Number(min)
    : 0;

  const safeMax = Number.isFinite(Number(max))
    ? Number(max)
    : 100;

  return Math.max(
    safeMin,
    Math.min(safeMax, safeValue)
  );
};

const normalizeText = (text) => {
  if (typeof text !== "string") {
    return "";
  }

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getMessageContent = (response) => {
  return (
    response
      ?.choices?.[0]
      ?.message?.content
      ?.trim() || ""
  );
};

const cleanGeneratedQuestion = (question) => {
  if (typeof question !== "string") {
    return "";
  }

  return question
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(
      /^\s*(question\s*[:\-]\s*)/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
};

// ============================================================
// TASK 3 — COMPANY HELPERS
// ============================================================

const slugifyCompanyName = (name) => {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const getCompanyProfileById = (companyId) => {
  const cleanId = slugifyCompanyName(
    companyId
  );

  if (!cleanId) {
    return null;
  }

  return (
    companyProfiles.find(
      (profile) =>
        slugifyCompanyName(profile.name) ===
        cleanId
    ) || null
  );
};

const createCompanySnapshot = (
  company,
  companyId
) => {
  if (!company) {
    return null;
  }

  return {
    id:
      companyId ||
      slugifyCompanyName(company.name),

    name: company.name,

    type: company.type,

    description:
      company.description || "",

    interviewStyle:
      company.interviewStyle || "",

    focusAreas:
      Array.isArray(company.focusAreas)
        ? company.focusAreas
        : [],

    questionPatterns:
      Array.isArray(
        company.questionPatterns
      )
        ? company.questionPatterns
        : [],

    evaluationCriteria:
      Array.isArray(
        company.evaluationCriteria
      )
        ? company.evaluationCriteria
        : [],

    expectedStandard: clamp(
      company.expectedStandard,
      0,
      100
    ),

    feedbackStyle:
      company.feedbackStyle || "",

    difficultyRange: {
      min: clamp(
        company.difficultyRange?.min,
        MIN_DIFFICULTY,
        MAX_DIFFICULTY
      ),

      max: clamp(
        company.difficultyRange?.max,
        MIN_DIFFICULTY,
        MAX_DIFFICULTY
      ),
    },
  };
};

const getCompanyContext = (interview) => {
  if (
    interview?.interviewMode !==
      "CompanyRecruiter" ||
    !interview.companyProfile
  ) {
    return null;
  }

  return interview.companyProfile;
};

const getCompanyDifficultyRange = (
  companyProfile
) => {
  if (!companyProfile) {
    return {
      min: MIN_DIFFICULTY,
      max: MAX_DIFFICULTY,
    };
  }

  let min = clamp(
    companyProfile.difficultyRange?.min,
    MIN_DIFFICULTY,
    MAX_DIFFICULTY
  );

  let max = clamp(
    companyProfile.difficultyRange?.max,
    MIN_DIFFICULTY,
    MAX_DIFFICULTY
  );

  if (min > max) {
    [min, max] = [max, min];
  }

  return {
    min,
    max,
  };
};

const clampInterviewDifficulty = (
  difficulty,
  companyProfile
) => {
  const range =
    getCompanyDifficultyRange(
      companyProfile
    );

  return clamp(
    difficulty,
    range.min,
    range.max
  );
};

// ============================================================
// STOP WORDS
// ============================================================

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "their",
  "then",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
  "would",
  "you",
  "your",
]);

// ============================================================
// TOKENIZE MEANINGFUL WORDS
// ============================================================

const tokenizeMeaningful = (text) => {
  return normalizeText(text)
    .split(" ")
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.has(word)
    );
};

// ============================================================
// JACCARD SIMILARITY
// ============================================================

const jaccardSimilarity = (
  textA,
  textB
) => {
  const a = new Set(
    tokenizeMeaningful(textA)
  );

  const b = new Set(
    tokenizeMeaningful(textB)
  );

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const word of a) {
    if (b.has(word)) {
      intersection++;
    }
  }

  const union = new Set([
    ...a,
    ...b,
  ]).size;

  if (union === 0) {
    return 0;
  }

  return intersection / union;
};

// ============================================================
// CHARACTER N-GRAMS
// ============================================================

const buildNGrams = (
  text,
  size = 3
) => {
  const normalized =
    normalizeText(text).replace(
      /\s/g,
      ""
    );

  if (normalized.length < size) {
    return new Set();
  }

  const grams = new Set();

  for (
    let index = 0;
    index <=
    normalized.length - size;
    index++
  ) {
    grams.add(
      normalized.slice(
        index,
        index + size
      )
    );
  }

  return grams;
};

// ============================================================
// CHARACTER SIMILARITY
// ============================================================

const characterSimilarity = (
  textA,
  textB
) => {
  const a = buildNGrams(textA);
  const b = buildNGrams(textB);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const gram of a) {
    if (b.has(gram)) {
      intersection++;
    }
  }

  return (
    (2 * intersection) /
    (a.size + b.size)
  );
};

// ============================================================
// SIMILAR TEXT DETECTION
// ============================================================

const isSimilarText = (
  textA,
  textB,
  {
    jaccardThreshold = 0.85,
    characterThreshold = 0.9,
    shortTextLength = 12,
  } = {}
) => {
  const a = normalizeText(textA);
  const b = normalizeText(textB);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (
    a.length < shortTextLength ||
    b.length < shortTextLength
  ) {
    return false;
  }

  const jaccard =
    jaccardSimilarity(a, b);

  const character =
    characterSimilarity(a, b);

  return (
    jaccard >= jaccardThreshold ||
    character >= characterThreshold
  );
};

// ============================================================
// SEMANTIC ANSWER NORMALIZATION
// ============================================================

const SEMANTIC_SYNONYM_GROUPS = [
  [
    "identify",
    "recognize",
    "match",
    "track",
    "associate",
    "distinguish",
  ],

  [
    "unique",
    "different",
    "distinct",
  ],

  [
    "stable",
    "consistent",
    "persistent",
  ],

  [
    "update",
    "updates",
    "updating",
    "change",
    "changes",
    "changing",
  ],

  [
    "item",
    "items",
    "element",
    "elements",
    "component",
    "components",
  ],

  [
    "list",
    "lists",
  ],

  [
    "key",
    "keys",
  ],

  [
    "state",
    "states",
  ],

  [
    "preserve",
    "preserved",
    "preserving",
    "retain",
    "retained",
    "maintain",
  ],

  [
    "render",
    "rendering",
    "rerender",
    "rerendering",
  ],

  [
    "reconcile",
    "reconciliation",
    "diff",
    "diffing",
  ],

  [
    "add",
    "adding",
    "insert",
    "inserting",
  ],

  [
    "remove",
    "removing",
    "delete",
    "deleting",
  ],

  [
    "reorder",
    "reordering",
    "rearrange",
    "rearranging",
  ],
];

const SEMANTIC_CANONICAL =
  new Map();

SEMANTIC_SYNONYM_GROUPS.forEach(
  (group) => {
    const canonical = group[0];

    group.forEach((word) => {
      SEMANTIC_CANONICAL.set(
        word,
        canonical
      );
    });
  }
);

const stemTechnicalWord = (
  word
) => {
  if (!word) {
    return "";
  }

  if (
    SEMANTIC_CANONICAL.has(word)
  ) {
    return SEMANTIC_CANONICAL.get(
      word
    );
  }

  if (
    word.length > 5 &&
    word.endsWith("ies")
  ) {
    return (
      word.slice(0, -3) + "y"
    );
  }

  if (
    word.length > 5 &&
    word.endsWith("ing")
  ) {
    return word.slice(0, -3);
  }

  if (
    word.length > 4 &&
    word.endsWith("ed")
  ) {
    return word.slice(0, -2);
  }

  if (
    word.length > 4 &&
    word.endsWith("s")
  ) {
    return word.slice(0, -1);
  }

  return word;
};

const tokenizeSemanticMeaning = (
  text
) => {
  return tokenizeMeaningful(text)
    .map(stemTechnicalWord)
    .filter(Boolean);
};

const semanticJaccardSimilarity = (
  textA,
  textB
) => {
  const a = new Set(
    tokenizeSemanticMeaning(textA)
  );

  const b = new Set(
    tokenizeSemanticMeaning(textB)
  );

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const word of a) {
    if (b.has(word)) {
      intersection++;
    }
  }

  const union = new Set([
    ...a,
    ...b,
  ]).size;

  return union === 0
    ? 0
    : intersection / union;
};

const semanticCoverageSimilarity = (
  textA,
  textB
) => {
  const a = new Set(
    tokenizeSemanticMeaning(textA)
  );

  const b = new Set(
    tokenizeSemanticMeaning(textB)
  );

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const word of a) {
    if (b.has(word)) {
      intersection++;
    }
  }

  return (
    intersection /
    Math.min(a.size, b.size)
  );
};

// ============================================================
// REPEATED ANSWER DETECTION
// ============================================================

const isRepeatedAnswer = (
  newAnswer,
  previousAnswers
) => {
  const cleanAnswer =
    normalizeText(newAnswer);

  if (!cleanAnswer) {
    return false;
  }

  return previousAnswers.some(
    (previousAnswer) => {
      const cleanPreviousAnswer =
        normalizeText(previousAnswer);

      if (!cleanPreviousAnswer) {
        return false;
      }

      if (
        isSimilarText(
          cleanPreviousAnswer,
          cleanAnswer,
          {
            jaccardThreshold:
              ANSWER_SIMILARITY_THRESHOLD,

            characterThreshold:
              0.9,

            shortTextLength: 20,
          }
        )
      ) {
        return true;
      }

      const semanticJaccard =
        semanticJaccardSimilarity(
          cleanPreviousAnswer,
          cleanAnswer
        );

      const semanticCoverage =
        semanticCoverageSimilarity(
          cleanPreviousAnswer,
          cleanAnswer
        );

      return (
        semanticJaccard >=
          ANSWER_SEMANTIC_SIMILARITY_THRESHOLD ||
        (
          semanticCoverage >= 0.60 &&
          Math.min(
            tokenizeSemanticMeaning(
              cleanPreviousAnswer
            ).length,

            tokenizeSemanticMeaning(
              cleanAnswer
            ).length
          ) >= 4
        )
      );
    }
  );
};

// ============================================================
// DUPLICATE QUESTION DETECTION
// ============================================================

const isDuplicateQuestion = (
  newQuestion,
  previousQuestions
) => {
  const cleanQuestion =
    normalizeText(newQuestion);

  if (!cleanQuestion) {
    return true;
  }

  return previousQuestions.some(
    (previousQuestion) =>
      isSimilarText(
        previousQuestion,
        cleanQuestion,
        {
          jaccardThreshold:
            QUESTION_SIMILARITY_THRESHOLD,

          characterThreshold:
            QUESTION_CHARACTER_THRESHOLD,

          shortTextLength: 25,
        }
      )
  );
};

// ============================================================
// SKIP DETECTION
// ============================================================

const isSkipAnswer = (
  answer
) => {
  const normalized =
    normalizeText(answer);

  const skipPhrases = [
    "skip",
    "next",
    "i dont know",
    "i do not know",
    "dont know",
    "do not know",
    "idk",
    "pass",
    "skip question",
    "skip this question",
  ];

  return skipPhrases.includes(
    normalized
  );
};

// ============================================================
// TASK 3 — COMPANY CONTEXT FOR AI
// ============================================================

const formatCompanyContext = (
  companyProfile
) => {
  if (!companyProfile) {
    return "";
  }

  return `
COMPANY RECRUITER SIMULATION

Company:
${companyProfile.name}

Company type:
${companyProfile.type}

Interview style:
${companyProfile.interviewStyle}

Focus areas:
${companyProfile.focusAreas.join(", ")}

Question patterns:
${companyProfile.questionPatterns.join(", ")}

Evaluation criteria:
${companyProfile.evaluationCriteria.join(", ")}

Expected candidate standard:
${companyProfile.expectedStandard}/100

Feedback style:
${companyProfile.feedbackStyle}
`.trim();
};

// ============================================================
// FIRST QUESTION SYSTEM PROMPT
// ============================================================

const systemPrompt = (
  domain,
  difficulty = 2,
  companyProfile = null
) => {
  const companyContext =
    formatCompanyContext(
      companyProfile
    );

  return `
You are a senior technical interviewer conducting a ${domain} developer interview.

Current difficulty level: ${difficulty}/5.

Difficulty levels:

1 = Basic
2 = Foundational
3 = Intermediate
4 = Advanced
5 = Expert

${
  companyContext
    ? `
You are simulating the hiring style of ${companyProfile.name}.

IMPORTANT:
This is a simulation profile based on the supplied configuration.
Do not claim that these are confidential or official internal hiring rules.

${companyContext}
`
    : ""
}

Ask exactly ONE technical question.

Requirements:

- The question must be relevant to ${domain}.
- The question must match difficulty ${difficulty}/5.
- ${
    companyProfile
      ? `The question must match the ${companyProfile.name} simulation style, focus areas and question patterns.`
      : "The question must test actual technical understanding."
  }
- Test actual technical understanding.
- Be specific and professional.
- Do not ask multiple questions.
- Do not include the answer.
- Do not include a preamble.
- Return ONLY the interview question.
`.trim();
};

// ============================================================
// EVALUATE ANSWER
// ============================================================

const evaluateAnswer = async ({
  domain,
  question,
  answer,
  difficulty,
  companyProfile = null,
}) => {
  const companyContext =
    formatCompanyContext(
      companyProfile
    );

  const response =
    await groq.chat.completions.create({
      model:
        "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",

          content: `
You are a strict, fair and consistent technical interview evaluator.

You are evaluating ONE candidate answer to ONE technical question.

Domain:
${domain}

Question difficulty:
${difficulty}/5

${
  companyContext
    ? `
${companyContext}

This is a company-specific interview simulation.

Evaluate the candidate using the listed company evaluation criteria,
while still judging technical correctness fairly.
`
    : ""
}

Evaluation principles:

1. Evaluate the candidate's answer against the exact question.
2. Technical correctness is more important than answer length.
3. Do not reward irrelevant information.
4. Give partial credit when the answer is partially correct.
5. Penalize technically incorrect statements.
6. If the answer is vague, incomplete or does not answer the question,
   reduce the score.
7. Do not assume knowledge that the candidate did not demonstrate.
8. Do not judge grammar or English fluency unless communication problems
   make the technical answer impossible to understand.
9. Identify the main technical topic.
10. Keep the evaluation internally consistent.

Scoring:

90-100 = Excellent
75-89  = Strong
60-74  = Reasonable but has gaps
40-59  = Weak or incomplete
0-39   = Very weak, incorrect or no meaningful answer

Return ONLY valid JSON.

Return exactly:

{
  "score": 0,
  "technicalAccuracy": 0,
  "understanding": 0,
  "communicationScore": 0,
  "topic": "",
  "decision": "maintain",
  "strengths": [],
  "weaknesses": [],
  "feedback": ""
}

Rules:

- score must be an integer from 0 to 100
- technicalAccuracy must be an integer from 0 to 100
- understanding must be an integer from 0 to 100
- communicationScore must be an integer from 0 to 100
- evaluate clarity, structure, concision and ability to explain the technical answer
- decision must be exactly "increase", "maintain", or "decrease"
- strengths must be an array of strings
- weaknesses must be an array of strings
- topic must be a short technical topic
- feedback must be concise and useful
`.trim(),
        },

        {
          role: "user",

          content: `
Interview Question:

${question}

Candidate Answer:

${answer}

Evaluate this answer now.
`.trim(),
        },
      ],

      temperature: 0.1,

      max_completion_tokens: 800,

      reasoning_effort: "low",

      include_reasoning: false,

      response_format: {
        type: "json_object",
      },
    });

  const raw =
    getMessageContent(response);

  if (!raw) {
    throw new Error(
      "AI evaluator returned an empty response"
    );
  }

  let evaluation;

  try {
    evaluation =
      JSON.parse(raw);
  } catch (error) {
    console.error(
      "Evaluator JSON error:",
      raw
    );

    throw new Error(
      "AI evaluator returned invalid JSON"
    );
  }

  const score =
    Number(evaluation.score);

  const technicalAccuracy =
    Number(
      evaluation.technicalAccuracy
    );

  const understanding =
    Number(
      evaluation.understanding
    );

  const communicationScore =
    Number(
      evaluation.communicationScore
    );

  if (
    !Number.isFinite(score) ||
    !Number.isFinite(
      technicalAccuracy
    ) ||
    !Number.isFinite(
      understanding
    ) ||
    !Number.isFinite(
      communicationScore
    )
  ) {
    throw new Error(
      "AI evaluator returned invalid scores"
    );
  }

  evaluation.score =
    clamp(
      Math.round(score),
      0,
      100
    );

  evaluation.technicalAccuracy =
    clamp(
      Math.round(
        technicalAccuracy
      ),
      0,
      100
    );

  evaluation.understanding =
    clamp(
      Math.round(
        understanding
      ),
      0,
      100
    );

  evaluation.communicationScore =
    clamp(
      Math.round(
        communicationScore
      ),
      0,
      100
    );

  // ==========================================================
  // SERVER-SIDE ADAPTIVE DECISION
  // ==========================================================

  const combinedUnderstanding =
    Math.round(
      (
        evaluation
          .technicalAccuracy +
        evaluation
          .understanding
      ) / 2
    );

  if (
    evaluation.score >= 75 &&
    combinedUnderstanding >= 70
  ) {
    evaluation.decision =
      "increase";
  } else if (
    evaluation.score < 60 ||
    combinedUnderstanding < 55
  ) {
    evaluation.decision =
      "decrease";
  } else {
    evaluation.decision =
      "maintain";
  }

  // ==========================================================
  // VALIDATE STRENGTHS
  // ==========================================================

  if (
    !Array.isArray(
      evaluation.strengths
    )
  ) {
    evaluation.strengths = [];
  }

  evaluation.strengths =
    evaluation.strengths
      .filter(
        (item) =>
          typeof item === "string"
      )
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean)
      .slice(0, 5);

  // ==========================================================
  // VALIDATE WEAKNESSES
  // ==========================================================

  if (
    !Array.isArray(
      evaluation.weaknesses
    )
  ) {
    evaluation.weaknesses = [];
  }

  evaluation.weaknesses =
    evaluation.weaknesses
      .filter(
        (item) =>
          typeof item === "string"
      )
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean)
      .slice(0, 5);

  // ==========================================================
  // VALIDATE TOPIC
  // ==========================================================

  if (
    typeof evaluation.topic !==
      "string" ||
    !evaluation.topic.trim()
  ) {
    evaluation.topic =
      domain;
  } else {
    evaluation.topic =
      evaluation.topic.trim();
  }

  // ==========================================================
  // VALIDATE FEEDBACK
  // ==========================================================

  if (
    typeof evaluation.feedback !==
    "string"
  ) {
    evaluation.feedback = "";
  } else {
    evaluation.feedback =
      evaluation.feedback.trim();
  }

  return evaluation;
};

// ============================================================
// CALCULATE NEXT DIFFICULTY
// ============================================================

const calculateNextDifficulty = ({
  currentDifficulty,
  decision,
  companyProfile = null,
}) => {
  let nextDifficulty =
    Number(currentDifficulty);

  if (
    !Number.isFinite(
      nextDifficulty
    )
  ) {
    nextDifficulty = 2;
  }

  if (
    decision === "increase"
  ) {
    nextDifficulty++;
  } else if (
    decision === "decrease"
  ) {
    nextDifficulty--;
  }

  return clampInterviewDifficulty(
    nextDifficulty,
    companyProfile
  );
};

// ============================================================
// FALLBACK QUESTION BANK
// ============================================================

const getFallbackQuestions = ({
  domain,
  difficulty,
  topic,
  companyProfile = null,
}) => {
  const cleanTopic =
    typeof topic === "string" &&
    topic.trim()
      ? topic.trim()
      : domain;

  const level =
    clampInterviewDifficulty(
      difficulty,
      companyProfile
    );

  // ==========================================================
  // COMPANY-SPECIFIC FALLBACK
  // ==========================================================

  if (companyProfile) {
    const companyName =
      companyProfile.name;

    if (level <= 2) {
      return [
        `For a ${companyName} interview, explain the basic purpose of ${cleanTopic} in ${domain}.`,

        `Give a practical ${domain} example involving ${cleanTopic} and explain your reasoning.`,

        `What common mistake should a developer avoid when using ${cleanTopic} in ${domain}?`,
      ];
    }

    if (level === 3) {
      return [
        `Compare two approaches for solving a ${domain} problem involving ${cleanTopic} and explain your trade-offs.`,

        `How would you diagnose a performance or reliability issue involving ${cleanTopic} in a production ${domain} application?`,

        `Describe the engineering considerations you would make when using ${cleanTopic} in a real-world ${domain} system.`,
      ];
    }

    if (level === 4) {
      return [
        `Design a scalable ${domain} solution using ${cleanTopic} and explain the key trade-offs.`,

        `What failure modes could affect ${cleanTopic} in a production ${domain} system, and how would you mitigate them?`,

        `How would you optimize an existing ${domain} implementation involving ${cleanTopic} under high load?`,
      ];
    }

    return [
      `How would you architect ${cleanTopic} for a large-scale ${domain} system, and what trade-offs would drive your design?`,

      `Analyze the hardest scalability and reliability challenges of ${cleanTopic} in ${domain} and explain how you would address them.`,

      `How would you evaluate competing architectures involving ${cleanTopic} for a high-scale ${domain} system?`,
    ];
  }

  // ==========================================================
  // GENERAL FALLBACK
  // ==========================================================

  if (level <= 1) {
    return [
      `What is ${cleanTopic}, and what is one common use of it in ${domain}?`,

      `Explain the basic purpose of ${cleanTopic} in ${domain}.`,

      `What problem does ${cleanTopic} solve in a typical ${domain} application?`,
    ];
  }

  if (level === 2) {
    return [
      `How does ${cleanTopic} work in a typical ${domain} application?`,

      `What are the main benefits and limitations of ${cleanTopic} in ${domain}?`,

      `Give a practical example of using ${cleanTopic} in ${domain} and explain why it is useful.`,
    ];
  }

  if (level === 3) {
    return [
      `Compare two common approaches for implementing ${cleanTopic} in ${domain} and explain when you would choose each.`,

      `How would you diagnose a performance or reliability problem related to ${cleanTopic} in ${domain}?`,

      `Describe the design considerations you would make when using ${cleanTopic} in a production ${domain} application.`,
    ];
  }

  if (level === 4) {
    return [
      `How would you design a scalable ${domain} solution that relies on ${cleanTopic}, and what trade-offs would you consider?`,

      `What are the most important failure modes of ${cleanTopic} in a production ${domain} system, and how would you mitigate them?`,

      `How would you optimize an existing ${domain} implementation involving ${cleanTopic} under a high-load scenario?`,
    ];
  }

  return [
    `How would you architect ${cleanTopic} for a large-scale ${domain} system, and what trade-offs would drive your design?`,

    `Analyze the hardest scalability and reliability challenges of ${cleanTopic} in ${domain} and explain how you would address them.`,

    `How would you evaluate competing architectures involving ${cleanTopic} for a high-scale ${domain} system?`,
  ];
};

// ============================================================
// SAFE FALLBACK QUESTION
// ============================================================

const getSafeFallbackQuestion = ({
  domain,
  difficulty,
  topic,
  previousQuestions,
  companyProfile = null,
}) => {
  const candidates =
    getFallbackQuestions({
      domain,
      difficulty,
      topic,
      companyProfile,
    });

  const available =
    candidates.find(
      (candidate) =>
        !isDuplicateQuestion(
          candidate,
          previousQuestions
        )
    );

  if (available) {
    return available;
  }

  const companyName =
    companyProfile?.name
      ? `${companyProfile.name} `
      : "";

  const deterministicCandidates = [
    `Explain one important concept related to ${topic || domain} that a ${companyName}${domain} developer should understand.`,

    `Describe one practical challenge when working with ${topic || domain} in ${domain} and how you would solve it.`,

    `What is one production best practice for ${topic || domain} in ${domain}, and why does it matter?`,
  ];

  const safeCandidate =
    deterministicCandidates.find(
      (candidate) =>
        !isDuplicateQuestion(
          candidate,
          previousQuestions
        )
    );

  if (safeCandidate) {
    return safeCandidate;
  }

  throw new Error(
    "Unable to create a unique interview question"
  );
};

// ============================================================
// GENERATE ONE AI QUESTION
// ============================================================

const generateAIQuestion = async ({
  domain,
  difficulty,
  currentQuestion,
  candidateAnswer,
  feedback,
  topic,
  previousQuestions,
  companyProfile = null,
  attempt = 1,
}) => {
  const questionHistory =
    previousQuestions.length > 0
      ? previousQuestions
          .map(
            (
              question,
              index
            ) =>
              `${index + 1}. ${question}`
          )
          .join("\n")
      : "None";

  const companyContext =
    formatCompanyContext(
      companyProfile
    );

  const response =
    await groq.chat.completions.create({
      model:
        "openai/gpt-oss-120b",

      messages: [
        {
          role: "system",

          content: `
You are an expert ${domain} technical interviewer.

Current target difficulty:
${difficulty}/5

Difficulty levels:

1 = Basic
2 = Foundational
3 = Intermediate
4 = Advanced
5 = Expert

${
  companyContext
    ? `
You are conducting a ${companyProfile.name} recruiter simulation.

Use this profile to shape the interview:

${companyContext}
`
    : ""
}

Questions already asked:

${questionHistory}

Candidate's latest technical topic:

${topic || domain}

Generate exactly ONE NEW technical question.

Requirements:

1. Match difficulty ${difficulty}/5.
2. Build naturally from the candidate's demonstrated knowledge.
3. Test a related concept when appropriate.
4. ${
    companyProfile
      ? `Follow the ${companyProfile.name} simulation's focus areas and question patterns.`
      : ""
  }
5. Do NOT repeat any previous question.
6. Do NOT ask a reworded version of any previous question.
7. Avoid the same core concept if it was already directly tested,
   unless a deeper follow-up is clearly justified.
8. Do NOT ask multiple questions.
9. ${
    companyProfile
      ? "Use the company's simulation style. Behavioral/scenario questions are allowed only when supported by the profile."
      : "Do NOT ask a behavioral question."
  }
10. Keep the question technically specific.
11. Return ONLY the question.
12. Do not add "Question:".
13. Do not add explanations.

This is duplicate-prevention attempt ${attempt}.
`.trim(),
        },

        {
          role: "user",

          content: `
Previous question:

${currentQuestion}

Candidate answer:

${candidateAnswer}

Evaluation feedback:

${feedback}

Generate the next technical question.
`.trim(),
        },
      ],

      temperature:
        attempt === 1
          ? 0.5
          : 0.7,

      max_completion_tokens: 500,

      reasoning_effort: "low",

      include_reasoning: false,
    });

  return cleanGeneratedQuestion(
    getMessageContent(response)
  );
};

// ============================================================
// GENERATE UNIQUE NEXT QUESTION
// ============================================================

const generateUniqueNextQuestion =
  async ({
    domain,
    difficulty,
    currentQuestion,
    candidateAnswer,
    feedback,
    topic,
    previousQuestions,
    companyProfile = null,
  }) => {
    // ========================================================
    // AI ATTEMPTS
    // ========================================================

    for (
      let attempt = 1;
      attempt <=
        MAX_QUESTION_GENERATION_ATTEMPTS;
      attempt++
    ) {
      try {
        const candidate =
          await generateAIQuestion({
            domain,
            difficulty,
            currentQuestion,
            candidateAnswer,
            feedback,
            topic,
            previousQuestions,
            companyProfile,
            attempt,
          });

        if (!candidate) {
          console.log(
            `AI returned an empty question on attempt ${attempt}.`
          );

          continue;
        }

        const duplicate =
          isDuplicateQuestion(
            candidate,
            previousQuestions
          );

        if (!duplicate) {
          return {
            question: candidate,

            duplicatePrevented:
              attempt > 1,

            generationAttempts:
              attempt,

            usedFallback: false,
          };
        }

        console.log(
          `Duplicate/similar question detected on attempt ${attempt}:`,
          candidate
        );
      } catch (error) {
        console.error(
          `Question generation attempt ${attempt} failed:`,
          error.message
        );
      }
    }

    // ========================================================
    // FALLBACK
    // ========================================================

    const fallback =
      getSafeFallbackQuestion({
        domain,
        difficulty,
        topic,
        previousQuestions,
        companyProfile,
      });

    console.log(
      "Using deterministic fallback question to guarantee uniqueness."
    );

    return {
      question: fallback,

      duplicatePrevented: true,

      generationAttempts:
        MAX_QUESTION_GENERATION_ATTEMPTS,

      usedFallback: true,
    };
  };

// ============================================================
// TASK 3 — BUILD COMPANY FINAL FEEDBACK
// ============================================================

const buildCompanyFinalFeedback = (
  interview
) => {
  const companyProfile =
    getCompanyContext(interview);

  if (!companyProfile) {
    return {
      companyFeedback: "",

      meetsCompanyStandard: false,

      companyScoreGap: 0,

      companySummary: "",

      companyStrengths: [],

      companyWeaknesses: [],

      companyRecommendation: "",

      companyStandardResult: "",
    };
  }

  const expectedStandard =
    Number(
      companyProfile.expectedStandard
    ) || 0;

  const score =
    Number(interview.score) || 0;

  const meetsStandard =
    score >= expectedStandard;

  const gap =
    Math.round(
      score - expectedStandard
    );

  const strengths = [
    ...new Set(
      interview.questions.flatMap(
        (question) =>
          Array.isArray(
            question.strengths
          )
            ? question.strengths
            : []
      )
    ),
  ].slice(0, 10);

  const weaknesses = [
    ...new Set(
      interview.questions.flatMap(
        (question) =>
          Array.isArray(
            question.weaknesses
          )
            ? question.weaknesses
            : []
      )
    ),
  ].slice(0, 10);

  const standardResult =
    meetsStandard
      ? `Meets the ${companyProfile.name} simulation standard (${score}/100 >= ${expectedStandard}/100).`
      : `Below the ${companyProfile.name} simulation standard (${score}/100 < ${expectedStandard}/100).`;

  let recommendation;

  if (meetsStandard) {
    recommendation =
      `The candidate currently meets the ${companyProfile.name} simulation standard. Continue improving depth in the identified weak areas to become more competitive.`;
  } else if (
    score >= expectedStandard - 10
  ) {
    recommendation =
      `The candidate is close to the ${companyProfile.name} simulation standard. Focus on the identified weaknesses and practice company-style questions before another attempt.`;
  } else {
    recommendation =
      `The candidate is below the ${companyProfile.name} simulation standard. Strengthen the identified technical areas and repeat the company-specific simulation.`;
  }

  const companyFeedback =
    `${companyProfile.name} Simulation Feedback: ${standardResult} ${companyProfile.feedbackStyle} ${recommendation}`;

  return {
    companyFeedback,

    meetsCompanyStandard:
      meetsStandard,

    companyScoreGap:
      gap,

    companySummary:
      `In this ${companyProfile.name} ${interview.domain} recruiter simulation, the candidate scored ${score}/100 against an expected standard of ${expectedStandard}/100.`,

    companyStrengths:
      strengths,

    companyWeaknesses:
      weaknesses,

    companyRecommendation:
      recommendation,

    companyStandardResult:
      standardResult,
  };
};

// ============================================================
// COMPLETE INTERVIEW
// ============================================================

const completeInterview =
  async (interview) => {
    const answeredQuestions =
      interview.questions.filter(
        (question) =>
          question.answer &&
          !question.skipped
      );

    const scores =
      answeredQuestions.map(
        (question) => {
          const value =
            Number(
              question.score
            );

          return Number.isFinite(
            value
          )
            ? value
            : 0;
        }
      );

    const finalScore =
      scores.length > 0
        ? Math.round(
            scores.reduce(
              (
                sum,
                currentScore
              ) =>
                sum +
                currentScore,
              0
            ) / scores.length
          )
        : 0;

    interview.score =
      clamp(
        finalScore,
        0,
        100
      );

    const communicationScores =
      answeredQuestions
        .map(
          (question) =>
            Number(
              question.communicationScore
            )
        )
        .filter(
          (value) =>
            Number.isFinite(value)
        );

    interview.communicationScore =
      communicationScores.length
        ? clamp(
            communicationScores.reduce(
              (
                sum,
                value
              ) =>
                sum + value,
              0
            ) /
              communicationScores.length,
            0,
            100
          )
        : 0;

    interview.isComplete =
      true;

    const createdAt =
      interview.createdAt instanceof
      Date
        ? interview.createdAt.getTime()
        : new Date(
            interview.createdAt
          ).getTime();

    interview.duration =
      Math.max(
        1,
        Math.round(
          (
            Date.now() -
            (
              Number.isFinite(
                createdAt
              )
                ? createdAt
                : Date.now()
            )
          ) / 60000
        )
      );

    // ========================================================
    // TOPICS
    // ========================================================

    const allTopics =
      interview.questions
        .map(
          (question) =>
            question.topic
        )
        .filter(Boolean);

    const uniqueTopics = [
      ...new Set(allTopics),
    ];

    // ========================================================
    // STRENGTHS / WEAKNESSES
    // ========================================================

    const allStrengths = [];
    const allWeaknesses = [];

    interview.questions.forEach(
      (question) => {
        if (
          Array.isArray(
            question.strengths
          )
        ) {
          allStrengths.push(
            ...question.strengths
          );
        }

        if (
          Array.isArray(
            question.weaknesses
          )
        ) {
          allWeaknesses.push(
            ...question.weaknesses
          );
        }
      }
    );

    const uniqueStrengths = [
      ...new Set(allStrengths),
    ].slice(0, 10);

    const uniqueWeaknesses = [
      ...new Set(allWeaknesses),
    ].slice(0, 10);

    // ========================================================
    // GENERAL FINAL REPORT
    // ========================================================

    interview.finalReport = {
      summary:
        `The candidate completed a ${interview.domain} technical interview with an overall score of ${interview.score}/100.`,

      strengths:
        uniqueStrengths,

      weaknesses:
        uniqueWeaknesses,

      progression:
        `The interview started at difficulty ${interview.startingDifficulty}/5 and reached a current difficulty of ${interview.currentDifficulty}/5. Topics covered: ${uniqueTopics.join(", ") || "Technical concepts"}.`,

      recommendation:
        interview.score >= 75
          ? "The candidate demonstrated strong technical understanding."
          : interview.score >= 50
            ? "The candidate demonstrated reasonable understanding but should improve identified weak areas."
            : "The candidate should strengthen the identified foundational concepts before attempting more advanced topics.",
    };

    // ========================================================
    // TASK 3 — COMPANY FINAL REPORT
    // ========================================================

    const companyResult =
      buildCompanyFinalFeedback(
        interview
      );

    interview.companyFeedback =
      companyResult.companyFeedback;

    interview.meetsCompanyStandard =
      companyResult.meetsCompanyStandard;

    interview.companyScoreGap =
      companyResult.companyScoreGap;

    interview.finalReport.companySummary =
      companyResult.companySummary;

    interview.finalReport.companyStrengths =
      companyResult.companyStrengths;

    interview.finalReport.companyWeaknesses =
      companyResult.companyWeaknesses;

    interview.finalReport.companyRecommendation =
      companyResult.companyRecommendation;

    interview.finalReport.companyStandardResult =
      companyResult.companyStandardResult;

    await interview.save();

    return interview;
  };

// ============================================================
// START INTERVIEW
// ============================================================

const startInterview =
  async (req, res) => {
    try {
      const {
        domain,
        companyId,
      } = req.body;

      if (
        !domain ||
        typeof domain !==
          "string" ||
        !domain.trim()
      ) {
        return res
          .status(400)
          .json({
            message:
              "Domain is required",
          });
      }

      const cleanDomain =
        domain.trim();

      // ======================================================
      // TASK 3 — RESOLVE COMPANY
      // ======================================================

      let companyProfile =
        null;

      let interviewMode =
        "General";

      let cleanCompanyId =
        "";

      if (
        companyId !==
          undefined &&
        companyId !== null &&
        String(companyId).trim()
      ) {
        cleanCompanyId =
          slugifyCompanyName(
            companyId
          );

        companyProfile =
          getCompanyProfileById(
            cleanCompanyId
          );

        if (!companyProfile) {
          return res
            .status(404)
            .json({
              success: false,

              message:
                "Selected company profile not found",
            });
        }

        interviewMode =
          "CompanyRecruiter";
      }

      const companySnapshot =
        createCompanySnapshot(
          companyProfile,
          cleanCompanyId
        );

      // ======================================================
      // STARTING DIFFICULTY
      // ======================================================

      const startingDifficulty =
        clampInterviewDifficulty(
          companyProfile
            ? companyProfile
                .difficultyRange?.min
            : 2,

          companyProfile
        );

      // ======================================================
      // GENERATE FIRST QUESTION
      // ======================================================

      let completion =
        await groq.chat.completions.create(
          {
            model:
              "openai/gpt-oss-120b",

            messages: [
              {
                role: "system",

                content:
                  systemPrompt(
                    cleanDomain,
                    startingDifficulty,
                    companySnapshot
                  ),
              },

              {
                role: "user",

                content:
                  "Start the interview. Ask the first technical question.",
              },
            ],

            temperature: 0.5,

            max_completion_tokens: 500,

            reasoning_effort:
              "low",

            include_reasoning:
              false,
          }
        );

      let firstQuestion =
        cleanGeneratedQuestion(
          getMessageContent(
            completion
          )
        );

      // ======================================================
      // RETRY EMPTY QUESTION
      // ======================================================

      if (!firstQuestion) {
        console.log(
          "AI returned empty first-question content. Retrying..."
        );

        completion =
          await groq.chat.completions.create(
            {
              model:
                "openai/gpt-oss-120b",

              messages: [
                {
                  role: "system",

                  content:
                    systemPrompt(
                      cleanDomain,
                      startingDifficulty,
                      companySnapshot
                    ),
                },

                {
                  role: "user",

                  content:
                    "Return exactly one interview question and nothing else.",
                },
              ],

              temperature: 0.5,

              max_completion_tokens:
                600,

              reasoning_effort:
                "low",

              include_reasoning:
                false,
            }
          );

        firstQuestion =
          cleanGeneratedQuestion(
            getMessageContent(
              completion
            )
          );
      }

      // ======================================================
      // FALLBACK FIRST QUESTION
      // ======================================================

      if (!firstQuestion) {
        firstQuestion =
          getSafeFallbackQuestion({
            domain: cleanDomain,

            difficulty:
              startingDifficulty,

            topic: cleanDomain,

            previousQuestions: [],

            companyProfile:
              companySnapshot,
          });
      }

      if (!firstQuestion) {
        throw new Error(
          "AI failed to generate the first question"
        );
      }

      // ======================================================
      // CREATE INTERVIEW
      // ======================================================

      const interview =
        await Interview.create({
          userId:
            req.userId,

          domain:
            cleanDomain,

          // TASK 3
          interviewMode,

          companyId:
            cleanCompanyId,

          companyName:
            companySnapshot?.name ||
            "",

          companyType:
            companySnapshot?.type ||
            "",

          companyProfile:
            companySnapshot,

          companyExpectedStandard:
            companySnapshot
              ?.expectedStandard ||
            0,

          meetsCompanyStandard:
            false,

          companyScoreGap:
            0,

          companyFeedback:
            "",

          // ADAPTIVE DIFFICULTY
          currentDifficulty:
            startingDifficulty,

          startingDifficulty:
            startingDifficulty,

          questions: [
            {
              question:
                firstQuestion,

              answer: "",

              difficulty:
                startingDifficulty,

              score: 0,

              topic: "",

              feedback: "",

              decision:
                "maintain",

              skipped: false,

              repeatedAnswer:
                false,
            },
          ],

          messages: [
            {
              role: "ai",

              content:
                firstQuestion,

              timestamp:
                new Date(),
            },
          ],

          questionsAnswered:
            0,

          questionsSkipped:
            0,

          repeatedAnswers:
            0,

          difficultyHistory:
            [],

          isComplete:
            false,
        });

      return res
        .status(201)
        .json({
          success: true,

          sessionId:
            interview._id,

          question:
            firstQuestion,

          difficulty:
            startingDifficulty,

          questionNumber:
            1,

          totalQuestions:
            TOTAL_QUESTIONS,

          isComplete:
            false,

          // TASK 3 RESPONSE
          interviewMode,

          companyId:
            cleanCompanyId,

          companyName:
            companySnapshot?.name ||
            "",

          companyType:
            companySnapshot?.type ||
            "",

          expectedStandard:
            companySnapshot
              ?.expectedStandard ||
            0,

          companyProfile:
            companySnapshot ||
            null,
        });
    } catch (err) {
      console.error(
        "startInterview error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to start interview",

          error:
            err.message,
        });
    }
  };

// ============================================================
// SUBMIT ANSWER
// ============================================================

const submitAnswer =
  async (req, res) => {
    try {
      const {
        sessionId,
        answer,
      } = req.body;

      if (!sessionId) {
        return res
          .status(400)
          .json({
            message:
              "Session ID is required",
          });
      }

      if (
        typeof answer !==
        "string"
      ) {
        return res
          .status(400)
          .json({
            message:
              "Answer must be a string",
          });
      }

      const cleanAnswer =
        answer.trim();

      if (!cleanAnswer) {
        return res
          .status(400)
          .json({
            message:
              "Answer cannot be empty",
          });
      }

      const interview =
        await Interview.findOne({
          _id: sessionId,

          userId:
            req.userId,
        });

      if (!interview) {
        return res
          .status(404)
          .json({
            message:
              "Interview session not found",
          });
      }

      if (
        interview.isComplete
      ) {
        return res
          .status(400)
          .json({
            message:
              "This interview has already been completed",
          });
      }

      const currentQuestion =
        interview.questions[
          interview.questions.length -
            1
        ];

      if (!currentQuestion) {
        return res
          .status(400)
          .json({
            message:
              "No active question found for this interview",
          });
      }

      if (
        currentQuestion.answer ||
        currentQuestion.skipped
      ) {
        return res
          .status(400)
          .json({
            message:
              "The current question has already been processed",
          });
      }

      if (
        isSkipAnswer(
          cleanAnswer
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Use the Skip Question option to skip this question.",
          });
      }

      // ======================================================
      // REPEATED ANSWER DETECTION
      // ======================================================

      const previousAnsweredQuestions =
        interview.questions.filter(
          (question) =>
            question.answer &&
            question.answer.trim()
        );

      const repeatedAnswer =
        isRepeatedAnswer(
          cleanAnswer,

          previousAnsweredQuestions.map(
            (question) =>
              question.answer
          )
        );

      if (repeatedAnswer) {
        console.log(
          "Repeated/similar candidate answer detected."
        );
      }

      // ======================================================
      // COMPANY CONTEXT
      // ======================================================

      const companyProfile =
        getCompanyContext(
          interview
        );

      // ======================================================
      // AI EVALUATION
      // ======================================================

      const evaluation =
        await evaluateAnswer({
          domain:
            interview.domain,

          question:
            currentQuestion.question,

          answer:
            cleanAnswer,

          difficulty:
            interview.currentDifficulty,

          companyProfile,
        });

      const {
        score,
        technicalAccuracy,
        understanding,
        communicationScore,
        topic,
        decision,
        strengths,
        weaknesses,
        feedback,
      } = evaluation;

      const currentDifficulty =
        Number.isFinite(
          Number(
            interview.currentDifficulty
          )
        )
          ? Number(
              interview.currentDifficulty
            )
          : 2;

      const nextDifficulty =
        calculateNextDifficulty({
          currentDifficulty,

          decision,

          companyProfile,
        });

      // ======================================================
      // SAVE ANSWER
      // ======================================================

      currentQuestion.answer =
        cleanAnswer;

      currentQuestion.score =
        score;

      currentQuestion.topic =
        topic;

      currentQuestion.feedback =
        repeatedAnswer
          ? `${feedback}${feedback ? " " : ""}This answer was detected as very similar to a previous answer.`
          : feedback;

      currentQuestion.decision =
        decision;

      currentQuestion.skipped =
        false;

      currentQuestion.repeatedAnswer =
        repeatedAnswer;

      currentQuestion.answeredAt =
        new Date();

      currentQuestion.technicalAccuracy =
        technicalAccuracy;

      currentQuestion.understanding =
        understanding;

      currentQuestion.communicationScore =
        communicationScore;

      currentQuestion.strengths =
        strengths;

      currentQuestion.weaknesses =
        weaknesses;

      interview.questionsAnswered =
        Number(
          interview.questionsAnswered ||
            0
        ) + 1;

      if (repeatedAnswer) {
        interview.repeatedAnswers =
          Number(
            interview.repeatedAnswers ||
              0
          ) + 1;
      }

      // ======================================================
      // DIFFICULTY HISTORY
      // ======================================================

      if (
        !Array.isArray(
          interview.difficultyHistory
        )
      ) {
        interview.difficultyHistory =
          [];
      }

      interview.difficultyHistory.push(
        {
          questionNumber:
            interview.questionsAnswered,

          difficulty:
            currentDifficulty,

          score,

          decision,
        }
      );

      // ======================================================
      // CHAT HISTORY
      // ======================================================

      if (
        !Array.isArray(
          interview.messages
        )
      ) {
        interview.messages =
          [];
      }

      interview.messages.push({
        role: "user",

        content:
          cleanAnswer,

        timestamp:
          new Date(),
      });

      interview.messages.push({
        role: "ai",

        content:
          feedback,

        timestamp:
          new Date(),
      });

      // ======================================================
      // CHECK COMPLETION
      // ======================================================

      const isComplete =
        interview.questionsAnswered >=
        TOTAL_QUESTIONS;

      if (isComplete) {
        interview.currentDifficulty =
          nextDifficulty;

        const completedInterview =
          await completeInterview(
            interview
          );

        return res.json({
          success: true,

          feedback,

          score:
            completedInterview.score,

          technicalAccuracy,

          understanding,

          communicationScore,

          topic,

          strengths,

          weaknesses,

          decision,

          difficulty:
            nextDifficulty,

          isComplete:
            true,

          questionsAnswered:
            completedInterview.questionsAnswered,

          questionsSkipped:
            completedInterview.questionsSkipped,

          totalQuestions:
            TOTAL_QUESTIONS,

          repeatedAnswer,

          repeatedAnswers:
            completedInterview.repeatedAnswers,

          finalReport:
            completedInterview.finalReport,

          // TASK 3
          interviewMode:
            completedInterview.interviewMode,

          companyId:
            completedInterview.companyId,

          companyName:
            completedInterview.companyName,

          companyType:
            completedInterview.companyType,

          expectedStandard:
            completedInterview.companyExpectedStandard,

          meetsCompanyStandard:
            completedInterview.meetsCompanyStandard,

          companyScoreGap:
            completedInterview.companyScoreGap,

          companyFeedback:
            completedInterview.companyFeedback,
        });
      }

      // ======================================================
      // UPDATE DIFFICULTY
      // ======================================================

      interview.currentDifficulty =
        nextDifficulty;

      // ======================================================
      // PREVIOUS QUESTIONS
      // ======================================================

      const previousQuestions =
        interview.questions
          .map(
            (question) =>
              question.question
          )
          .filter(Boolean);

      // ======================================================
      // GENERATE UNIQUE NEXT QUESTION
      // ======================================================

      const generation =
        await generateUniqueNextQuestion(
          {
            domain:
              interview.domain,

            difficulty:
              nextDifficulty,

            currentQuestion:
              currentQuestion.question,

            candidateAnswer:
              cleanAnswer,

            feedback,

            topic,

            previousQuestions,

            companyProfile,
          }
        );

      const nextQuestion =
        generation.question;

      // ======================================================
      // FINAL SERVER SAFETY CHECK
      // ======================================================

      if (
        isDuplicateQuestion(
          nextQuestion,
          previousQuestions
        )
      ) {
        throw new Error(
          "Generated question failed final duplicate validation"
        );
      }

      // ======================================================
      // ADD NEXT QUESTION
      // ======================================================

      interview.questions.push({
        question:
          nextQuestion,

        answer: "",

        difficulty:
          nextDifficulty,

        score: 0,

        topic: "",

        feedback: "",

        decision:
          "maintain",

        skipped: false,

        repeatedAnswer:
          false,
      });

      interview.messages.push({
        role: "ai",

        content:
          nextQuestion,

        timestamp:
          new Date(),
      });

      await interview.save();

      return res.json({
        success: true,

        feedback,

        score,

        technicalAccuracy,

        understanding,

        communicationScore,

        topic,

        strengths,

        weaknesses,

        decision,

        repeatedAnswer,

        repeatedAnswers:
          interview.repeatedAnswers,

        difficulty:
          nextDifficulty,

        nextQuestion,

        questionNumber:
          interview.questions.length,

        totalQuestions:
          TOTAL_QUESTIONS,

        isComplete:
          false,

        duplicatePrevented:
          generation.duplicatePrevented,

        generationAttempts:
          generation.generationAttempts,

        usedFallback:
          generation.usedFallback,

        // TASK 3
        interviewMode:
          interview.interviewMode,

        companyId:
          interview.companyId,

        companyName:
          interview.companyName,

        companyType:
          interview.companyType,

        expectedStandard:
          interview.companyExpectedStandard,
      });
    } catch (err) {
      console.error(
        "submitAnswer error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Internal server error",

          error:
            err.message,
        });
    }
  };

// ============================================================
// SKIP QUESTION
// ============================================================

const skipQuestion =
  async (req, res) => {
    try {
      const {
        sessionId,
      } = req.body;

      if (!sessionId) {
        return res
          .status(400)
          .json({
            message:
              "Session ID is required",
          });
      }

      const interview =
        await Interview.findOne({
          _id: sessionId,

          userId:
            req.userId,
        });

      if (!interview) {
        return res
          .status(404)
          .json({
            message:
              "Interview session not found",
          });
      }

      if (
        interview.isComplete
      ) {
        return res
          .status(400)
          .json({
            message:
              "This interview has already been completed",
          });
      }

      const currentQuestion =
        interview.questions[
          interview.questions.length -
            1
        ];

      if (!currentQuestion) {
        return res
          .status(400)
          .json({
            message:
              "No active question found for this interview",
          });
      }

      if (
        currentQuestion.answer ||
        currentQuestion.skipped
      ) {
        return res
          .status(400)
          .json({
            message:
              "The current question has already been processed",
          });
      }

      // ======================================================
      // MARK SKIPPED
      // ======================================================

      currentQuestion.skipped =
        true;

      currentQuestion.skippedAt =
        new Date();

      currentQuestion.score =
        0;

      currentQuestion.feedback =
        "Question skipped by candidate.";

      currentQuestion.decision =
        "maintain";

      currentQuestion.communicationScore =
        0;

      interview.questionsSkipped =
        Number(
          interview.questionsSkipped ||
            0
        ) + 1;

      // ======================================================
      // DIFFICULTY REMAINS SAME
      // ======================================================

      const companyProfile =
        getCompanyContext(
          interview
        );

      const currentDifficulty =
        clampInterviewDifficulty(
          Number.isFinite(
            Number(
              interview.currentDifficulty
            )
          )
            ? Number(
                interview.currentDifficulty
              )
            : 2,

          companyProfile
        );

      interview.currentDifficulty =
        currentDifficulty;

      if (
        !Array.isArray(
          interview.difficultyHistory
        )
      ) {
        interview.difficultyHistory =
          [];
      }

      interview.difficultyHistory.push(
        {
          questionNumber:
            interview.questions.length,

          difficulty:
            currentDifficulty,

          score: 0,

          decision:
            "maintain",
        }
      );

      if (
        !Array.isArray(
          interview.messages
        )
      ) {
        interview.messages =
          [];
      }

      interview.messages.push({
        role: "user",

        content:
          "[Question skipped]",

        timestamp:
          new Date(),
      });

      // ======================================================
      // CHECK COMPLETION
      // ======================================================

      const processedQuestions =
        interview.questions.length;

      if (
        processedQuestions >=
        TOTAL_QUESTIONS
      ) {
        const completedInterview =
          await completeInterview(
            interview
          );

        return res.json({
          success: true,

          message:
            "Question skipped. Interview completed.",

          isComplete:
            true,

          score:
            completedInterview.score,

          communicationScore:
            completedInterview.communicationScore,

          questionsAnswered:
            completedInterview.questionsAnswered,

          questionsSkipped:
            completedInterview.questionsSkipped,

          totalQuestions:
            TOTAL_QUESTIONS,

          difficulty:
            completedInterview.currentDifficulty,

          finalReport:
            completedInterview.finalReport,

          // TASK 3
          interviewMode:
            completedInterview.interviewMode,

          companyId:
            completedInterview.companyId,

          companyName:
            completedInterview.companyName,

          companyType:
            completedInterview.companyType,

          expectedStandard:
            completedInterview.companyExpectedStandard,

          meetsCompanyStandard:
            completedInterview.meetsCompanyStandard,

          companyScoreGap:
            completedInterview.companyScoreGap,

          companyFeedback:
            completedInterview.companyFeedback,
        });
      }

      // ======================================================
      // GENERATE REPLACEMENT QUESTION
      // ======================================================

      const previousQuestions =
        interview.questions
          .map(
            (question) =>
              question.question
          )
          .filter(Boolean);

      const generation =
        await generateUniqueNextQuestion(
          {
            domain:
              interview.domain,

            difficulty:
              currentDifficulty,

            currentQuestion:
              currentQuestion.question,

            candidateAnswer:
              "The candidate skipped this question.",

            feedback:
              "The candidate skipped the previous question. Ask a new question without increasing difficulty.",

            topic:
              currentQuestion.topic ||
              interview.domain,

            previousQuestions,

            companyProfile,
          }
        );

      const nextQuestion =
        generation.question;

      // ======================================================
      // FINAL DUPLICATE CHECK
      // ======================================================

      if (
        isDuplicateQuestion(
          nextQuestion,
          previousQuestions
        )
      ) {
        throw new Error(
          "Generated replacement question failed final duplicate validation"
        );
      }

      // ======================================================
      // ADD NEW QUESTION
      // ======================================================

      interview.questions.push({
        question:
          nextQuestion,

        answer: "",

        difficulty:
          currentDifficulty,

        score: 0,

        topic: "",

        feedback: "",

        decision:
          "maintain",

        skipped: false,

        repeatedAnswer:
          false,
      });

      interview.messages.push({
        role: "ai",

        content:
          nextQuestion,

        timestamp:
          new Date(),
      });

      await interview.save();

      return res.json({
        success: true,

        message:
          "Question skipped successfully.",

        isComplete:
          false,

        nextQuestion,

        difficulty:
          currentDifficulty,

        questionNumber:
          interview.questions.length,

        totalQuestions:
          TOTAL_QUESTIONS,

        questionsAnswered:
          interview.questionsAnswered,

        questionsSkipped:
          interview.questionsSkipped,

        duplicatePrevented:
          generation.duplicatePrevented,

        generationAttempts:
          generation.generationAttempts,

        usedFallback:
          generation.usedFallback,

        // TASK 3
        interviewMode:
          interview.interviewMode,

        companyId:
          interview.companyId,

        companyName:
          interview.companyName,

        companyType:
          interview.companyType,

        expectedStandard:
          interview.companyExpectedStandard,
      });
    } catch (err) {
      console.error(
        "skipQuestion error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Failed to skip question",

          error:
            err.message,
        });
    }
  };

// ============================================================
// GET ALL COMPLETED INTERVIEWS
// ============================================================


const {
  hasPermissionAsync,
} = require("../config/permissions.js");

// ============================================================
// GET COMPLETED INTERVIEWS
// Students: own completed interviews only
// Reviewers/Mentors: completed interview summaries
// ============================================================

const getInterviews = async (req, res) => {
  try {
    if (!req.user || !req.userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const canReview = await hasPermissionAsync(
      req.user,
      "interviews:read_completed"
    );

    // Students without review permission can see only
    // their own completed interviews.
    const filter = canReview
      ? { isComplete: true }
      : {
          userId: req.userId,
          isComplete: true,
        };

    const interviews = await Interview.find(filter)
      .select(
        "userId domain score duration questionsAnswered questionsSkipped repeatedAnswers communicationScore interviewMode companyName createdAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    const mapped = interviews.map((interview) => ({
      id: interview._id,
      topic: interview.domain,
      score: interview.score,
      duration: interview.duration,
      questionsAnswered: interview.questionsAnswered,
      questionsSkipped: interview.questionsSkipped,
      repeatedAnswers: interview.repeatedAnswers,
      communicationScore:
        Number.isFinite(Number(interview.communicationScore))
          ? Number(interview.communicationScore)
          : 0,
      interviewMode: interview.interviewMode || "General",
      companyName: interview.companyName || "",
      date: interview.createdAt,

      // Include owner ID for authorized review workflows.
      // Do not return answers or private session messages here.
      ...(canReview
        ? { candidateId: String(interview.userId) }
        : {}),
    }));

    return res.status(200).json({
      success: true,
      interviews: mapped,
    });
  } catch (error) {
    console.error("getInterviews error:", error);

    return res.status(500).json({
      message: "Failed to fetch interviews",
    });
  }
};


// ============================================================
// GET SINGLE INTERVIEW
// ============================================================

const getInterview =
  async (req, res) => {
    try {
      const interview =
        await Interview.findOne({
          _id:
            req.params.id,

          userId:
            req.userId,
        });

      if (!interview) {
        return res
          .status(404)
          .json({
            message:
              "Interview not found",
          });
      }

      return res.json({
        success: true,

        interview,
      });
    } catch (err) {
      console.error(
        "getInterview error:",
        err
      );

      return res
        .status(500)
        .json({
          message:
            "Server error",

          error:
            err.message,
        });
    }
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  startInterview,
  submitAnswer,
  skipQuestion,
  getInterviews,
  getInterview,
};