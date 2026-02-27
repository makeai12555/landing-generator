# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** An instructor logs in, creates a landing page, shares a URL, and tracks registrations — the complete course marketing loop in one tool.
**Current focus:** Phase 3 — Banner Editing

## Current Position

Phase: 3 of 5 (Banner Editing)
Plan: 0 of ? in current phase
Status: Phase 2 complete — production deployed at courseflow-landing.vercel.app
Last activity: 2026-02-27 - Completed quick task 1: Fix course creation form – reset all fields to empty on every open

Progress: [█████░░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 30 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Auth Fix | 1 | 30 min | 30 min |
| 2. Deploy Storage | 2 | 63 min | 31 min |

**Recent Trend:**
- Last 5 plans: 31 min
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Auth scaffolding exists (`proxy.ts`, `lib/auth.ts`, `/login/`, `/api/auth/`) — all bugs fixed and flow verified (Phase 1 complete)
- proxy.ts (not middleware.ts) is the correct Next.js 16 interception convention
- HMAC verification: `base64UrlDecode` returns `Uint8Array<ArrayBuffer>` directly — no unsafe cast to `ArrayBuffer` needed
- returnTo sanitization: only paths starting with `/` and not `//` accepted — others fall back to `/create`
- Error messages locked: "שם משתמש או סיסמה שגויים" (bad creds), "שגיאה בחיבור לשרת. נסה שוב מאוחר יותר." (network error)
- Storage migrated from `fs.writeFile` to `@vercel/blob` — landings and banner images stored as Blob (Phase 2 complete)
- `instructorEmail` field added to LandingPageData and captured from session cookie in create-landing (Phase 2 complete)
- Blob access for landings JSON set to 'public' — required so getLanding() can fetch() without signed token (landing data is intentionally public)
- `getBaseUrl()` helper prefers `VERCEL_PROJECT_PRODUCTION_URL` (Vercel auto-injects) over `NEXT_PUBLIC_BASE_URL`
- Banner route `maxDuration=60` added to prevent Vercel timeout during 15-30s Gemini image generation
- Vercel project `courseflow-landing` connected to `makeai12555/landing-generator` (root `landing-next/`, branch master) — push to master triggers auto-deploy
- Blob store `courseflow-landing-blob` provisioned; BLOB_READ_WRITE_TOKEN auto-injected by Vercel (Phase 2 complete)
- Production verified: /login → 200, /create unauthenticated → redirects to /login, /l/[missing] → 404
- CourseForm clears localStorage on mount (removeItem) — /create always starts with blank form; step-1→step-2 flow preserved via saveToStorage (quick-fix 1)

### Pending Todos

None yet.

### Blockers/Concerns

- Apps Script `createSheet` action status unknown — verify whether it exists before starting Phase 4
- Vercel function timeout for banner route — RESOLVED in Phase 2 (maxDuration=60 set)
- Google Forms API `setPublishSettings` required for forms created after March 31 2026 — must implement in Phase 5 from day one

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix course creation form – reset all fields to empty on every open | 2026-02-27 | a03a4e8 | [1-fix-course-creation-form-reset-all-field](./quick/1-fix-course-creation-form-reset-all-field/) |

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed quick-fix/1 — form reset fix applied, /create always starts blank
Resume file: None
