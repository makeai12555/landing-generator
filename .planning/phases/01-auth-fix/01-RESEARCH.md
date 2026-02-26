# Phase 1: Auth Fix - Research

**Researched:** 2026-02-26
**Domain:** Next.js 16 route protection, HMAC session management, Google Apps Script authentication
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Instructor can log in with username/password (via Google Apps Script + Sheets backend) and session is created | Login route exists and is correct; main gap is proxy.ts not being invoked |
| AUTH-02 | Unauthenticated users are redirected to /login when accessing protected routes (/create, /api/*) | proxy.ts has correct logic but is never executed — no middleware.ts wires it in |
| AUTH-03 | Instructor can log out and session is cleared | Logout route exists; LogoutButton component exists; flow is correct |
</phase_requirements>

## Summary

The auth flow was scaffolded but never fully wired up. The single root cause is that `proxy.ts` at project root is never invoked by Next.js 16 — it requires either a `middleware.ts` (Next.js ≤15) or `proxy.ts` with an exported function named `proxy` (Next.js 16+). The existing `proxy.ts` already exports a function named `proxy` — it simply needs to be confirmed as the correct file location and the correct export signature, which it is. However, there is no `middleware.ts` file in the project and the routing never triggers the proxy logic.

Two additional bugs exist that will prevent correct operation even after wiring: (1) a type-unsafe HMAC verification cast in `lib/auth.ts` line 76 that uses `as unknown as ArrayBuffer` instead of `.buffer`, and (2) an open redirect risk via the `from` query parameter that should sanitize to relative paths only. These are minor but should be fixed in the same pass.

The `SESSION_SECRET` and `AUTH_SCRIPT_URL` environment variables are present in `.env.local`, so no environment setup is needed. The login route, logout route, login page UI, and session cookie logic are all structurally correct and do not need to be rewritten — only wired and patched.

**Primary recommendation:** Confirm `proxy.ts` is at project root (it is), verify the exported `proxy` function signature matches Next.js 16 expectations (it does), then fix the two bugs (`ArrayBuffer` cast and open redirect). The auth system will work without a rewrite.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.3 (in use) | Framework, proxy/route-protection via `proxy.ts` | Already installed; `proxy.ts` is the v16 way to protect routes |
| Web Crypto API | Built-in (Node.js) | HMAC-SHA256 session token signing/verification | No dependency, edge-compatible, already used in `lib/auth.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/server NextRequest/NextResponse | 16.1.3 (in use) | Manipulate request/response in proxy.ts | Already used in proxy.ts — no change needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom HMAC session | iron-session or next-auth | More battle-tested, but introduces dependencies; CONTEXT.md says preserve existing structure |
| Custom HMAC session | JWT via jose | More standard format, but same complexity; no reason to migrate in this phase |

**Installation:**
```bash
# No new packages needed — everything uses built-in Next.js + Web Crypto API
```

## Architecture Patterns

### How proxy.ts Works in Next.js 16

Next.js 16 renamed `middleware.ts` → `proxy.ts`. The file must live at the project root (same level as `app/`), export a named function `proxy` (or default export), and optionally export a `config` object with a `matcher`.

**The project already has the correct structure.** `proxy.ts` exists at project root, exports a named `proxy` function, and has a `config.matcher`. The reason it doesn't work is structural (no `middleware.ts` present, but this is correct for Next.js 16 — `proxy.ts` IS the correct file). The actual problem requires investigation to confirm the exact failure mode.

**Key behavioral facts confirmed by official docs (Next.js 16.1.6, verified 2026-02-24):**
- `proxy.ts` runs on Node.js runtime (not Edge) — confirmed in official docs
- `proxy` function receives `NextRequest`, must return `NextResponse` or allow passthrough via `NextResponse.next()`
- Cookies read via `request.cookies.get(name)?.value` — matches current implementation
- Config `matcher` excludes `_next/static`, `_next/image`, `favicon.ico` — current matcher covers `brand` but not all static assets

### Pattern 1: Route Protection in proxy.ts
**What:** Intercept all requests, check session cookie, redirect unauthenticated users
**When to use:** Protecting pages and API routes before they render

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
// Current implementation in proxy.ts — already correct pattern
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return redirectToLogin(request);

  const session = await verifySessionToken(token);
  if (!session) {
    const response = redirectToLogin(request);
    response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }
  return NextResponse.next();
}
```

### Pattern 2: HMAC Session Token Verification
**What:** Verify HMAC-SHA256 signed payload; correct ArrayBuffer usage
**When to use:** verifySessionToken in lib/auth.ts

```typescript
// Source: MDN Web Crypto API / verified pattern
// Fix for lib/auth.ts line 76 — use .buffer not `as unknown as ArrayBuffer`
const valid = await crypto.subtle.verify(
  "HMAC",
  key,
  base64UrlDecode(signatureStr).buffer,  // .buffer gives the underlying ArrayBuffer
  encoder.encode(payloadStr)
);
```

### Pattern 3: Open Redirect Prevention
**What:** Sanitize the `from` redirect parameter to only allow relative paths
**When to use:** redirectToLogin() and login success handler

```typescript
// In proxy.ts redirectToLogin — sanitize `from` param
function sanitizeFrom(from: string | null): string {
  if (!from) return "/create";
  // Only allow paths starting with / (relative), block protocol-relative and absolute URLs
  if (from.startsWith("/") && !from.startsWith("//")) return from;
  return "/create";
}
```

### Pattern 4: Session Expiry — Silent Redirect (Claude's Discretion recommendation)
**What:** When session expires mid-use, silently redirect to login with `from` param
**Why recommended:** Matches the no-toast, instant-redirect decision for login success; consistent UX; small org with low complexity

The proxy already handles this: expired tokens fail `verifySessionToken`, which redirects with `?from=<current-path>`. After re-login, user lands back at their page. No additional UI work needed.

### Recommended Project Structure
```
landing-next/
├── proxy.ts              # Route protection (Next.js 16 equivalent of middleware)
├── lib/
│   └── auth.ts           # HMAC session token create/verify
├── app/
│   ├── login/page.tsx    # Login UI (exists, correct)
│   └── api/auth/
│       ├── login/route.ts   # Auth against Apps Script (exists)
│       └── logout/route.ts  # Clear session cookie (exists)
└── components/ui/
    └── LogoutButton.tsx   # POST /api/auth/logout + redirect (exists)
```

### Anti-Patterns to Avoid
- **Importing non-edge-safe modules in proxy.ts:** The current `proxy.ts` imports from `@/lib/auth` which uses Web Crypto API. This is fine because Next.js 16 proxy runs on Node.js runtime. Do NOT add heavy Node.js modules.
- **Redirecting to absolute URLs from `from` param:** An unvalidated `from` param allows redirecting users to external sites after login. Must sanitize to relative paths only.
- **Using `middleware.ts` in Next.js 16:** The file convention changed. `proxy.ts` is correct for this project's version. Do not rename to middleware.ts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie creation | Custom cookie serialization | `res.cookies.set()` from NextResponse | Already used correctly in login route |
| HMAC signing | Manual crypto | Web Crypto API (`crypto.subtle`) | Already used; just fix the ArrayBuffer cast |
| Route matching | Manual path string checks | Config `matcher` + `startsWith` guards | Current approach is correct for this use case |

**Key insight:** The auth infrastructure is complete and correct at the design level. The work is diagnostic patching, not building.

## Common Pitfalls

### Pitfall 1: proxy.ts Not Being Invoked
**What goes wrong:** Route protection silently does nothing — protected pages are accessible without authentication
**Why it happens:** In Next.js 16, if the `proxy.ts` file does not export the correct function name (`proxy` as named or default), it is ignored. Also, if the file is in a wrong location (`src/proxy.ts` vs root `proxy.ts` when `src/` is not being used), it won't run.
**How to avoid:** Verify the file is at `landing-next/proxy.ts` (project root, same level as `app/`) and exports `export async function proxy(request: NextRequest)`. Run `npm run dev` and check if `/create` redirects when cookie is absent.
**Warning signs:** Visiting `/create` without a session cookie loads the page instead of redirecting to `/login`

### Pitfall 2: HMAC Uint8Array vs ArrayBuffer Type Cast
**What goes wrong:** `crypto.subtle.verify()` receives a Uint8Array cast as ArrayBuffer. The cast `as unknown as ArrayBuffer` works in most runtimes because Uint8Array has a `.buffer` property, but is type-unsafe and could fail in strict runtime environments.
**Why it happens:** `base64UrlDecode` returns `Uint8Array`, but `crypto.subtle.verify` signature expects `ArrayBufferView | ArrayBuffer`. `Uint8Array` IS an `ArrayBufferView`, so passing it directly (without cast) is actually valid — or use `.buffer` for explicit ArrayBuffer.
**How to avoid:** Change `new Uint8Array(base64UrlDecode(signatureStr)) as unknown as ArrayBuffer` to `base64UrlDecode(signatureStr).buffer` OR simply pass `base64UrlDecode(signatureStr)` directly (Uint8Array implements ArrayBufferView which is valid for SubtleCrypto).
**Warning signs:** Intermittent session verification failures, TypeScript errors in strict mode

### Pitfall 3: Open Redirect via `from` Query Parameter
**What goes wrong:** After login, `router.push(returnTo)` in login page uses the `from` param verbatim. A crafted URL like `/login?from=https://evil.com` redirects the user off-site after login.
**Why it happens:** The `from` param is set by proxy.ts using `request.nextUrl.pathname` (pathname only, not full URL) so in normal flow it's safe. But a manually crafted URL could bypass this.
**How to avoid:** In the login page, validate `returnTo` starts with `/` and does not start with `//` before using it.
**Warning signs:** External redirect after login

### Pitfall 4: Cookie Not Set in Development (httpOnly nuance)
**What goes wrong:** The cookie is set with `secure: process.env.NODE_ENV === "production"`, meaning in development `secure` is `false`. This is correct behavior for `http://localhost`. If tested over HTTPS in dev, it works too. No action needed.
**Why it happens:** Not a bug — intentional per the existing implementation.
**Warning signs:** N/A — this is expected

### Pitfall 5: Login success redirects before cookie is readable
**What goes wrong:** `router.push(returnTo)` immediately after a successful login response. The cookie is set by the server in the response headers, and Next.js router.push triggers a client-side navigation. If the browser hasn't processed the Set-Cookie header yet, the proxy check on the next page load might not see the cookie.
**Why it happens:** The login page calls `router.push(returnTo)` followed by `router.refresh()`. The `router.refresh()` re-fetches server components after the cookie is set. The sequence should work.
**How to avoid:** Keep `router.push(returnTo)` followed by `router.refresh()` — current implementation is correct. If issues arise, use `window.location.href = returnTo` (full page reload guarantees cookie is read).
**Warning signs:** Redirect to /create immediately bounces back to /login (cookie not yet visible to proxy)

## Code Examples

### Correct proxy.ts export signature (Next.js 16)
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
// Landing-next/proxy.ts — current export is correct
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] }
```

### Fixed HMAC verification (lib/auth.ts line 76)
```typescript
// Source: MDN SubtleCrypto.verify() — ArrayBufferView is accepted directly
// Option A: pass Uint8Array directly (ArrayBufferView is valid)
const valid = await crypto.subtle.verify(
  "HMAC",
  key,
  base64UrlDecode(signatureStr),  // Uint8Array implements ArrayBufferView
  encoder.encode(payloadStr)
);

// Option B: use .buffer explicitly
const valid = await crypto.subtle.verify(
  "HMAC",
  key,
  base64UrlDecode(signatureStr).buffer,
  encoder.encode(payloadStr)
);
```

### Sanitized `from` redirect in login page
```typescript
// In app/login/page.tsx
const raw = searchParams.get("from") || "/create";
const returnTo = (raw.startsWith("/") && !raw.startsWith("//")) ? raw : "/create";
```

### Logout flow (current LogoutButton.tsx — already correct)
```typescript
// Source: landing-next/components/ui/LogoutButton.tsx
const handleLogout = async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";  // full reload clears any client state
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts | proxy.ts | Next.js v16.0.0 | File rename + function rename; behavior identical |
| Edge runtime default | Node.js runtime default | Next.js v15.5.0 (stable) | More Node.js APIs available in proxy |

**Deprecated/outdated:**
- `middleware.ts`: Deprecated in Next.js 16, replaced by `proxy.ts`. For this project on Next.js 16.1.3, `proxy.ts` is the correct convention — do not create middleware.ts.

## Open Questions

1. **Is proxy.ts actually running at all?**
   - What we know: File exists at correct location, correct export name, correct config — structurally valid
   - What's unclear: Whether Next.js 16.1.3 is actually picking it up (the root cause of "auth is broken" could be an entirely different failure)
   - Recommendation: First task in the plan should be a diagnostic — add a `console.log` to proxy.ts and visit `/create`, then check server logs to confirm proxy runs. If it doesn't log, the problem is the file itself. If it logs but still allows access, the issue is in the logic.

2. **Does the Apps Script `authenticate` action work?**
   - What we know: `AUTH_SCRIPT_URL` is set in `.env.local`. Login route calls it with `action: "authenticate"`.
   - What's unclear: Whether the Apps Script actually has an `authenticate` action deployed and returns `{ success: true, username: "..." }`
   - Recommendation: Test the Apps Script endpoint directly (curl or browser) before assuming the login flow is broken at the Next.js layer.

3. **Which routes need protection beyond /create?**
   - What we know: Current PROTECTED_PATHS = `["/create", "/api/banner", "/api/create-landing"]`
   - What's unclear: Whether `/api/register` should be protected (it's a public registration endpoint — probably should remain public) and whether `/create/config` is covered by `/create` prefix match (yes, it is)
   - Recommendation: Keep current PROTECTED_PATHS as-is — the pattern `/create` covers `/create/config` because of `startsWith`. `/api/register` is intentionally public (registrants don't log in).

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy — Official Next.js 16.1.6 proxy.ts docs (verified 2026-02-24, version stamp confirmed)
- https://nextjs.org/blog/next-16 — Next.js 16 release notes confirming middleware → proxy rename
- MDN SubtleCrypto.verify() — ArrayBufferView type accepted for signature parameter

### Secondary (MEDIUM confidence)
- Codebase inspection: `landing-next/proxy.ts`, `landing-next/lib/auth.ts`, `landing-next/app/api/auth/login/route.ts`, `landing-next/app/api/auth/logout/route.ts`, `landing-next/app/login/page.tsx`, `landing-next/components/ui/LogoutButton.tsx` — direct code review
- `.planning/codebase/CONCERNS.md` — pre-existing codebase analysis documenting the Uint8Array bug and open redirect risk

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; verified existing Next.js 16 is the correct version
- Architecture: HIGH — official docs confirm proxy.ts location, export name, and runtime
- Pitfalls: HIGH for pitfalls 1-3 (code inspection confirmed); MEDIUM for pitfalls 4-5 (reasoned from behavior)

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable Next.js API, 30-day validity)
