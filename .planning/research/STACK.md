# Stack Research

**Domain:** Hebrew course landing page builder — existing Next.js app adding auth, Google integrations, Vercel deployment
**Researched:** 2026-02-26
**Confidence:** HIGH (most findings verified against official Next.js docs and official Google API docs)

---

## Critical Pre-Finding: JSON File Storage Will Break on Vercel

**This is the highest-priority stack issue.** The app currently uses `fs.writeFile` to persist landing pages as JSON files in `data/landings/`. Vercel's serverless functions run on a read-only filesystem. Any write to `data/landings/*.json` via an API route will throw `EROFS: read-only file system` in production.

**This must be resolved before deployment.** See the "What NOT to Use" section and storage decision below.

Confidence: HIGH — Verified via Vercel official documentation and multiple community reports.

---

## Recommended Stack

### Core Technologies (Already Installed — No Changes Needed)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.3 | Full-stack framework | Already in use. `proxy.ts` is the Next.js 16 pattern (replaces deprecated `middleware.ts`) — the app is already correct. Node.js runtime means no Edge restrictions. |
| React | 19.2.3 | UI rendering | Already in use. React 19.2 with Server Actions is the Next.js 16 pattern for forms/auth. |
| TypeScript | ^5 | Type safety | Already in use. No changes needed. |
| Tailwind CSS | ^4 | Styling | Already in use. |
| `@google/genai` | ^1.38.0 | Gemini banner generation | Already in use. Do NOT upgrade or swap — `gemini-3-pro-image-preview` is on paid tier. |

### Session Management

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `jose` | ^6.1.3 | JWT signing/verification in `proxy.ts` | Official Next.js docs recommend `jose` over the custom HMAC implementation currently used. `jose` handles JWT properly, is Edge-compatible, and the current custom `lib/auth.ts` has a subtle token format (`.`-separated HMAC not standard JWT) that makes debugging harder. However: **the current implementation works** — upgrading to `jose` is a polish step, not a blocker. If jose v6, use v6.1.3+ (v6.0.0–v6.0.3 had Edge Runtime breakage). |

**Decision:** Keep existing `lib/auth.ts` custom HMAC session for now (it works and is already connected). Migrate to `jose` only if debugging session issues.

### Storage — MUST CHANGE for Vercel Deployment

| Solution | Purpose | Why |
|----------|---------|-----|
| **Vercel Blob** (`@vercel/blob`) | Replace `fs.writeFile` for landing JSON storage | Vercel's serverless filesystem is read-only. Vercel Blob is S3-compatible object storage, free tier covers this use case (1 GB free), and the API is a simple drop-in: `put(filename, content)` → `get(url)`. It integrates directly with the existing Vercel team account. |

**What to change:** In `app/api/create-landing/route.ts`, replace:
```typescript
// BREAKS ON VERCEL
await writeFile(filePath, JSON.stringify(localLandingData, null, 2));
```
With:
```typescript
import { put } from "@vercel/blob";
const { url } = await put(`landings/${landingId}.json`, JSON.stringify(localLandingData), { access: "public" });
```
And in `/l/[id]/page.tsx`, replace `fs.readFile` with `fetch(blobUrl)`.

### Google APIs

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| `googleapis` | ^171.4.0 | Google Sheets + Google Forms API | Official Google client library. Handles OAuth2 / Service Account auth. Covers both Sheets v4 (for per-course sheet creation) and Forms v1 (for feedback form creation). One package, both APIs. Use Service Account auth with `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` env vars — no user OAuth flow needed since all sheets are owned by the org account. |

**Alternative considered:** `google-spreadsheet` (v5.2.0) — cleaner DX for Sheets only, but doesn't cover Forms. Since we need both APIs, use `googleapis` directly to avoid two packages.

### Google Forms API — Critical Note

The Google Forms API requires explicit `setPublishSettings` call for forms created **after March 31, 2026**. Forms created via API will default to draft/unpublished state. Since the deadline is ~1 month away, implement `setPublishSettings` from day one to avoid a breakage on April 1.

Required OAuth scope for creating forms: `https://www.googleapis.com/auth/forms.body`

The intended use is sending feedback forms to instructors at course end — **not** collecting student registrations (that's already handled by the landing page). The Forms API is well-suited for creating a templated feedback form per course and generating a pre-fill URL.

### Development / Deployment Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vercel CLI | Deploy, manage env vars | `vercel env pull .env.local` pulls production env vars to local. Use `vercel --prod` for production deploys. |
| `@vercel/blob` SDK | Blob read/write | Install: `npm install @vercel/blob`. Needs `BLOB_READ_WRITE_TOKEN` env var (auto-set on Vercel, set manually for local dev via `vercel env pull`). |

---

## Installation

```bash
# New dependencies needed
npm install googleapis @vercel/blob

# jose only if migrating session (optional, current custom HMAC works)
npm install jose
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `googleapis` | `google-spreadsheet` | If Forms API is dropped from scope — `google-spreadsheet` has much better DX for Sheets-only work. |
| `@vercel/blob` | Supabase Storage, Cloudflare R2, AWS S3 | If cost or vendor lock-in becomes a concern at scale. Vercel Blob free tier is sufficient for this project. |
| `@vercel/blob` | Upstash Redis (JSON store) | If low-latency reads matter more than storage cost. Not needed at this scale (<100 landings). |
| Keep custom HMAC in `lib/auth.ts` | `jose` JWT library | Migrate to `jose` if the current session system has bugs or needs refresh token support. The custom implementation is functionally correct for the current use case. |
| Service Account auth (googleapis) | OAuth2 user auth | Service Account is correct here — all sheets are in the org account. OAuth2 user flow would require each instructor to grant access, which is unnecessary. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `fs.writeFile` / `fs.readFile` in API routes (for persistent data) | Vercel's serverless functions have a read-only filesystem. Writes to `data/landings/*.json` will fail with `EROFS` in production. `/tmp` is writable but ephemeral — data is lost between requests. | `@vercel/blob` for landing JSON persistence |
| `middleware.ts` (Next.js 15 name) | Deprecated in Next.js 16. The app already correctly uses `proxy.ts` — do not rename back. `middleware.ts` still works but will be removed in a future version. | `proxy.ts` (already in place) |
| `jsonwebtoken` npm package | Relies on Node.js `crypto` module, not compatible with the Proxy/Middleware Edge Runtime. Would break if the auth check is ever moved to Edge. | `jose` (Edge-compatible) — or keep custom HMAC which uses Web Crypto API |
| `next-auth` / `Auth.js` | Heavy abstraction for a simple username/password + Google Sheets backend. Adds OAuth infrastructure the project explicitly doesn't want. | Keep custom auth: `lib/auth.ts` + `app/api/auth/login/route.ts` + `proxy.ts` |
| Supabase for user management | PROJECT CONSTRAINT: auth backend must stay as Google Apps Script + Google Sheets. Adding Supabase would duplicate the user store. | Existing Google Apps Script at `AUTH_SCRIPT_URL` |
| Google Forms for student registration | The landing page already has a registration form. Mixing two registration systems creates confusion. | Keep existing registration form in `/l/[id]` — Google Forms is for instructor feedback ONLY. |

---

## Stack Patterns by Variant

**For the auth fix (login flow debugging):**
- The existing pattern is correct: `POST /api/auth/login` → calls Apps Script → sets httpOnly cookie via `createSessionToken`
- `proxy.ts` reads the cookie and blocks protected routes
- If login isn't working, the issue is likely: (1) `AUTH_SCRIPT_URL` env var not set, (2) Apps Script not handling `action: "authenticate"` POST correctly, or (3) CORS on the Apps Script. Debug these before touching the code.

**For Google Sheets per-course:**
- The `create-landing` route already calls `action: "createSheet"` on the Apps Script — but if the Apps Script doesn't implement it, it silently fails (sheetId stays empty). Two implementation paths:
  1. **Extend the Apps Script** (no new npm packages): Add `createSheet` action to the existing script. Simpler, keeps all Google account operations in one place.
  2. **googleapis Service Account** (new npm package): Call Sheets API directly from Next.js with a Service Account. More reliable, no dependency on Apps Script correctness.
- **Recommendation:** Path 2 (googleapis) because the Apps Script approach has already silently failed (sheetId is empty in existing landings). Direct API access is more debuggable.

**For chat-style banner editing:**
- No new packages needed. Use the existing `@google/genai` SDK with a new API route (`/api/banner/refine`).
- State: store current banner URL and conversation history in component state. Send to API route, get new banner URL back.

**For Vercel deployment:**
- Run `vercel --prod` from `landing-next/` directory
- Set all env vars via Vercel dashboard (not committed to git): `SESSION_SECRET`, `AUTH_SCRIPT_URL`, `GEMINI_API_KEY`, `APPS_SCRIPT_URL`, `NEXT_PUBLIC_BASE_URL`, `BLOB_READ_WRITE_TOKEN` (auto-added by Blob integration)
- The `NEXT_PUBLIC_BASE_URL` must be set to the Vercel production URL (e.g., `https://courseflow-landing.vercel.app`) for landing page URLs to work correctly.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `next@16.1.3` | `react@19.2.3`, `react-dom@19.2.3` | Already installed and matched correctly. |
| `googleapis@^171` | Node.js 20.9+ | Next.js 16 requires Node.js 20.9+ — compatible. |
| `@vercel/blob` latest | Next.js 16, Node.js 20+ | No known compatibility issues. |
| `jose@^6.1.3` | Next.js 16, Node.js 20+, Edge Runtime | Use 6.1.3+; versions 6.0.0–6.0.3 have Edge Runtime breakage (`process.getBuiltinModule` error). |

---

## Sources

- **Next.js 16 official blog** (`nextjs.org/blog/next-16`) — Confirmed `proxy.ts` is the correct Next.js 16 pattern, runs on Node.js runtime, `middleware.ts` deprecated. HIGH confidence.
- **Next.js authentication guide** (`nextjs.org/docs/app/guides/authentication`, version 16.1.6, updated 2026-02-24) — Recommends `jose` for session encryption, `cookies()` API for setting httpOnly session cookies. HIGH confidence.
- **Vercel Blob docs** (`vercel.com/docs/vercel-blob`) + community reports — Confirmed `fs.writeFile` fails on Vercel serverless; Vercel Blob is the recommended replacement. HIGH confidence.
- **googleapis npm** (`npmjs.com`) — Latest version 171.4.0 (published ~19 days ago). HIGH confidence.
- **Google Forms API docs** (`developers.google.com/workspace/forms/api`) — Confirmed programmatic form creation, `setPublishSettings` required after March 31 2026. HIGH confidence.
- **Google Forms API limits** (`developers.google.com/workspace/forms/api/limits`) — Write limit: 375 req/min per project, 150/min per user. Well within this app's needs. HIGH confidence.
- **jose npm changelog** — v6.1.3 latest, v6.0.0–6.0.3 had Edge Runtime bug fixed in v6.0.4. MEDIUM confidence (npm search result, not directly fetched).

---

*Stack research for: CourseFlow — Hebrew landing page builder (Next.js 16 feature additions)*
*Researched: 2026-02-26*
