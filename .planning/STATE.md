# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** An instructor logs in, creates a landing page, shares a URL, and tracks registrations — the complete course marketing loop in one tool.
**Current focus:** Phase 1 — Auth Fix

## Current Position

Phase: 1 of 5 (Auth Fix)
Plan: 1 of 1 in current phase
Status: Phase 1 complete — ready for Phase 2
Last activity: 2026-02-26 — Phase 1 Auth Fix plan 01 complete

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 30 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Auth Fix | 1 | 30 min | 30 min |

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
- Storage must be migrated from `fs.writeFile` to `@vercel/kv` or `@vercel/blob` before deploying to Vercel (silent EROFS failure)
- `instructorEmail` schema field needs to be added during Phase 2 landing creation to avoid a later migration for Phase 5

### Pending Todos

None yet.

### Blockers/Concerns

- Apps Script `createSheet` action status unknown — verify whether it exists before starting Phase 4
- Vercel function timeout for banner route must be set high enough (banner gen takes 15-30s) — address in Phase 2
- Google Forms API `setPublishSettings` required for forms created after March 31 2026 — must implement in Phase 5 from day one

## Session Continuity

Last session: 2026-02-26
Stopped at: Completed 01-auth-fix/01-01-PLAN.md — Phase 1 Auth Fix done, ready for Phase 2
Resume file: None
