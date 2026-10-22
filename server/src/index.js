
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db.js");

const authRoutes = require("./routes/auth.js");
const interviewRoutes = require("./routes/interview.js");
const resumeRoutes = require("./routes/resume.js");
const placementRoutes = require("./routes/placement.js");
const skillRoutes = require("./routes/skill.js");
const companyRoutes = require("./routes/company.js");
const challengeRoutes = require("./routes/challenge.js");
const adminRoutes = require("./routes/admin.js");
const mentorRoutes = require("./routes/mentor.js");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy only when running behind a configured reverse proxy.
// Set TRUST_PROXY=true in .env only if your deployment requires it.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// CORS configuration
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as server-to-server calls.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      const error = new Error("Origin not allowed by CORS");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/placement", placementRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/recruiter", companyRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/mentor", mentorRoutes);

// Handle unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Centralized error handler — keep this after all routes
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  const statusCode = Number.isInteger(err.status)
    ? err.status
    : 500;

  if (statusCode >= 500) {
    console.error("SERVER ERROR:", err);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message || "Request failed",
  });
});

// Start server only after the database connects
const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from the server .env file");
    }

    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

/*
  Only listen when this file is executed directly (node src/index.js).
  On Vercel the app is imported by api/index.js instead, where the
  platform owns the HTTP listener.
*/
if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
