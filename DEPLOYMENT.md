# Deployment Guide

The repository deploys as **one Vercel project with two services**, declared in
the root `vercel.json`:

| Service | Root | Stack | Public path |
| --- | --- | --- | --- |
| `client` | `client/` | Next.js 16 (App Router) | every path except `/api/*` |
| `server` | `server/` | Express 5 + Mongoose | `/api/*` |

Vercel routes `/api/*` to the Express service and everything else to the Next.js
service **on the same domain**. The browser therefore never makes a cross-origin
request, and no API URL has to be baked into the client build.

### Confirmed configuration

| Decision | Value |
| --- | --- |
| Service names | `client`, `server` |
| Public routing | One domain. `/api/*` → `server`, every other path → `client` |
| Bindings | None. The browser is the only caller of the API, so there is no service-to-service traffic to bind. `NEXT_PUBLIC_*` values are inlined at build time and cannot be sourced from a binding, which is why the client uses a relative API base URL. |

**Assumptions baked into this setup**

- The client always calls the API on its own origin (relative `/api/...`).
  `NEXT_PUBLIC_API_URL` is only needed if the API is later moved to another host.
- The Express function is detected by Vercel's zero-config support, which
  resolves `server/src/index.js` (it exports the app, and does not call
  `app.listen` on import).
- OCR for scanned resumes is off on Vercel unless `ENABLE_OCR=true`; the native
  canvas/Tesseract path is slow on cold starts. Selectable-text PDFs and DOCX
  uploads are unaffected.
- `CLIENT_URL` only needs to be set for a custom domain or a separately hosted
  frontend — the Vercel deployment and production hostnames are allowed
  automatically.

---

## 1. Database (MongoDB Atlas)

1. Create a free cluster at <https://www.mongodb.com/atlas>.
2. Add a database user with read/write access.
3. Under **Network Access**, allow `0.0.0.0/0`. Vercel functions run from
   dynamic IPs, so a fixed allowlist is not practical without a NAT gateway.
4. Copy the connection string and append the database name:

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai_interview?retryWrites=true&w=majority
```

The server opens a cached connection and reuses it across invocations, so a
small pool (`maxPoolSize: 5`) is intentional.

---

## 2. Deploy the project on Vercel

1. Import the repository. Leave **Root Directory** at `./` — the root
   `vercel.json` defines both services.
2. Vercel reads `services` and builds `client` (Next.js) and `server` (Express).
3. Add the environment variables below to the project (Production and Preview).
   They are shared by both services.
4. Deploy. `client` runs `next build`; `server` is bundled as one function from
   `server/src/index.js`, which exports the Express app.

### Required environment variables

| Key | Notes |
| --- | --- |
| `MONGO_URI` | Atlas connection string from step 1 |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `DATA_ENCRYPTION_KEY` | 64 hex chars (AES-256-GCM key for session/login records) |
| `GROQ_API_KEY` | Groq API key used by interview, resume and challenge AI |
| `CLIENT_URL` | Deployed client origin, e.g. `https://your-client.vercel.app` |
| `TRUST_PROXY` | `true` on Vercel |

### Optional

| Key | Default | Notes |
| --- | --- | --- |
| `GROQ_MODEL` | model set in code | Override the Groq model id |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | – | Needed for verification and password-reset mail |
| `ENABLE_OCR` | off on Vercel | `true` re-enables scanned-PDF OCR (slower cold starts) |
| `TESSERACT_CACHE_PATH` | `/tmp` on Vercel | Trained-data cache location |
| `READINESS_*` | 25/35/20/20, 80, 60 | Placement readiness weights and thresholds |

`CLIENT_URL` accepts a comma-separated list. On Vercel the project's own
deployment and production hostnames (`VERCEL_URL`,
`VERCEL_PROJECT_PRODUCTION_URL`) are allowed automatically, so same-origin calls
work with no extra configuration. Add `CLIENT_URL` only for custom domains or an
externally hosted frontend.

### Verify

```bash
curl https://your-project.vercel.app/api/health
# {"success":true,"message":"Backend is running!"}
```

### Serverless limits to know about

- **Uploads are capped at 4 MB** (`server/src/routes/resume.js`). Vercel rejects
  request bodies above 4.5 MB before Express sees them.
- **Function duration defaults to 300s** on Hobby with Fluid compute, so long AI
  calls are safe. The Groq SDK timeouts in the controllers (45s, 120s for resume
  analysis) stay well inside that budget.
- **OCR is disabled by default.** Selectable-text PDFs, DOCX and TXT still work.
  Scanned PDFs return a clear `400` explaining that OCR is off. Set
  `ENABLE_OCR=true` to enable it; the `@napi-rs/canvas` prebuilt binary is used
  and `node-canvas` is only an optional fallback.
- **Cold starts** include the Mongo handshake. The connection promise is cached
  per instance so warm invocations skip it, and the first request of a cold
  instance connects lazily before any route runs.
- **Bundle size** is capped at 250 MB per function and memory defaults to 2 GB /
  1 vCPU on Hobby. `pdfjs-dist`, `tesseract.js` and the canvas binary fit
  comfortably; do not add heavy native packages.

---

## 3. Client configuration

The client needs no configuration for the default deployment: API calls go to
the relative `/api/*` path, which Vercel routes to the Express service.

| Key | When to set it |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Only when the API lives on another origin (e.g. the client is hosted separately). Leave unset for the Services setup. |

`NEXT_PUBLIC_*` values are inlined at build time, so changing this value
requires a redeploy.

### Route protection

`client/proxy.ts` (Next 16's replacement for `middleware.ts`) does coarse
gating using an `auth_role` cookie that `client/lib/auth.ts` writes on login and
clears on logout:

- no cookie → redirect to `/login`
- `/admin/*` requires `Administrator`
- `/mentor/*` requires `Mentor`
- any other matched page requires a signed-in role

The cookie is a UX hint, not a security boundary. Every API route enforces JWT
validity, `ActiveSession` revocation and role/permission checks server-side.
After an administrator changes a user's role, that user must sign in again (or
refresh) before the cookie reflects the new role.

---

## 4. Local development

```bash
# server
cd server
npm install
cp .env.example .env        # fill in the values
npm run dev                 # http://localhost:5000

# client (second terminal)
cd client
npm install
cp .env.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                 # http://localhost:3000
```

With both running, register an account. Email verification requires the SMTP
variables; without them registration still succeeds but no mail is sent.

---

## 5. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Database is unavailable` (503) | `MONGO_URI` wrong, or the Atlas IP allowlist does not include Vercel |
| CORS error in the browser | `CLIENT_URL` does not exactly match the client origin (scheme + host, no trailing slash) |
| Requests hit `/api/api/...` | `NEXT_PUBLIC_API_URL` already ends in `/api`; leave it unset or use the bare host |
| Login succeeds then bounces to `/login` | API unreachable, or 401 from an expired/revoked session — check `active-sessions` |
| Resume upload returns 413 | File exceeds the 4 MB cap |
| Scanned PDF rejected | OCR is disabled on Vercel; upload a text-based PDF/DOCX or set `ENABLE_OCR=true` |
| `PASSWORD_CHANGE_REQUIRED` loop | Finish `/change-password`; the API blocks other routes until then |
