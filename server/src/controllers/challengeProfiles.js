const challengeProfiles = {
  HR: {
    name: "HR",
    description: "Behavioral, communication and HR interview challenges",
    focusAreas: [
      "Communication",
      "Teamwork",
      "Leadership",
      "Problem Solving",
      "Situational Questions",
      "Career Goals"
    ],
    difficultyRange: {
      min: 1,
      max: 5
    },
    evaluationCriteria: [
      "Communication",
      "Clarity",
      "Confidence",
      "Relevance",
      "Professionalism"
    ]
  },

  Technical: {
    name: "Technical",
    description: "Technical interview challenges covering programming and CS fundamentals",
    focusAreas: [
      "Programming",
      "Data Structures",
      "Algorithms",
      "OOP",
      "DBMS",
      "SQL",
      "Operating Systems",
      "Computer Networks"
    ],
    difficultyRange: {
      min: 1,
      max: 5
    },
    evaluationCriteria: [
      "Technical Accuracy",
      "Problem Solving",
      "Conceptual Understanding",
      "Code Quality",
      "Complexity Analysis"
    ]
  },

  Aptitude: {
    name: "Aptitude",
    description: "Quantitative, logical and analytical aptitude challenges",
    focusAreas: [
      "Quantitative Aptitude",
      "Logical Reasoning",
      "Verbal Reasoning",
      "Data Interpretation",
      "Analytical Reasoning"
    ],
    difficultyRange: {
      min: 1,
      max: 5
    },
    evaluationCriteria: [
      "Correctness",
      "Reasoning",
      "Speed",
      "Accuracy"
    ]
  },

  "Domain-Specific": {
    name: "Domain-Specific",
    description: "Interview challenges based on the candidate's selected technology or domain",
    focusAreas: [
      "Domain Knowledge",
      "Practical Skills",
      "Tools and Technologies",
      "Project Knowledge",
      "Industry Concepts"
    ],
    difficultyRange: {
      min: 1,
      max: 5
    },
    evaluationCriteria: [
      "Domain Knowledge",
      "Technical Accuracy",
      "Practical Understanding",
      "Problem Solving",
      "Industry Awareness"
    ]
  }
};

module.exports = challengeProfiles;