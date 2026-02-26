# Architecture Patterns

**Domain:** Hebrew course landing page builder (Next.js 16 app, adding auth, chat-editing, per-course Sheets, Forms)
**Researched:** 2026-02-26
**Confidence:** HIGH (official Next.js 16 docs, Gemini API docs verified)

---

## Existing Architecture (Verified From Codebase)

```
Browser
  |
  ├─ /login            ← LoginPage (client component)
  ├─ /create           ← CourseForm (step 1, localStorage)
  ├─ /create/config    ← LandingConfigPage (step 2, localStorage)
  └─ /l/[id]           ← Public landing page (server component, no auth)

Next.js App (landing-next/)
  |
  ├─ proxy.ts          ← Route guard (WIRED: auto-loaded by Next.js)
  |                      Protects: /create, /api/banner, /api/create-landing
  |
  ├─ lib/auth.ts       ← HMAC session tokens (Web Crypto API)
  |
  └─ API Routes
       ├─ /api/auth/login     → POST: credentials → Apps Script → session cookie
       ├─ /api/auth/logout    → POST: clear session cookie
       ├─ /api/banner         → POST: course data → Gemini → PNG images + colors
       ├─ /api/create-landing → POST: course data → Apps Script (createSheet) → JSON file
       ├─ /api/landing/[id]   → GET: read JSON file (fallback: Apps Script)
       ├─ /api/register       → POST: proxy to Apps Script (register action)
       └─ /api/logos          → GET: serve logo assets

External Services
  ├─ Google Apps Script (AUTH_SCRIPT_URL) ← authenticate, createSheet, register, getLanding
  ├─ Gemini API (gemini-3-pro-image-preview) ← banner + hero background generation
  └─ Google Sheets ← per-course registration data (sheetId stored in landing JSON)

Storage
  └─ data/landings/*.json ← one file per landing page (id, course, assets, theme, sheetId)
```

---

## The proxy.ts Auth Gap (Critical Finding)

**proxy.ts is NOT broken — it is correctly placed but has a runtime issue.**

Next.js 16 auto-loads `proxy.ts` from the project root. The file exists at `landing-next/proxy.ts`, which IS the project root for this app. No import needed.

**The actual problem:** `proxy.ts` calls `verifySessionToken()` from `lib/auth.ts`, which uses `crypto.subtle` (Web Crypto API). In Next.js 16, proxy defaults to the **Node.js runtime** (stable since v15.5.0), so `crypto.subtle` IS available via `globalThis.crypto`. However, the proxy code imports from `@/lib/auth` — this path alias resolves to `lib/auth.ts`. If path aliases aren't configured for the proxy runtime context, the import fails silently.

**Verified behavior:** The `proxy.ts` exported function is named `proxy` (correct for Next.js 16). The `config.matcher` pattern is correct. The logic is sound.

**Likely bug:** The `from` redirect parameter allows open redirect (confirmed in CONCERNS.md). Additionally, the proxy only checks `/create`, `/api/banner`, `/api/create-landing` — it does NOT protect `/api/register` or other API routes.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `proxy.ts` | Route-level auth guard — checks session cookie, redirects unauthenticated users | `lib/auth.ts` (verifySessionToken) |
| `lib/auth.ts` | HMAC session token creation and verification | Web Crypto API (built-in) |
| `app/api/auth/login` | Credential validation, session cookie issuance | Apps Script (authenticate), `lib/auth.ts` |
| `app/api/auth/logout` | Session cookie destruction | — |
| `app/api/banner` | AI image generation (banner + hero background + color extraction) | Gemini API, node-vibrant |
| `app/api/create-landing` | Course persistence + per-course sheet creation | Apps Script (createSheet), filesystem (JSON write) |
| `app/api/landing/[id]` | Landing data retrieval | filesystem (JSON read), Apps Script fallback |
| `app/api/register` | Registration proxy | Apps Script (register action) |
| `app/login/page.tsx` | Login UI | `/api/auth/login` |
| `app/create/page.tsx` | Step 1 UI — course details + banner generation | `/api/banner`, localStorage |
| `app/create/config/page.tsx` | Step 2 UI — landing config + publish | `/api/create-landing`, localStorage |
| `app/l/[id]/page.tsx` | Public landing page (no auth) | `/api/landing/[id]`, `/api/register` |
| Google Apps Script | External backend — auth, sheet creation, registration writes | Google Sheets, Gmail |

---

## Data Flow

### Auth Flow (Current — needs debugging)

```
Browser POST /api/auth/login { username, password }
  → Next.js route handler
  → fetch(AUTH_SCRIPT_URL, { action: "authenticate", username, password })
  → Google Apps Script checks Sheets user list
  → Returns { success: true, username }
  → createSessionToken(username) → HMAC-signed cookie "cf_session"
  → Set-Cookie: cf_session=[payload].[signature]; HttpOnly; SameSite=Lax

Subsequent requests to /create or /api/banner:
  → proxy.ts reads cf_session cookie
  → verifySessionToken(token) → validates HMAC, checks expiry
  → Pass: NextResponse.next()
  → Fail: redirect to /login?from=[original-path]
```

### Course Creation Flow (localStorage bridge between steps)

```
Step 1: /create
  User fills form → CourseForm component
  → POST /api/banner { course, design, branding }
    → Gemini generates banner (16:9) + hero background in parallel
    → node-vibrant extracts primary/accent colors
    → Returns { banner: dataURL, background: dataURL, colors }
  → Save everything to localStorage["courseData"]

Step 2: /create/config
  → Read localStorage["courseData"]
  → User adjusts settings (font, description, interview toggle)
  → Click "Create Landing Page"
  → POST /api/create-landing { courseData }
    → Calls Apps Script createSheet(courseTitle, landingId)
    → Gets back sheetId
    → Writes data/landings/{landingId}.json with sheetId
    → Returns { landingId, url }
  → Navigate to /l/{landingId}
```

### Registration Flow (public, no auth)

```
Visitor at /l/{id}
  → Server: GET /api/landing/{id} → reads JSON file → returns landing data
  → Renders Hero, CourseDetails, RegistrationForm
  → User submits form
  → POST /api/register { sheetId, landingId, fullName, phone, email, referral }
    → Proxies to Apps Script { action: "register", sheetId, ...formData }
    → Apps Script writes row to course-specific Google Sheet
```

---

## New Feature Integration Patterns

### 1. Auth Fix — Resolving the Login Flow

**What to investigate:** The `proxy.ts` is wired correctly. The diagnostic is: does `verifySessionToken` succeed when the cookie exists? Add console.log or a `/api/auth/me` endpoint that reads and returns the session.

**Pattern:** The path alias `@/lib/auth` must resolve in the proxy context. Verify `tsconfig.json` has `paths` configured. If not, use relative import `../../lib/auth` or inline the verification logic in proxy.ts.

**Open redirect fix:** Validate the `from` param — only allow paths starting with `/` (relative paths):

```typescript
// proxy.ts
const from = request.nextUrl.pathname;
loginUrl.searchParams.set("from", from.startsWith("/") ? from : "/create");
```

**Also protect:** Add `/api/banner-edit` to PROTECTED_PATHS when chat editing is added.

---

### 2. Chat-Style Banner Editing

**Gemini multi-turn chat is the right pattern.** Gemini's API supports iterative image editing via conversation context — `startChat()` then `sendMessage()` with the previous image in the conversation history.

**New component:** `/api/banner-edit` route handler.

**Data flow:**

```
/l/{id} or /create/config → Banner Edit Panel (chat UI)
  User types: "הוסף כיתוב בצד שמאל"
  → POST /api/banner-edit { landingId, currentBannerDataUrl, instruction }
    → Build chat history: [{ role: "user", parts: [prompt, inlineData: currentBanner] }]
    → client.chats.create({ model, history: [] }) or sendMessage with image
    → Gemini returns new image bytes
    → Extract image, return { banner: dataURL }
  → Update display, offer "Save" or "Try again"
  → On save: PATCH /api/landing/{id} to update bannerUrl in JSON file
```

**Critical:** Gemini multi-turn chat maintains image context automatically. The SDK handles "thought signatures" internally. Use the same `generateContent` with conversation history rather than `startChat()` for the stateless API route pattern (no persistent server-side chat object):

```typescript
// /api/banner-edit/route.ts
const response = await client.models.generateContent({
  model: MODEL,
  contents: [
    {
      role: "user",
      parts: [
        { text: `You generated this banner. User request: "${instruction}"` },
        { inlineData: { mimeType: "image/png", data: currentBannerBase64 } },
      ]
    }
  ],
  config: { responseModalities: ["TEXT", "IMAGE"] },
});
```

**Note:** This does NOT maintain real conversation history across HTTP requests (stateless API routes). Each edit call sends the current image plus the instruction. For true multi-turn context (e.g., "make it darker" then "now add a border"), the client must accumulate the conversation history array and send it with each request. Keep it simple for V1: stateless single-instruction edits.

**Protect this route:** Add `/api/banner-edit` to `PROTECTED_PATHS` in `proxy.ts`.

---

### 3. Per-Course Google Sheets (Already Partially Implemented)

**This is already wired.** `create-landing/route.ts` calls Apps Script `createSheet` and stores `sheetId` in the JSON file. The `register/route.ts` reads `sheetId` from the POST body and passes it to Apps Script.

**What's missing:** The Apps Script `createSheet` action. The Next.js side is done. The Apps Script backend needs to implement:

```javascript
// In Apps Script
case "createSheet": {
  const title = `${data.courseTitle} - רישומים`;
  const ss = SpreadsheetApp.create(title);
  // Set headers: תאריך, שם מלא, טלפון, אימייל, מקור
  const sheet = ss.getActiveSheet();
  sheet.appendRow(["תאריך", "שם מלא", "טלפון", "אימייל", "מקור", "הערות"]);
  return { success: true, sheetId: ss.getId(), sheetUrl: ss.getUrl() };
}
```

**Data flow:**

```
create-landing → Apps Script createSheet(courseTitle, landingId)
                          ↓
              SpreadsheetApp.create() → new Google Sheet in Drive
                          ↓
              Returns { sheetId, sheetUrl }
                          ↓
              Stored in data/landings/{id}.json as "sheetId"
                          ↓
register → Apps Script register(sheetId, formData)
                          ↓
         SpreadsheetApp.openById(sheetId).appendRow(...)
```

**Dependency:** The Google account running Apps Script must have Drive write permission. Already the case since it's the org account.

---

### 4. Google Forms Feedback (Instructor Feedback at Course End)

**Pattern:** Apps Script creates the form, emails link to instructor.

**Trigger mechanism:** This cannot be purely automated (no cron in this stack). Options:
- **Option A (recommended):** A "Send Feedback Form" button on the instructor's landing page view. Instructor clicks when course ends. Calls `/api/send-feedback-form`.
- **Option B:** Time-based trigger in Apps Script — runs daily, checks if course end date has passed, sends form.

**Option A data flow (simpler, no cron):**

```
Instructor navigates to /l/{id}?admin=1 (or dedicated /manage/{id})
  → "Course ended? Send feedback form" button
  → POST /api/send-feedback-form { landingId }
    → Read data/landings/{landingId}.json (get course title, instructor email)
    → Call Apps Script { action: "createFeedbackForm", courseTitle, instructorEmail }
      → Apps Script: FormApp.create(title)
      → Add standard questions (overall rating, content quality, improvements)
      → GmailApp.sendEmail(instructorEmail, "Feedback form for your course", formUrl)
    → Returns { formUrl, success }
```

**Apps Script implementation:**

```javascript
case "createFeedbackForm": {
  const form = FormApp.create(`משוב: ${data.courseTitle}`);
  form.setDescription("אנא מלאו את הטופס כדי לעזור לנו לשפר את הקורסים");
  form.addScaleItem().setTitle("דירוג כללי (1-5)").setBounds(1, 5).setRequired(true);
  form.addParagraphTextItem().setTitle("מה הייתה חוזקת הקורס?");
  form.addParagraphTextItem().setTitle("מה ניתן לשפר?");
  const formUrl = form.getPublishedUrl();
  GmailApp.sendEmail(data.instructorEmail, `משוב קורס: ${data.courseTitle}`,
    `הקורס הסתיים. הנה קישור לטופס המשוב: ${formUrl}`);
  return { success: true, formUrl };
}
```

**Data requirement:** The landing JSON needs to store `instructorEmail` or `instructorUsername`. Currently not stored. Add during course creation flow (Step 2 `create-landing` should include the session username).

---

### 5. Vercel Deployment

**No architecture changes needed.** The app is standard Next.js. Two things to configure:

1. **Environment variables** in Vercel dashboard: `GEMINI_API_KEY`, `SESSION_SECRET`, `AUTH_SCRIPT_URL`, `APPS_SCRIPT_URL`, `NEXT_PUBLIC_BASE_URL`
2. **Persistent storage problem:** `data/landings/*.json` files are ephemeral on Vercel (read-only filesystem in serverless). Options:
   - **Option A (quick):** Move JSON storage to Vercel Blob or KV
   - **Option B (fits existing pattern):** Store all landing data in Apps Script/Google Sheets (the fallback path already exists in `api/landing/[id]/route.ts`)
   - **Recommendation:** Use Vercel Blob for JSON files — minimal code change, persistent, no new external dependency

---

## Build Order (Phase Dependencies)

The dependency graph drives phase ordering:

```
Phase 1: Auth Fix (BLOCKER for everything else)
  - proxy.ts must work before instructors can use any protected route
  - Fix: diagnose session cookie issue, fix open redirect, test /api/auth/login end-to-end
  - No external dependencies beyond existing code

Phase 2: Vercel Deployment (BLOCKER for shareable URLs)
  - Needs auth working first (so app is usable in production)
  - Needs storage decision (JSON files won't work on Vercel serverless)
  - Storage fix (Vercel Blob or Apps Script storage) must come before deploy

Phase 3: Chat Banner Editing (independent of Sheets/Forms)
  - Needs auth to protect /api/banner-edit
  - Needs existing banner generation working (already done)
  - New: stateless single-instruction editing via Gemini with image context
  - New: UI panel on /create/config or /l/{id} page (for post-creation editing)

Phase 4: Per-Course Sheets (backend change only)
  - The Next.js side already calls createSheet — just needs Apps Script to implement it
  - Low risk: isolated to Apps Script code
  - Needs sheetId to flow correctly through to register calls (already wired)

Phase 5: Google Forms Feedback
  - Depends on per-course Sheets being stable (same Apps Script)
  - Needs instructorEmail stored in landing JSON (small schema change)
  - Needs instructor-facing UI to trigger form send
```

---

## Patterns to Follow

### Pattern 1: Stateless API Routes for Gemini Calls

**What:** Each API route call to Gemini is fully stateless — no server-side session or chat object stored between requests.
**When:** Banner generation, banner editing.
**Why:** Vercel serverless functions have no persistent memory between requests.

```typescript
// For chat-style editing: client sends current image + instruction, server sends full context to Gemini
export async function POST(req: Request) {
  const { currentBannerBase64, instruction } = await req.json();
  // Full context in single generateContent call
  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [
      { text: instruction },
      { inlineData: { mimeType: "image/png", data: currentBannerBase64 } }
    ]}],
    config: { responseModalities: ["TEXT", "IMAGE"] },
  });
}
```

### Pattern 2: Apps Script as the Google API Gateway

**What:** All Google Workspace operations (Sheets, Forms, auth) go through one Apps Script deployment.
**When:** Any server-side Google API call.
**Why:** Avoids OAuth credential management in Next.js; Apps Script runs as the org account.

```typescript
// Consistent pattern for all Apps Script calls
const result = await fetch(process.env.APPS_SCRIPT_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "actionName", ...data }),
});
```

### Pattern 3: JSON File as Authoritative Landing Store (with migration path)

**What:** Landing data lives in `data/landings/{id}.json`. API reads file first, falls back to Apps Script.
**When:** All landing reads and initial writes.
**Why:** Simple, already working. Migration path: swap the write target to Vercel Blob, keep read logic identical.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Chat History Server-Side

**What:** Keeping a `Map<sessionId, chatHistory>` in memory across Vercel function invocations.
**Why bad:** Serverless functions have no shared memory. Each invocation is isolated. State would be lost.
**Instead:** Client accumulates conversation history array, sends full array with each API request. Keep V1 simpler: stateless single-instruction edits (client sends current image + one instruction).

### Anti-Pattern 2: Reading JSON Files on Vercel Production

**What:** Using `fs.readFile` for landing data on Vercel.
**Why bad:** Vercel serverless has read-only filesystem. Files written at runtime are not persisted.
**Instead:** Use Vercel Blob Storage or switch all reads/writes through Apps Script. The fallback path in `api/landing/[id]/route.ts` already handles the Apps Script fallback correctly.

### Anti-Pattern 3: Adding More Routes to proxy.ts Without Testing

**What:** Adding new paths to PROTECTED_PATHS without verifying the session cookie flows correctly.
**Why bad:** If session verification is broken (current situation), adding more protected paths makes the app unusable for more routes.
**Instead:** Fix and verify auth end-to-end first, then expand protection.

### Anti-Pattern 4: Storing Instructor Email Only in Session

**What:** Relying on the session cookie username to look up instructor email at feedback-send time.
**Why bad:** Session may have expired; no persistent link between landing and instructor.
**Instead:** Store `instructorUsername` (or email) in the landing JSON at creation time, alongside sheetId.

---

## Scalability Considerations

| Concern | At 50 users (target) | At 500 users | At 5000 users |
|---------|---------------------|--------------|----------------|
| Auth (HMAC sessions) | Fine — stateless, no DB | Fine | Fine |
| Gemini API quota | Paid tier handles concurrent calls | Monitor rate limits, add retry with backoff | Queue system needed |
| Landing JSON files | Fine — 50 files | Fine — filesystem scales | Migrate to Blob/KV |
| Apps Script | Single-threaded, may queue | Possible timeout issues | Multiple script deployments or migrate to direct Sheets API |
| Session storage | Stateless cookie — infinite scale | Infinite scale | Infinite scale |

---

## Sources

- [Next.js 16 proxy.ts file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — HIGH confidence, official docs, updated 2026-02-24
- [Next.js 16 Getting Started: Proxy](https://nextjs.org/docs/app/getting-started/proxy) — HIGH confidence
- [Gemini API image generation and multi-turn editing](https://ai.google.dev/gemini-api/docs/image-generation) — HIGH confidence, official docs
- [Google Apps Script Forms Service](https://developers.google.com/apps-script/reference/forms) — HIGH confidence
- [Google Apps Script Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet) — HIGH confidence
- [Next.js middleware Node.js runtime (v15.5 stable)](https://nextjs.org/blog/next-16) — HIGH confidence
