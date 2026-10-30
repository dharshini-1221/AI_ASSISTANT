const Groq = require("groq-sdk");

// Groq clients are created lazily and cached per option set.
//
// The SDK throws at construction time when GROQ_API_KEY is missing, so
// building the client at module scope crashes the whole serverless function
// on import - every route dies, not just the AI ones. Resolving the key on
// first use keeps the API alive (health checks, auth, RBAC) and turns a
// missing key into a clear 503 on the specific AI route that needs it.
const clients = new Map();

function getGroqClient(options = {}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "GROQ_API_KEY is not configured on this deployment. AI features are unavailable."
    );
    error.code = "GROQ_NOT_CONFIGURED";
    error.status = 503;
    throw error;
  }

  const cacheKey = JSON.stringify(options);

  if (!clients.has(cacheKey)) {
    clients.set(cacheKey, new Groq({ apiKey, ...options }));
  }

  return clients.get(cacheKey);
}

// A drop-in stand-in for the SDK client: every property access resolves the
// real client, so existing call sites (groq.chat.completions.create) keep
// working untouched.
function createLazyGroq(options = {}) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        return getGroqClient(options)[prop];
      },
    }
  );
}

module.exports = { getGroqClient, createLazyGroq };
