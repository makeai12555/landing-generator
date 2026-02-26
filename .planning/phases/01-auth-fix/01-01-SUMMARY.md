---
phase: 01-auth-fix
plan: 01
subsystem: auth
tags: [hmac, web-crypto, session, cookies, next.js, proxy]

# Dependency graph
requires: []
provides:
  - HMAC-signed session cookie auth (cf_session) using Web Crypto API
  - Route protection via Next.js proxy.ts intercepting all non-public paths
  - Login endpoint delegating credential check to Google Apps Script backend
  - Logout endpoint clearing httpOnly session cookie
  - Login page with sanitized returnTo redirect (open-redirect hardened)
affects: [02-deploy-storage, 03-banner-editing, 04-per-course-sheets, 05-feedback-forms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HMAC session token: create via createSessionToken, verify via verifySessionToken, stored as httpOnly cf_session cookie"
    - "Route protection: proxy.ts export matches /create, /api/* paths, redirects to /login?from=<path> on missing/invalid session"
    - "Login delegation: POST /api/auth/login forwards credentials to AUTH_SCRIPT_URL (Google Apps Script), sets cookie on success"
    - "Open redirect prevention: returnTo sanitized to reject absolute URLs and protocol-relative paths (// prefix)"

key-files:
  created:
    - landing-next/proxy.ts
    - landing-next/lib/auth.ts
    - landing-next/app/api/auth/login/route.ts
    - landing-next/app/api/auth/logout/route.ts
    - landing-next/app/login/page.tsx
    - landing-next/components/ui/LogoutButton.tsx
  modified: []

key-decisions:
  - "proxy.ts (not middleware.ts) is the correct Next.js 16 interception convention — keep this filename"
  - "HMAC signature verification uses base64UrlDecode directly (Uint8Array<ArrayBuffer>), no unsafe cast needed"
  - "returnTo sanitization: only paths starting with / and not // are accepted; all others fall back to /create"
  - "Error messages locked: invalid credentials = 'שם משתמש או סיסמה שגויים', network error = 'שגיאה בחיבור לשרת. נסה שוב מאוחר יותר.'"

patterns-established:
  - "Auth pattern: all protected routes rely on proxy.ts + verifySessionToken — do not add per-route auth checks"
  - "Session cookie: name SESSION_COOKIE_NAME ('cf_session'), httpOnly, path=/, maxAge SESSION_MAX_AGE — use these constants everywhere"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 30min
completed: 2026-02-26
---

# Phase 1 Plan 01: Auth Fix Summary

**HMAC-signed session cookies with Google Apps Script credential delegation, proxy.ts route protection, and hardened open-redirect prevention**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-02-26T11:00:00Z
- **Completed:** 2026-02-26T13:11:15Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- Fixed HMAC verification: removed unsafe `as unknown as ArrayBuffer` cast so `crypto.subtle.verify` receives the correct `Uint8Array<ArrayBuffer>` from `base64UrlDecode`
- Hardened login page open-redirect: `returnTo` now rejects absolute URLs and protocol-relative paths (`//`), falling back to `/create`
- Locked Hebrew error messages to match product decision: network error now says "שגיאה בחיבור לשרת. נסה שוב מאוחר יותר."
- Verified all 8 auth flow checks pass: unauthenticated redirect, 401 on API routes, login creates `cf_session` cookie, logout clears session, open-redirect blocked

## Task Commits

Each task was committed atomically:

1. **Task 1: Diagnose proxy.ts invocation and fix all auth bugs** - `3900f93` (fix)
2. **Task 2: Verify complete auth flow** - human-verified (checkpoint, no code commit)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `landing-next/proxy.ts` - Route protection: matches /create and /api/* paths, redirects unauthenticated users to /login?from=<path>
- `landing-next/lib/auth.ts` - HMAC session token helpers: createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE
- `landing-next/app/api/auth/login/route.ts` - POST login: delegates to AUTH_SCRIPT_URL (Google Apps Script), sets httpOnly cf_session cookie
- `landing-next/app/api/auth/logout/route.ts` - POST logout: clears cf_session cookie, redirects to /login
- `landing-next/app/login/page.tsx` - Login form UI with sanitized returnTo, Hebrew error messages
- `landing-next/components/ui/LogoutButton.tsx` - Client component: POSTs to /api/auth/logout, redirects to /login

## Decisions Made
- proxy.ts is the correct Next.js 16 interception file — kept as-is (not renamed to middleware.ts)
- HMAC: `base64UrlDecode` already returns `Uint8Array<ArrayBuffer>` which satisfies `crypto.subtle.verify` — the `as unknown as ArrayBuffer` cast was wrong and removed
- Error messages locked in Hebrew per product decision — documented in key-decisions above

## Deviations from Plan

None - plan executed exactly as written. All three bug fixes (HMAC type, open redirect, error message) were pre-identified in the research phase and applied as specified.

## Issues Encountered

None. The proxy.ts file was already in the correct location and being invoked by Next.js 16. All three fixes applied cleanly and TypeScript compilation passed without errors.

## User Setup Required

None - no external service configuration required. AUTH_SCRIPT_URL was already set in `.env.local` from prior work.

## Next Phase Readiness
- AUTH-01, AUTH-02, AUTH-03 all verified passing
- Auth foundation is solid — Phase 2 (Deploy + Storage) can proceed
- Note: storage migration from `fs.writeFile` to Vercel Blob is the first blocker for production deployment (silent EROFS failure on Vercel)

## Self-Check: PASSED

- FOUND: .planning/phases/01-auth-fix/01-01-SUMMARY.md
- FOUND: commit 3900f93 (fix - task 1)
- FOUND: landing-next/proxy.ts
- FOUND: landing-next/lib/auth.ts
- FOUND: landing-next/app/api/auth/login/route.ts

---
*Phase: 01-auth-fix*
*Completed: 2026-02-26*
