# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** An instructor logs in, creates a landing page, shares a URL, and tracks registrations — the complete course marketing loop in one tool.
**Current focus:** Phase 2 — Deploy Storage

## Current Position

Phase: 2 of 5 (Deploy Storage)
Plan: 1 of 1 in current phase
Status: Phase 2 Plan 1 complete — Blob storage migration done
Last activity: 2026-02-26 — Phase 2 Deploy Storage plan 01 complete

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 30 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Auth Fix | 1 | 30 min | 30 min |
| 2. Deploy Storage | 1 | 3 min | 3 min |

**Recent Trend:**
- Last 5 plans: 30 min
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

### Pending Todos

None yet.

### Blockers/Concerns

- Apps Script `createSheet` action status unknown — verify whether it exists before starting Phase 4
- Vercel function timeout for banner route — RESOLVED in Phase 2 (maxDuration=60 set)
- Google Forms API `setPublishSettings` required for forms created after March 31 2026 — must implement in Phase 5 from day one

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 02-deploy-storage/02-01-PLAN.md — Phase 2 Deploy Storage done, Blob migration complete
Resume file: None
