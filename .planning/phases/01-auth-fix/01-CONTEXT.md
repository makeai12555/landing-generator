# Phase 1: Auth Fix - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Diagnose and fix the broken login/session/route-protection flow. Instructors can log in with username/password (via Google Apps Script + Sheets backend), stay logged in across browser sessions, and be blocked from protected routes when unauthenticated. The login page, session library (HMAC-signed cookies), and proxy-based route protection already exist but are broken.

</domain>

<decisions>
## Implementation Decisions

### Login feedback
- Generic error message on wrong credentials: "שם משתמש או סיסמה שגויים" — does not reveal whether username or password was wrong
- No rate limiting or lockout on failed attempts — small org (50 instructors), low risk, keep it simple
- Server/network errors show a simple Hebrew message: "שגיאה בחיבור לשרת. נסה שוב מאוחר יותר." — no technical details exposed
- On successful login, instant redirect to /create (or the `from` param page) — no toast, no delay

### Claude's Discretion
- Session expiry behavior (what happens when session expires mid-use — silent redirect vs warning)
- Logout button placement and post-logout flow
- Exact protected routes scope (which routes beyond /create need protection)
- Diagnosis of what's currently broken in the auth flow
- Any refactoring needed in proxy.ts, lib/auth.ts, or login API route

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The existing code structure (proxy.ts for route protection, lib/auth.ts for session management, /api/auth/login endpoint) should be preserved and fixed rather than rewritten.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-auth-fix*
*Context gathered: 2026-02-26*
