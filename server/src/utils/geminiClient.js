// Gemini client. The native Gemini REST API is used (the OpenAI-compatible
// endpoint is unreliable for these keys). A small adapter exposes the
// OpenAI-style `chat.completions.create` interface so call sites stay
// unchanged: it converts OpenAI messages to Gemini contents, maps the common
// generation parameters, and returns an OpenAI-shaped response.

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const clients = new Map();

function getGeminiClient(options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "GEMINI_API_KEY is not configured on this deployment. AI features are unavailable."
    );
    error.code = "GEMINI_NOT_CONFIGURED";
    error.status = 503;
    throw error;
  }

  const cacheKey = JSON.stringify(options);
  if (!clients.has(cacheKey)) {
    clients.set(cacheKey, buildClient(apiKey, options));
  }
  return clients.get(cacheKey);
}

function buildClient(apiKey, options) {
  async function create(params) {
    const {
      model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
      messages = [],
      temperature,
      max_tokens,
      max_completion_tokens,
      response_format,
    } = params || {};

    const systemParts = [];
    const contents = [];
    for (const m of messages) {
      if (!m) continue;
      if (m.role === "system") {
        systemParts.push(String(m.content ?? ""));
      } else {
        const role = m.role === "assistant" ? "model" : "user";
        contents.push({ role, parts: [{ text: String(m.content ?? "") }] });
      }
    }

    const generationConfig = {};
    if (temperature !== undefined) generationConfig.temperature = temperature;
    const maxTok = max_completion_tokens || max_tokens;
    if (maxTok !== undefined) generationConfig.maxOutputTokens = maxTok;
    if (response_format && response_format.type === "json_object") {
      generationConfig.responseMimeType = "application/json";
    }
    generationConfig.thinkingConfig = { thinkingBudget: 0 };

    const body = { contents, generationConfig };
    if (systemParts.length) {
      body.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
    }

    const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        data?.error?.message || `Gemini request failed (${res.status})`
      );
      err.status = res.status;
      err.code = data?.error?.status;
      throw err;
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join("") || "";

    return {
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: data?.candidates?.[0]?.finishReason || "stop",
        },
      ],
      usage: data?.usageMetadata,
    };
  }

  return {
    chat: {
      completions: {
        create,
      },
    },
  };
}

function createLazyGemini(options = {}) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        return getGeminiClient(options)[prop];
      },
    }
  );
}

module.exports = { getGeminiClient, createLazyGemini };
