const companyProfiles = [
  {
    name: "Google",
    type: "Product Based",

    description:
      "A product-focused technical interview simulation emphasizing problem solving, algorithms, technical depth, and scalable system thinking.",

    interviewStyle:
      "Deep technical discussion with strong emphasis on reasoning, problem solving, and technical depth.",

    focusAreas: [
      "Data Structures",
      "Algorithms",
      "Problem Solving",
      "System Design",
      "Computer Science Fundamentals",
      "Technical Depth",
    ],

    questionPatterns: [
      "Algorithmic problem solving",
      "Optimization and complexity analysis",
      "Deep technical follow-up questions",
      "System design scenarios",
      "Computer science fundamentals",
      "Why and how questions",
    ],

    evaluationCriteria: [
      "Technical correctness",
      "Problem solving ability",
      "Time and space complexity",
      "Depth of understanding",
      "Logical reasoning",
      "Communication clarity",
    ],

    expectedStandard: 80,

    feedbackStyle:
      "Provide detailed technical feedback with emphasis on reasoning, depth, optimization, and problem-solving quality.",

    difficultyRange: {
      min: 3,
      max: 5,
    },

    active: true,
  },

  {
    name: "Amazon",
    type: "Product Based",

    description:
      "A product and customer-focused interview simulation combining technical problem solving, system thinking, practical scenarios, and behavioral evaluation.",

    interviewStyle:
      "Technical and scenario-based interview with emphasis on practical problem solving, ownership, and customer-focused thinking.",

    focusAreas: [
      "Data Structures",
      "Algorithms",
      "Problem Solving",
      "System Design",
      "Object Oriented Programming",
      "Behavioral Skills",
      "Ownership",
      "Customer Focus",
    ],

    questionPatterns: [
      "Coding and algorithmic problems",
      "Practical engineering scenarios",
      "System design questions",
      "Trade-off discussions",
      "Project-based questions",
      "Behavioral scenarios",
      "Follow-up questions testing reasoning",
    ],

    evaluationCriteria: [
      "Technical correctness",
      "Problem solving",
      "Practical decision making",
      "System thinking",
      "Communication",
      "Ownership mindset",
      "Customer-oriented thinking",
    ],

    expectedStandard: 78,

    feedbackStyle:
      "Give practical and structured feedback covering technical ability, decision making, ownership, communication, and customer-focused thinking.",

    difficultyRange: {
      min: 3,
      max: 5,
    },

    active: true,
  },

  {
    name: "Microsoft",
    type: "Product Based",

    description:
      "A technical interview simulation focused on programming fundamentals, problem solving, software engineering concepts, and system thinking.",

    interviewStyle:
      "Balanced technical interview combining coding, fundamentals, software engineering concepts, and deeper follow-up questions.",

    focusAreas: [
      "Data Structures",
      "Algorithms",
      "Object Oriented Programming",
      "Software Engineering",
      "System Design",
      "Computer Science Fundamentals",
      "Cloud and Architecture",
    ],

    questionPatterns: [
      "Coding problems",
      "Conceptual technical questions",
      "Debugging and reasoning",
      "Object oriented design questions",
      "System design scenarios",
      "Technical follow-ups",
      "Project discussions",
    ],

    evaluationCriteria: [
      "Technical correctness",
      "Problem solving",
      "Code quality",
      "Conceptual understanding",
      "System thinking",
      "Communication clarity",
      "Engineering judgment",
    ],

    expectedStandard: 75,

    feedbackStyle:
      "Provide balanced feedback covering coding, fundamentals, engineering practices, system thinking, and communication.",

    difficultyRange: {
      min: 3,
      max: 5,
    },

    active: true,
  },

  {
    name: "TCS",
    type: "Service Based",

    description:
      "A service-oriented interview simulation emphasizing programming fundamentals, databases, object-oriented concepts, problem solving, and communication.",

    interviewStyle:
      "Fundamentals-oriented interview with moderate technical difficulty and practical programming questions.",

    focusAreas: [
      "Programming Fundamentals",
      "Object Oriented Programming",
      "DBMS",
      "SQL",
      "Data Structures",
      "Problem Solving",
      "Communication",
    ],

    questionPatterns: [
      "Programming fundamentals",
      "Basic coding problems",
      "OOP concepts",
      "DBMS concepts",
      "SQL queries",
      "Simple problem-solving scenarios",
      "Project discussions",
    ],

    evaluationCriteria: [
      "Fundamental knowledge",
      "Programming ability",
      "Database understanding",
      "Problem solving",
      "Communication",
      "Concept clarity",
    ],

    expectedStandard: 60,

    feedbackStyle:
      "Provide beginner-friendly and practical feedback highlighting fundamentals, coding ability, database knowledge, and communication.",

    difficultyRange: {
      min: 2,
      max: 4,
    },

    active: true,
  },

  {
    name: "Infosys",
    type: "Service Based",

    description:
      "A service-oriented interview simulation focusing on programming fundamentals, logical thinking, databases, software concepts, and communication.",

    interviewStyle:
      "Fundamentals-focused technical interview with progressive questions based on candidate performance.",

    focusAreas: [
      "Programming Fundamentals",
      "Data Structures",
      "Object Oriented Programming",
      "DBMS",
      "SQL",
      "Logical Problem Solving",
      "Communication",
    ],

    questionPatterns: [
      "Programming concept questions",
      "Basic coding problems",
      "OOP questions",
      "DBMS and SQL questions",
      "Logical reasoning scenarios",
      "Project-related questions",
      "Technical follow-ups",
    ],

    evaluationCriteria: [
      "Programming fundamentals",
      "Conceptual understanding",
      "Problem solving",
      "Database knowledge",
      "Communication",
      "Learning ability",
    ],

    expectedStandard: 60,

    feedbackStyle:
      "Provide clear and structured feedback focused on fundamentals, problem solving, technical concepts, and communication.",

    difficultyRange: {
      min: 2,
      max: 4,
    },

    active: true,
  },

  {
    name: "Startup",
    type: "Startup",

    description:
      "A practical startup-style interview simulation emphasizing projects, real-world problem solving, debugging, adaptability, and hands-on engineering skills.",

    interviewStyle:
      "Practical and flexible interview focused on real-world engineering situations, projects, and problem solving.",

    focusAreas: [
      "Projects",
      "Practical Problem Solving",
      "Debugging",
      "APIs",
      "Git and GitHub",
      "Database Skills",
      "System Thinking",
      "Adaptability",
    ],

    questionPatterns: [
      "Project deep-dive questions",
      "Real-world engineering scenarios",
      "Debugging problems",
      "API design questions",
      "Database scenarios",
      "Git and development workflow questions",
      "What would you do if questions",
    ],

    evaluationCriteria: [
      "Practical problem solving",
      "Hands-on technical ability",
      "Project understanding",
      "Debugging ability",
      "Adaptability",
      "Engineering judgment",
      "Communication",
    ],

    expectedStandard: 65,

    feedbackStyle:
      "Give practical feedback focused on hands-on ability, project knowledge, debugging, adaptability, and real-world engineering decisions.",

    difficultyRange: {
      min: 2,
      max: 5,
    },

    active: true,
  },
];

module.exports = companyProfiles;