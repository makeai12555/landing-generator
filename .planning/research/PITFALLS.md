# Pitfalls Research

**Domain:** Hebrew landing page builder (Next.js 16, Google Apps Script backend, Vercel deployment)
**Researched:** 2026-02-26
**Confidence:** HIGH (most findings verified against official docs and source code inspection)

---

## Critical Pitfalls

### Pitfall 1: JSON File Storage Breaks Silently on Vercel

**What goes wrong:**
The app currently writes landing page JSON files to `data/landings/` using `fs.writeFile` with `process.cwd()`. On Vercel, the serverless function filesystem is read-only at runtime. `writeFile` throws `EROFS: read-only file system`. The catch block silently swallows it (`console.error` only), so the API returns `success: true` with a valid `landingId` — but no JSON file was ever saved. The landing page at `/l/[id]` then returns 404.

**Why it happens:**
Vercel serverless functions run on a read-only filesystem. Only `/tmp` is writable, and only within a single function invocation — it does not persist across invocations. The existing code wraps the write in a try/catch that logs and continues, making the failure invisible to the caller.

**How to avoid:**
Replace `data/landings/` file writes with a persistent external store before deploying. Two options:
1. **Vercel KV (Redis)** — `await kv.set(landingId, JSON.stringify(data))` and `await kv.get(id)` — zero infra overhead, fits this use case exactly.
2. **Vercel Blob** — for larger payloads; overkill here.
Do NOT write to `/tmp` as a workaround — data will not survive across requests.

**Warning signs:**
- Landing page creation returns HTTP 200 with a `landingId`, but `/l/[id]` returns 404
- Vercel function logs show `EROFS: read-only file system` errors
- Works perfectly in local dev, breaks only in production (classic symptom)

**Phase to address:**
Phase: Vercel Deployment — this must be solved before the first production deploy. It is a hard blocker.

---

### Pitfall 2: NEXT_PUBLIC_BASE_URL Baked at Build Time

**What goes wrong:**
The banner route constructs logo URLs using `process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"`. In production on Vercel, `NEXT_PUBLIC_*` variables are inlined at build time. If the env var is not set in Vercel's dashboard before the build runs, logo fetches will hit `localhost:3000` from within the serverless function — which fails silently with a `console.warn`, meaning banner generation proceeds without logos.

**Why it happens:**
`NEXT_PUBLIC_` variables are injected during `next build`, not at runtime. A variable missing from the Vercel dashboard at build time will be undefined regardless of what is set afterward. After adding the variable, you must trigger a new deployment for it to take effect.

**How to avoid:**
1. Set `NEXT_PUBLIC_BASE_URL` in the Vercel dashboard (e.g., `https://courseflow-landing.vercel.app`) before the first build.
2. Add a startup assertion: if `NEXT_PUBLIC_BASE_URL` is missing in production, log a loud error at server start.
3. For server-side logo fetching specifically, prefer `NEXT_PUBLIC_BASE_URL` in a non-public server env var (`BASE_URL`) to avoid the baked-at-build-time constraint.

**Warning signs:**
- Logos appear in local dev banners but not in production
- Vercel function logs show `Failed to fetch logo: [name] 404` or connection refused errors
- `NEXT_PUBLIC_BASE_URL` not listed in Vercel project environment variables

**Phase to address:**
Phase: Vercel Deployment — set all env vars in dashboard as first task, verify with a test build.

---

### Pitfall 3: Google Apps Script CORS Blocks Direct Browser Fetch

**What goes wrong:**
Google Apps Script Web Apps do not support the OPTIONS HTTP method. Modern browsers send a CORS preflight OPTIONS request before POST requests that use `Content-Type: application/json`. Apps Script returns an error response to OPTIONS, causing the browser to block the actual POST. This affects the login form if it ever calls Apps Script directly from the browser.

**Why it happens:**
The current architecture correctly routes all Apps Script calls through Next.js API routes (server-to-server, no CORS). But if any future frontend code calls Apps Script directly — for example, a quick client-side registration bypass — it will silently fail in modern browsers.

**How to avoid:**
Never call Apps Script URLs from browser-side code. All Apps Script communication must go through Next.js API routes (`/api/auth/login`, `/api/register`). This is already the current pattern — maintain it strictly. Document this constraint in a code comment in the API routes.

**Warning signs:**
- CORS errors in browser devtools showing `OPTIONS` preflight failing
- Registration or login works in Postman but fails in the browser
- Any `fetch(appsScriptUrl)` call appearing in client-side React components

**Phase to address:**
Phase: Auth Fix — enforce and document the server-side proxy pattern during auth debugging.

---

### Pitfall 4: Gemini iterative Banner Editing Requires Thought Signature Round-Tripping

**What goes wrong:**
The planned chat-style banner editing feature will use multi-turn Gemini conversations. The Gemini image generation API returns a `thoughtSignature` in responses when using native image generation models. If the conversation history is rebuilt from scratch each turn (e.g., only passing the original prompt + new user instruction), the model loses compositional context and may generate a completely different image rather than iteratively refining the existing one.

**Why it happens:**
The model uses the thought signature to reconstruct the "mental model" of what it generated. Without it, each turn is effectively a new generation request with no memory of the previous output.

**How to avoid:**
Use the Google Gen AI SDK's built-in chat session object, which handles thought signature round-tripping automatically. Do not manually reconstruct the messages array. Keep the full model response object (including parts with thought signatures) in the conversation history. Pass the entire history array back with each subsequent turn.

**Warning signs:**
- Banner edits produce completely different images instead of incremental changes
- "Make the background darker" generates a new composition instead of darkening the existing one
- Gemini API errors about missing or invalid thought signatures

**Phase to address:**
Phase: Chat Banner Editing — use `client.chats.create()` from the SDK rather than manual `generateContent` calls with a manually-built history.

---

### Pitfall 5: Apps Script 6-Minute Timeout on Sheet Creation

**What goes wrong:**
Creating a new Google Sheet via Apps Script (`createSheet` action) involves creating a spreadsheet, setting headers, and applying formatting. If the Apps Script function takes longer than 6 minutes (e.g., due to Google's own latency or if more steps are added), it throws a timeout exception. The Next.js API catches this as a generic error and proceeds without a `sheetId`, storing an empty string in the JSON file. Registrations then fail because `sheetId` is missing.

**Why it happens:**
Google Apps Script has a hard 6-minute execution limit for web app invocations. Sheet creation is normally fast (seconds), but at peak load or with complex formatting, it can spike. The current code does catch the error and logs it, but does not surface it to the user or retry.

**How to avoid:**
1. Keep the Apps Script `createSheet` function minimal — create the spreadsheet and set column headers only. Skip all formatting at creation time.
2. Add a retry with exponential backoff in the Next.js API route for the createSheet call.
3. If `sheetId` comes back empty, return an error to the user instead of silently proceeding.

**Warning signs:**
- Landing pages created without a `sheetId` in their JSON (check the data files)
- Registrations for those landings fail with "Missing sheetId"
- Apps Script execution log shows timeout errors

**Phase to address:**
Phase: Per-Course Google Sheets — validate that `sheetId` is non-empty before returning success from create-landing.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| JSON file storage for landing data | Zero infra, works locally | Breaks on Vercel production, no querying capability | Never for production — must migrate before first deploy |
| Random 8-char alphanumeric ID without collision check | Simple to implement | ~0.1% collision at 10K landings, no guarantee of uniqueness | Acceptable at current scale (50 instructors, low volume) |
| No retry logic on Apps Script calls | Simpler code | Intermittent failures cause silent data loss | Acceptable for MVP but add for registration path before launch |
| Swallowing write errors in create-landing | Prevents crash | User gets a landing URL that leads to 404 | Never — fix error propagation immediately |
| Session secret hardcoded assumption | Fast to implement | If `SESSION_SECRET` is missing in prod, all auth silently fails | Never — add startup validation |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Apps Script auth | Passing JSON content-type header triggers CORS preflight, fails browser-side | Call only from Next.js server routes; use `text/plain` only if calling from browser is ever needed |
| Gemini API image generation | Returning only base64 to client and storing it in memory | Base64 image data (~1-3MB) should not be stored in Vercel KV — store in Vercel Blob or as a URL; the current approach of keeping it in-memory as a data URL is fine for display but cannot be persisted |
| Google Sheets registration | Not checking `sheetId` before forwarding registration — if empty, the Apps Script `register` action will fail with a confusing error | Validate `sheetId` exists in the landing JSON before accepting registrations; return a user-friendly error if the sheet was never created |
| Vercel env vars | Setting vars in `.env.local` and expecting them to appear in production | Must set all non-committed vars in Vercel dashboard; `.env.local` is gitignored and only for local dev |
| node-vibrant on Vercel | The library uses native bindings — `node-vibrant/node` import. This requires Node.js runtime, not Edge | Banner route already has `export const runtime = "nodejs"` — do not remove this or color extraction will break |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Parallel Gemini image generation (two calls via `Promise.all`) | Banner endpoint takes 15-30 seconds. Vercel serverless functions have a 60-second timeout by default | Set `maxDuration: 60` in route config; consider increasing Vercel function timeout to max (300s for Pro plan) | Current implementation is fine for MVP; break if timeout hits |
| Vercel function cold start with large dependencies | First request after idle takes 3-8 seconds — Google GenAI SDK + node-vibrant are heavy | Add `export const dynamic = "force-dynamic"` (already done) to prevent static optimization; acceptable tradeoff | At 50 users, cold starts are infrequent and acceptable |
| Google Sheets write on every registration | At 50 concurrent registrations, hits 100 req/100s per-user quota | For 50 instructors total (not 50 concurrent registrations), this is safe; monitor if registration bursts occur | Quota exceeded at ~100 requests per 100 seconds from a single project |
| Large base64 image in API response | Banner response payload is ~2-4MB per request (two images in base64) | Acceptable for current use; if users report slow loading, move to Vercel Blob and return URLs | Fine at current scale |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `SESSION_SECRET` missing in production | If undefined, `getKey()` throws — auth is broken, or if caught, tokens are unsigned | Add a startup check: throw hard if `SESSION_SECRET` is not set in production |
| Passwords passed as plain JSON to Apps Script | If `AUTH_SCRIPT_URL` is ever HTTP (not HTTPS), passwords travel in plaintext | Verify Apps Script URL uses HTTPS (it does by default for deployed web apps); add an assertion |
| Landing pages are publicly readable by ID | Anyone who guesses an 8-char ID can view a landing page | This is intentional for sharing, but registration data should never be returned in the public landing API |
| No rate limiting on `/api/auth/login` | Brute-force attack against the 50-user credential list is trivial | Add a simple in-memory or KV-based rate limiter: max 5 failed attempts per IP per hour |
| Proxy matcher pattern allows `_next/data` bypass | The current matcher `/((?!_next/static|_next/image|favicon.ico|brand).*)` does not exclude `_next/data` — but per Next.js docs, proxy always runs for `_next/data` regardless, so this is fine | Confirm behavior in production; no action needed |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Banner generation takes 15-30 seconds with no progress indicator | Non-technical instructors assume the page is broken and refresh, triggering another expensive Gemini call | Show a step-by-step progress UI: "יוצר רקע...", "מוסיף טקסט...", "מחלץ צבעים..." with a spinner |
| Hebrew text not right-aligned in form inputs | Input fields default to LTR; Hebrew text entered by users appears left-aligned | Add `dir="rtl"` to the `<html>` element AND `dir="rtl"` on all `<input>` and `<textarea>` elements; use Tailwind's `text-right` class |
| Sharing a landing URL before deployment | Instructors copy `localhost:3000/l/xyz` and share it — recipients can't open it | Only show the shareable URL after confirming `NEXT_PUBLIC_BASE_URL` is set to the production domain |
| Login error messages in English | Non-technical Hebrew-speaking instructors see cryptic error messages | All user-facing error strings must be Hebrew; server error fallbacks should be in Hebrew |
| No "copy link" button on landing confirmation | Instructors manually select and copy the URL — error-prone | Add a one-click copy button with visual confirmation ("הועתק!") on the success screen |

---

## "Looks Done But Isn't" Checklist

- [ ] **JSON file storage:** Works in dev but silently fails on Vercel — verify `/l/[id]` returns real data after production deploy
- [ ] **Auth login flow:** Cookie is set but verify `proxy.ts` is actually reading and validating it on protected routes — the PROJECT.md notes "login flow has undiagnosed issues"
- [ ] **Per-course Google Sheet:** `sheetId` may be empty string in JSON if Apps Script call failed — verify by checking a created landing's JSON file
- [ ] **NEXT_PUBLIC_BASE_URL:** Verify it is set in Vercel dashboard AND that logos in banners work in production (not just local)
- [ ] **Vercel function timeout:** Banner generation takes 15-30s — verify `maxDuration` is set high enough in the route config
- [ ] **Hebrew RTL in emails/forms:** Registration form inputs need `dir="rtl"` not just the page wrapper
- [ ] **Session cookie secure flag:** Code sets `secure: process.env.NODE_ENV === "production"` — verify `NODE_ENV` is set to `production` on Vercel (it is by default, but confirm)
- [ ] **Apps Script web app permissions:** Deployed as "Execute as: Me, Who has access: Anyone" — confirm this is set correctly or auth/registration calls will 403

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JSON storage breaks on Vercel | HIGH | Migrate to Vercel KV: install `@vercel/kv`, replace all `readFile`/`writeFile` calls, migrate existing JSON files by uploading them to KV at deployment |
| Landing pages created without sheetId | MEDIUM | Build a one-time migration script that reads all JSON files, finds entries with empty `sheetId`, calls Apps Script to create the missing sheets, updates the JSON |
| SESSION_SECRET missing in production | LOW | Add to Vercel dashboard, redeploy — no data loss since sessions are stateless |
| NEXT_PUBLIC_BASE_URL missing | LOW | Add to Vercel dashboard, redeploy — no data loss |
| Gemini thought signature loss (banner editing) | MEDIUM | Refactor banner editing to use SDK chat sessions instead of manual generateContent calls |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| JSON file storage breaks on Vercel | Phase: Vercel Deployment | Create a landing page in production, verify `/l/[id]` returns data |
| NEXT_PUBLIC_BASE_URL baked at build time | Phase: Vercel Deployment | Check Vercel dashboard for all required env vars before first build |
| Apps Script CORS browser-side | Phase: Auth Fix | Confirm all Apps Script calls are in `/api/` route handlers, not client components |
| Gemini thought signature in iterative editing | Phase: Chat Banner Editing | Test 3+ sequential edit instructions; verify each refines the previous output |
| Apps Script 6-minute timeout on createSheet | Phase: Per-Course Sheets | Verify `sheetId` is non-empty in created landing JSON; add error if missing |
| No rate limiting on login | Phase: Auth Fix | Verify 6 rapid failed logins from same IP are throttled |
| Hebrew RTL in form inputs | Phase: Auth Fix or UI Polish | Test by typing Hebrew in all input fields; check alignment |
| Vercel function timeout for banner | Phase: Vercel Deployment | Set `maxDuration` in banner route; test from production URL |

---

## Sources

- [Next.js proxy.ts official docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — HIGH confidence, fetched directly (v16.1.6, last updated 2026-02-24)
- [Vercel filesystem read-only discussion](https://github.com/vercel/community/discussions/314) — HIGH confidence, confirmed by multiple community reports
- [Vercel JSON file storage discussion](https://github.com/vercel/next.js/discussions/52044) — HIGH confidence, confirmed by official Vercel KB
- [Google Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) — HIGH confidence, fetched directly from official docs
- [Google Sheets API rate limits](https://developers.google.com/workspace/sheets/api/limits) — HIGH confidence, official docs
- [Gemini API image generation docs](https://ai.google.dev/gemini-api/docs/image-generation) — MEDIUM confidence (WebSearch verified against official URL)
- [NEXT_PUBLIC env var pitfalls](https://dev.to/koyablue/the-pitfalls-of-nextpublic-environment-variables-96c) — MEDIUM confidence (multiple community reports agree)
- [Next.js 16 middleware to proxy rename](https://github.com/vercel/next.js/discussions/84842) — HIGH confidence (official GitHub discussion)
- Direct codebase inspection of `proxy.ts`, `lib/auth.ts`, `app/api/create-landing/route.ts`, `app/api/banner/route.ts`, `app/api/register/route.ts` — HIGH confidence

---

*Pitfalls research for: CourseFlow — Hebrew landing page builder with Next.js 16, Google Apps Script, Vercel*
*Researched: 2026-02-26*
