const { createLazyGemini } = require("../utils/geminiClient.js");
const PlacementReadiness = require("../models/PlacementReadiness.js");
const Interview = require("../models/Interview.js");
const ResumeAnalysis = require("../models/ResumeAnalysis.js");
const User = require("../models/User.js");
const SkillAssessment = require("../models/SkillAssessment.js");

const gemini = createLazyGemini({ timeout: 45000 });

const CONFIG = {
  weights: {
    resume: Number(process.env.READINESS_RESUME_WEIGHT) || 25,
    interview: Number(process.env.READINESS_INTERVIEW_WEIGHT) || 35,
    communication: Number(process.env.READINESS_COMMUNICATION_WEIGHT) || 20,
    skills: Number(process.env.READINESS_SKILL_WEIGHT) || 20,
  },
  thresholds: {
    placementReady: Number(process.env.READINESS_PLACEMENT_READY) || 80,
    highPotential: Number(process.env.READINESS_HIGH_POTENTIAL) || 60,
  },
};

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(n) || 0)));
}

function unique(items) {
  return [...new Set((items || []).filter(Boolean).map(String))];
}

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function hasSkill(skills, target) {
  const t = normalized(target);
  return skills.some((s) => {
    const n = normalized(s);
    return n === t || n.includes(t) || t.includes(n);
  });
}

function calculateResumeScore(resume) {
  if (!resume) return 0;
  const skills = resume.skillsDetected || [];
  const strengths = resume.strengths || [];
  const domains = resume.recommendedDomains || [];

  const skillCoverage = Math.min(100, (skills.length / 10) * 100);
  const strengthCoverage = Math.min(100, (strengths.length / 3) * 100);
  const domainConfidence =
    domains.length > 0
      ? domains.reduce((sum, d) => sum + clamp(d.confidence), 0) / domains.length
      : 0;

  return clamp(
    skillCoverage * 0.5 +
      strengthCoverage * 0.2 +
      domainConfidence * 0.3,
  );
}

function getInterviewMetrics(interviews) {
  if (!interviews.length) {
    return { score: 0, communication: 0 };
  }

  const score =
    interviews.reduce((sum, i) => sum + clamp(i.score), 0) / interviews.length;

  const communicationValues = interviews
    .map((i) => Number(i.communicationScore))
    .filter((v) => Number.isFinite(v) && v > 0);

  const communication = communicationValues.length
    ? communicationValues.reduce((a, b) => a + b, 0) / communicationValues.length
    : // Backward compatibility for Task 1 interviews created before communicationScore.
      Math.max(
        0,
        score - Math.min(25, interviews.reduce((sum, i) => {
          const weak = (i.finalReport?.weaknesses || []).length;
          return sum + weak * 2;
        }, 0) / Math.max(1, interviews.length)),
      );

  return { score: clamp(score), communication: clamp(communication) };
}

function getSkillScore(assessments) {
  if (!assessments.length) return 0;

  // Latest attempt per skill represents current ability.
  const latestBySkill = new Map();
  [...assessments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((a) => {
      const key = normalized(a.skillName);
      if (!latestBySkill.has(key)) latestBySkill.set(key, clamp(a.score));
    });

  const values = [...latestBySkill.values()];
  return values.length
    ? clamp(values.reduce((a, b) => a + b, 0) / values.length)
    : 0;
}

function classify(score) {
  if (score >= CONFIG.thresholds.placementReady) return "Placement Ready";
  if (score >= CONFIG.thresholds.highPotential) return "High Potential Candidate";
  return "Needs Improvement";
}

function buildGaps({ resume, interviews, assessments }) {
  const weakTechnicalAreas = [];
  const communicationGaps = [];
  const missingIndustrySkills = [];

  const interviewWeaknesses = unique(
    interviews.flatMap((i) => i.finalReport?.weaknesses || []),
  );
  weakTechnicalAreas.push(...interviewWeaknesses.slice(0, 6));

  // Topic-level performance: low average topic score becomes a concrete gap.
  const topicScores = {};
  interviews.forEach((i) => {
    (i.questions || []).forEach((q) => {
      if (!q.topic || q.skipped) return;
      if (!topicScores[q.topic]) topicScores[q.topic] = [];
      topicScores[q.topic].push(clamp(q.score));
    });
  });
  Object.entries(topicScores).forEach(([topic, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < 60) weakTechnicalAreas.push(`${topic} (${Math.round(avg)}%)`);
  });

  assessments.forEach((a) => {
    if (clamp(a.score) < 60) weakTechnicalAreas.push(`${a.skillName} Skill`);
  });

  const commWeaknesses = unique(
    interviews.flatMap((i) =>
      (i.questions || []).flatMap((q) =>
        (q.weaknesses || []).filter((w) =>
          /communicat|explain|clarity|structure|concise|verbose|articulat|vague|confidence/i.test(w),
        ),
      ),
    ),
  );
  communicationGaps.push(...commWeaknesses);

  if (interviews.length && interviews.every((i) => clamp(i.communicationScore) < 60)) {
    communicationGaps.push("Clear and structured technical explanations");
  }

  const skills = resume?.skillsDetected || [];
  [
    ["Git", "Git and GitHub"],
    ["SQL", "SQL"],
    ["REST API", "REST APIs"],
    ["Docker", "Docker"],
    ["Testing", "Automated Testing"],
    ["Cloud", "Cloud Fundamentals"],
  ].forEach(([needle, label]) => {
    if (!hasSkill(skills, needle)) missingIndustrySkills.push(label);
  });

  return {
    weakTechnicalAreas: unique(weakTechnicalAreas).slice(0, 8),
    communicationGaps: unique(communicationGaps).slice(0, 6),
    missingIndustrySkills: unique(missingIndustrySkills).slice(0, 8),
  };
}

function deterministicRoadmap({ candidateType, gaps, resume }) {
  const topDomains = (resume?.recommendedDomains || []).map((d) => d.label);
  const tech = [];
  const projects = [];
  const certifications = [];
  const interviewTopics = [];

  const domainMap = {
    "JavaScript/Node.js": ["JavaScript ES6+", "Node.js", "REST API design"],
    React: ["React", "TypeScript", "Frontend testing"],
    Python: ["Python", "FastAPI", "Pytest"],
    "Data Science": ["Python", "Pandas", "Machine Learning"],
    DevOps: ["Docker", "CI/CD", "Cloud deployment"],
    "System Design": ["System Design", "Caching", "Scalable API architecture"],
    "Database Design": ["SQL", "Database indexing", "Query optimization"],
    General: ["Git", "SQL", "REST APIs"],
  };

  topDomains.slice(0, 2).forEach((d) => tech.push(...(domainMap[d] || [])));
  gaps.missingIndustrySkills.forEach((x) => tech.push(x.replace(" and GitHub", "")));

  if (candidateType === "Fresher") {
    projects.push(
      "Build one end-to-end portfolio project with authentication, database and deployment",
      "Create a GitHub README with architecture, screenshots and measurable project outcomes",
    );
    certifications.push("Entry-level certification aligned with your target technology");
    interviewTopics.push("DSA fundamentals", "OOP", "DBMS", "Project explanation", "Basic HR/behavioral questions");
  } else if (candidateType === "Internship Seeker") {
    projects.push(
      "Build a small real-world API project and deploy it",
      "Create 2 focused GitHub projects showing problem solving and clean code",
    );
    certifications.push("Industry-relevant beginner certification in your target stack");
    interviewTopics.push("Programming fundamentals", "Problem solving", "Project walkthrough", "REST APIs", "Internship interview questions");
  } else {
    projects.push(
      "Build or document a production-style project showing scale, testing and monitoring",
      "Create a case study demonstrating architecture and measurable technical impact",
    );
    certifications.push("Advanced professional certification relevant to your target role");
    interviewTopics.push("System Design", "Scalability", "Architecture trade-offs", "Leadership", "Technical decision making");
  }

  gaps.weakTechnicalAreas.forEach((g) => interviewTopics.push(`${g} fundamentals and problem solving`));
  if (gaps.communicationGaps.length) {
    interviewTopics.push("STAR-style structured answers", "Explaining technical decisions clearly");
  }

  return {
    technologies: unique(tech).slice(0, 10),
    projects: unique(projects).slice(0, 6),
    certifications: unique(certifications).slice(0, 5),
    interviewTopics: unique(interviewTopics).slice(0, 12),
  };
}

async function generateAIRoadmap(input) {
  const fallback = deterministicRoadmap(input);
  if (!process.env.GEMINI_API_KEY) return fallback;

  const prompt = `You are an expert placement coach. Create a practical, personalized roadmap from verified candidate data.
Candidate type: ${input.candidateType}
Readiness category: ${input.category}
Scores: resume=${input.resumeScore}, interview=${input.interviewScore}, communication=${input.communicationScore}, skills=${input.skillScore}, overall=${input.overallScore}
Weak technical areas: ${JSON.stringify(input.gaps.weakTechnicalAreas)}
Communication gaps: ${JSON.stringify(input.gaps.communicationGaps)}
Missing industry skills: ${JSON.stringify(input.gaps.missingIndustrySkills)}
Resume skills: ${JSON.stringify(input.resume?.skillsDetected || [])}
Target domains: ${JSON.stringify((input.resume?.recommendedDomains || []).map(d => d.label))}

Return ONLY JSON:
{
 "technologies": ["..."],
 "projects": ["..."],
 "certifications": ["..."],
 "interviewTopics": ["..."]
}
Rules: 4-8 technologies, 2-4 projects, 2-4 certifications, 6-10 interview topics. Every recommendation must directly address a gap or target domain. Do not recommend a technology already present in resume skills unless it is for deeper mastery. Candidate type must materially change the roadmap.`;

  try {
    const response = await gemini.chat.completions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });
    const raw = response.choices?.[0]?.message?.content || "{}";
    const ai = JSON.parse(raw);
    return {
      technologies: unique(ai.technologies).slice(0, 10),
      projects: unique(ai.projects).slice(0, 6),
      certifications: unique(ai.certifications).slice(0, 5),
      interviewTopics: unique(ai.interviewTopics).slice(0, 12),
    };
  } catch (err) {
    console.error("AI roadmap generation failed; using deterministic roadmap:", err.message);
    return fallback;
  }
}

async function updateCandidateType(req, res) {
  try {
    const candidateType = String(req.body.candidateType || "").trim();
    const allowed = ["Fresher", "Internship Seeker", "Experienced"];
    if (!allowed.includes(candidateType)) {
      return res.status(400).json({ message: "Invalid candidate type" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { candidateType },
      { new: true, runValidators: true },
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Candidate type updated", candidateType: user.candidateType });
  } catch (err) {
    console.error("updateCandidateType error:", err);
    res.status(500).json({ message: "Failed to update candidate type", error: err.message });
  }
}

async function getRules(req, res) {
  res.json({
    weights: CONFIG.weights,
    thresholds: CONFIG.thresholds,
    formula: "Overall = Resume × weight + Interview × weight + Communication × weight + Skills × weight",
  });
}

async function calculateReadiness(req, res) {
  try {
    const user = await User.findById(req.userId);
    const candidateType = user?.candidateType || "Fresher";

    const interviews = await Interview.find({ userId: req.userId, isComplete: true })
      .sort({ createdAt: -1 });
    const resume = await ResumeAnalysis.findOne({ userId: req.userId }).sort({ updatedAt: -1 });
    const assessments = await SkillAssessment.find({ userId: req.userId }).sort({ createdAt: -1 });

    const resumeScore = calculateResumeScore(resume);
    const interviewMetrics = getInterviewMetrics(interviews);
    const skillScore = getSkillScore(assessments);

    const weights = CONFIG.weights;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) throw new Error("Readiness weights must total more than zero");

    const overallScore = clamp(
      (
        resumeScore * weights.resume +
        interviewMetrics.score * weights.interview +
        interviewMetrics.communication * weights.communication +
        skillScore * weights.skills
      ) / totalWeight,
    );
    const category = classify(overallScore);

    const gaps = buildGaps({ resume, interviews, assessments });
    const recommendations = await generateAIRoadmap({
      candidateType,
      category,
      resumeScore,
      interviewScore: interviewMetrics.score,
      communicationScore: interviewMetrics.communication,
      skillScore,
      overallScore,
      gaps,
      resume,
    });

    const historySnapshot = {
      candidateType,
      resumeScore,
      interviewScore: interviewMetrics.score,
      communicationScore: interviewMetrics.communication,
      skillScore,
      overallScore,
      category,
      weakTechnicalAreas: gaps.weakTechnicalAreas,
      communicationGaps: gaps.communicationGaps,
      missingIndustrySkills: gaps.missingIndustrySkills,
      createdAt: new Date(),
    };

    let readiness = await PlacementReadiness.findOne({ userId: req.userId });
    if (!readiness) {
      readiness = new PlacementReadiness({
        userId: req.userId,
        history: [historySnapshot],
      });
    } else {
      const previous = readiness.history?.[readiness.history.length - 1];
      const changed =
        !previous ||
        previous.overallScore !== overallScore ||
        previous.interviewScore !== interviewMetrics.score ||
        previous.communicationScore !== interviewMetrics.communication ||
        previous.skillScore !== skillScore ||
        previous.resumeScore !== resumeScore ||
        previous.category !== category ||
        previous.candidateType !== candidateType;

      if (changed) readiness.history.push(historySnapshot);
      if (readiness.history.length > 30) readiness.history = readiness.history.slice(-30);
    }

    readiness.candidateType = candidateType;
    readiness.resumeScore = resumeScore;
    readiness.interviewScore = interviewMetrics.score;
    readiness.communicationScore = interviewMetrics.communication;
    readiness.skillScore = skillScore;
    readiness.overallScore = overallScore;
    readiness.category = category;
    readiness.weakTechnicalAreas = gaps.weakTechnicalAreas;
    readiness.communicationGaps = gaps.communicationGaps;
    readiness.missingIndustrySkills = gaps.missingIndustrySkills;
    readiness.recommendations = recommendations;
    readiness.scoreWeights = weights;
    readiness.categoryRules = CONFIG.thresholds;

    await readiness.save();

    res.json({
      message: "Placement readiness calculated successfully",
      readiness,
      rules: { weights, thresholds: CONFIG.thresholds },
      sourceCounts: {
        completedInterviews: interviews.length,
        skillAssessments: assessments.length,
        resumeAvailable: Boolean(resume),
      },
    });
  } catch (err) {
    console.error("calculateReadiness error:", err);
    res.status(500).json({
      message: "Failed to calculate placement readiness",
      error: err.message,
    });
  }
}

async function getHistory(req, res) {
  try {
    const readiness = await PlacementReadiness.findOne({ userId: req.userId }).lean();
    res.json({ history: readiness?.history || [] });
  } catch (err) {
    res.status(500).json({ message: "Failed to get readiness history", error: err.message });
  }
}

module.exports = { calculateReadiness, updateCandidateType, getRules, getHistory };
