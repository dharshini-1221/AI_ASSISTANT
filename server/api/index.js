/*
  Vercel serverless entry point.

  Vercel owns the HTTP listener, so the Express app is imported
  (src/index.js only calls app.listen when run directly) and the
  database connection is awaited before the request is delegated.
*/
const app = require("../src/index.js");
const connectDB = require("../src/config/db.js");

let configError = null;

if (!process.env.JWT_SECRET) {
  configError =
    "JWT_SECRET is not configured for this deployment.";
}

module.exports = async (req, res) => {
  if (configError) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");

    res.end(
      JSON.stringify({
        success: false,
        message: configError,
      })
    );

    return;
  }

  try {
    await connectDB();
  } catch (error) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");

    res.end(
      JSON.stringify({
        success: false,
        message:
          "Database is unavailable. Please try again shortly.",
      })
    );

    return;
  }

  return app(req, res);
};
