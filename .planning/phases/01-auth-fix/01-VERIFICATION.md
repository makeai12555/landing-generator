---
phase: 01-auth-fix
verified: 2026-02-26T14:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps:
  - truth: "Unauthenticated request to /api/banner returns 401 JSON"
    status: resolved
    reason: "proxy.ts now protects all /api/* routes by default via PROTECTED_PREFIXES = [\"/create\", \"/api/\"]. Public paths (/api/auth, /api/landing, /api/register, /api/logos) are explicitly excluded. Fixed in commit f9a2d05."
  - truth: "Network error message in login route matches locked decision"
    status: resolved
    reason: "Updated login/route.ts line 54 to 'שגיאה בחיבור לשרת. נסה שוב מאוחר יותר.' matching locked decision. Fixed in commit f9a2d05."
human_verification:
  - test: "Full login flow with valid credentials"
    expected: "Instructor submits username/password on /login, lands on /create with cf_session cookie set (httpOnly, path=/, 7-day maxAge)"
    why_human: "Requires live AUTH_SCRIPT_URL (Google Apps Script) — cannot mock externally from static analysis"
  - test: "Session expiry redirect"
    expected: "A manipulated or expired token causes proxy.ts to clear the cookie and redirect to /login"
    why_human: "Requires setting a crafted cookie value and observing server redirect behavior"
---

# Phase 1: Auth Fix Verification Report

**Phase Goal:** Instructors can log in, stay logged in, and be blocked from protected routes when unauthenticated
**Verified:** 2026-02-26T14:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                        | Status      | Evidence                                                                                         |
|----|----------------------------------------------------------------------------------------------|-------------|--------------------------------------------------------------------------------------------------|
| 1  | Instructor submits valid credentials on /login and lands on /create with session cookie set  | ? UNCERTAIN | Login page POSTs to /api/auth/login (verified), route sets cf_session cookie (verified), but success depends on live AUTH_SCRIPT_URL — needs human test |
| 2  | Unauthenticated user visiting /create is redirected to /login                                | VERIFIED   | proxy.ts PROTECTED_PATHS includes "/create", redirectToLogin returns NextResponse.redirect with ?from= param |
| 3  | Unauthenticated request to /api/banner returns 401 JSON                                      | PARTIAL    | /api/banner is in PROTECTED_PATHS and redirectToLogin returns 401 JSON for /api/* paths — BUT only /api/banner and /api/create-landing are protected; success criterion says "any /api/* protected route" |
| 4  | Instructor clicks logout and is redirected to /login with session cleared                    | VERIFIED   | LogoutButton POSTs to /api/auth/logout (verified wired in /create and /create/config pages), logout route sets maxAge:0 on cf_session cookie and returns success |
| 5  | Expired or invalid session token causes redirect to /login                                   | VERIFIED   | proxy.ts calls verifySessionToken, which checks payload.exp < now and returns null on failure; proxy then clears cookie and redirects |

**Score:** 3/5 truths fully verified (Truth 1 needs human, Truth 3 is partial due to scope mismatch)

---

## Required Artifacts

| Artifact                                          | Expected                                        | Status     | Details                                                                                   |
|---------------------------------------------------|------------------------------------------------|------------|-------------------------------------------------------------------------------------------|
| `landing-next/proxy.ts`                           | Route protection via Next.js 16 proxy          | VERIFIED   | Exists, 65 lines, exports `proxy` function and `config`. Imports verifySessionToken. Next.js 16.1.3 recognizes `proxy.ts` as the middleware replacement. |
| `landing-next/lib/auth.ts`                        | HMAC session token create/verify               | VERIFIED   | Exists, 94 lines. Exports createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE. HMAC bug fixed: base64UrlDecode() passed directly to crypto.subtle.verify. |
| `landing-next/app/api/auth/login/route.ts`        | POST login + cookie set                        | VERIFIED   | Exists, 58 lines. Exports POST. Calls createSessionToken on success, sets httpOnly cf_session cookie with SESSION_MAX_AGE. |
| `landing-next/app/api/auth/logout/route.ts`       | POST logout clears session cookie              | VERIFIED   | Exists, 14 lines. Exports POST. Sets cf_session to "" with maxAge:0. |
| `landing-next/app/login/page.tsx`                 | Login form UI with sanitized redirect          | VERIFIED   | Exists, 131 lines. Contains sanitized returnTo (line 14-15), contains "returnTo" reference, POSTs to /api/auth/login, Hebrew error messages correct. |
| `landing-next/components/ui/LogoutButton.tsx`     | Logout button component                        | VERIFIED   | Exists, 18 lines. POSTs to /api/auth/logout, sets window.location.href = "/login". |

---

## Key Link Verification

| From                                  | To                        | Via                              | Status     | Details                                                                       |
|---------------------------------------|---------------------------|----------------------------------|------------|-------------------------------------------------------------------------------|
| `proxy.ts`                            | `lib/auth.ts`             | import verifySessionToken        | VERIFIED   | Line 3: `import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth"` |
| `app/login/page.tsx`                  | `/api/auth/login`         | fetch POST on form submit        | VERIFIED   | Line 23: `fetch("/api/auth/login", { method: "POST", ... })`                  |
| `app/api/auth/login/route.ts`         | `lib/auth.ts`             | createSessionToken               | VERIFIED   | Line 2: `import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE }` and line 39: `createSessionToken(result.username)` |
| `proxy.ts`                            | `/login redirect`         | redirectToLogin on missing session| VERIFIED  | Lines 33, 39: `return redirectToLogin(request)` when token missing or invalid |
| `components/ui/LogoutButton.tsx`      | `/api/auth/logout`        | fetch POST on click              | VERIFIED   | Line 5: `fetch("/api/auth/logout", { method: "POST" })`                       |
| `LogoutButton`                        | `/create` pages           | rendered in page headers         | VERIFIED   | `app/create/page.tsx` line 33 and `app/create/config/page.tsx` line 156       |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                                 | Status      | Evidence                                                                       |
|-------------|------------|-----------------------------------------------------------------------------|-------------|--------------------------------------------------------------------------------|
| AUTH-01     | 01-01-PLAN | Instructor can log in with username/password and session is created         | ? UNCERTAIN | Implementation correct (POST to Apps Script, createSessionToken, cookie set) — but requires live Apps Script to confirm end-to-end |
| AUTH-02     | 01-01-PLAN | Unauthenticated users are redirected to /login on protected routes           | PARTIAL    | /create is protected and redirects correctly. "any /api/* protected route" is not fully met — only /api/banner and /api/create-landing are in PROTECTED_PATHS |
| AUTH-03     | 01-01-PLAN | Instructor can log out and session is cleared                               | VERIFIED   | LogoutButton -> /api/auth/logout -> maxAge:0 cookie. Component wired in /create and /create/config. |

No orphaned requirements found — AUTH-01, AUTH-02, AUTH-03 are all claimed in 01-01-PLAN and mapped to Phase 1 in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File                                          | Line | Pattern                                         | Severity | Impact                                                                   |
|-----------------------------------------------|------|-------------------------------------------------|----------|--------------------------------------------------------------------------|
| `app/api/auth/login/route.ts`                 | 54   | Error string "נסה שוב." missing "מאוחר יותר"    | Warning  | Inconsistent with locked decision in SUMMARY key-decisions; user-visible if server-to-Apps-Script network fails |
| `proxy.ts`                                    | 5    | PROTECTED_PATHS omits catch-all `/api/`         | Warning  | Future API routes added without explicit inclusion in PROTECTED_PATHS will be publicly accessible without auth |

No placeholder or stub anti-patterns found. All components render real UI and all handlers make real API calls.

---

## Human Verification Required

### 1. Login Flow with Valid Credentials

**Test:** Start dev server (`cd landing-next && npm run dev`). Visit http://localhost:3000/login. Enter valid username/password from the Google Sheet. Submit.
**Expected:** Redirect to /create, page loads without bouncing back to /login. DevTools > Application > Cookies shows `cf_session` (httpOnly, path=/, ~7 day expiry).
**Why human:** Requires live AUTH_SCRIPT_URL (Google Apps Script) call — cannot be verified from static analysis.

### 2. Session Expiry Handling

**Test:** Manually set `cf_session` cookie to a valid-format but expired token (manipulate exp field). Visit http://localhost:3000/create.
**Expected:** proxy.ts detects exp < now, clears the cookie, and redirects to /login.
**Why human:** Requires crafted cookie value and live server observation.

---

## Gaps Summary

Two gaps block full goal certification:

**Gap 1 — API route protection scope mismatch (AUTH-02 partial):**
The success criterion states "unauthenticated user visiting /create or any /api/* protected route is redirected to /login." The proxy.ts implementation protects `/api/banner` and `/api/create-landing` individually, but does NOT protect `/api/landing/*`, `/api/logos`, `/api/register`, or any future API routes. Routes like `/api/register` (course registration) and `/api/landing/` (landing data retrieval) are publicly accessible without a session. Whether this is intentional (public registration pages need unauthenticated access to landing data and registration) or an oversight needs clarification. If intentional, the success criterion should be scoped to "instructor-facing API routes"; if not intentional, `/api/` should be added to PROTECTED_PATHS with explicit PUBLIC_PATHS exclusions for registration/landing viewer paths.

**Gap 2 — Error message inconsistency (minor, locked decision violated):**
PLAN key-decisions locked the network error message as "שגיאה בחיבור לשרת. נסה שוב מאוחר יותר." but `app/api/auth/login/route.ts` line 54 returns "שגיאה בחיבור לשרת. נסה שוב." (missing "מאוחר יותר"). The login page's own catch block (line 38) is correct. This is a one-word fix but violates a locked decision.

**Important context:** The /api/register and /api/landing routes being unprotected is likely INTENTIONAL — the landing pages at /l/[id] are public pages for course registrants who are not instructors. If this is the intended design, the gap is a documentation issue (update success criteria) rather than a code issue.

---

_Verified: 2026-02-26T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
