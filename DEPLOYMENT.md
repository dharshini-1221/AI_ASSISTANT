# Deployment Guide

The project ships as two independently deployable apps:

| App | Folder | Stack | Runs on |
| --- | --- | --- | --- |
| Client | `client/` | Next.js 16 (App Router) | Vercel (static + server rendering) |
| Server | `server/` | Express 5 + Mongoose | Vercel (serverless function) |

Deploy the **server first**, because the client needs its URL.

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

## 2. Server on Vercel

1. Import the repository into Vercel and set **Root Directory** to `server`.
2. Framework preset: **Other**. Build command: leave empty. Output directory:
   leave empty.
3. Add the environment variables below (Production and Preview).
4. Deploy. `server/vercel.json` routes every path to `api/index.js`, which
   wraps the Express app.

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

`CLIENT_URL` accepts a comma-separated list. If you use preview deployments,
either add each preview origin or point `CLIENT_URL` at the stable production
alias; otherwise CORS rejects the browser request.

### Verify

```bash
curl https://your-server.vercel.app/
# {"success":true,"message":"Backend is running!"}
```

### Serverless limits to know about

- **Uploads are capped at 4 MB** (`server/src/routes/resume.js`). Vercel rejects
  request bodies above 4.5 MB before Express sees them.
- **`maxDuration` is 60s** and memory is 1 GB (`server/vercel.json`). Long AI
  calls are the slowest path; the interview endpoints answer in a few seconds.
- **OCR is disabled by default.** Selectable-text PDFs, DOCX and TXT still work.
  Scanned PDFs return a clear `400` explaining that OCR is off. Set
  `ENABLE_OCR=true` to enable it; the `@napi-rs/canvas` prebuilt binary is used
  and `node-canvas` is only an optional fallback.
- **Cold starts** include the Mongo handshake. The connection promise is cached
  per instance so warm invocations skip it.

---

## 3. Client on Vercel

1. Import the same repository again and set **Root Directory** to `client`.
2. Framework preset is detected as **Next.js**.
3. Add one environment variable:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://your-server.vercel.app` |

4. Deploy. `NEXT_PUBLIC_*` values are inlined at build time, so changing the API
   URL requires a redeploy.

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
| Requests hit `/api/api/...` | `NEXT_PUBLIC_API_URL` already ends in `/api`; use the bare host |
| Login succeeds then bounces to `/login` | API unreachable, or 401 from an expired/revoked session — check `active-sessions` |
| Resume upload returns 413 | File exceeds the 4 MB cap |
| Scanned PDF rejected | OCR is disabled on Vercel; upload a text-based PDF/DOCX or set `ENABLE_OCR=true` |
| `PASSWORD_CHANGE_REQUIRED` loop | Finish `/change-password`; the API blocks other routes until then |
