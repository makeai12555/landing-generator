# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** An instructor logs in, creates a landing page, shares a URL, and tracks registrations — the complete course marketing loop in one tool.
**Current focus:** Phase 3 — Banner Editing

## Current Position

Phase: 3 of 5 (Banner Editing)
Plan: 2 of 2 in current phase — awaiting checkpoint:human-verify (Task 2)
Status: Phase 3 in progress — Plan 02 Task 1 complete (refinement UI), checkpoint pending
Last activity: 2026-03-07 - Completed quick task 3: Fix download banner button always downloads the original banner instead of the refined version

Progress: [████████░░] 80%

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
| Phase 03-banner-editing P01 | 2 | 1 tasks | 1 files |
| Phase 03-banner-editing P02 | 3 | 1 tasks | 2 files |

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
- [Phase 03-banner-editing]: Reused extractImageFromResponse and extractColorsFromImage verbatim from /api/banner — routes self-contained, no shared module
- [Phase 03-banner-editing]: isBanner flag drives two prompt strategies: banner preserves Hebrew text exactly; background forbids any text
- [Phase 03-banner-editing]: Counter decrements on both Replace AND Cancel — API call already incurred the Gemini cost
- [Phase 03-banner-editing]: Originals backup stored in localStorage (ORIGINALS_KEY) on first /create/config visit — survives page refresh

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
| 2 | Add download button for the banner/flyer | 2026-02-27 | 06b984f | [2-add-download-button-for-the-banner-flyer](./quick/2-add-download-button-for-the-banner-flyer/) |
| 3 | Fix download banner button — always downloaded original instead of current preview | 2026-03-07 | 46fbc22 | [3-fix-download-banner-button-always-downlo](./quick/3-fix-download-banner-button-always-downlo/) |

## Session Continuity

Last session: 2026-03-07
Stopped at: Quick task 3 complete — download button now uses displayBannerUrl
Resume file: None
