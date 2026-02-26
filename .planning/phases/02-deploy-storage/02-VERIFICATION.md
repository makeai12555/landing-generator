---
phase: 02-deploy-storage
verified: 2026-02-26T00:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Create a landing page in production and revisit the URL"
    expected: "Page renders with correct content on second visit (confirms Blob persistence end-to-end)"
    why_human: "Cannot call the authenticated /create flow programmatically; requires browser session + Gemini invocation"
  - test: "Share a landing page URL with an unauthenticated browser session"
    expected: "Page renders without redirecting to /login"
    why_human: "Proxy.ts public-route logic cannot be verified by grep alone; requires live session test"
  - test: "Confirm banner images appear correctly in production (no missing logos)"
    expected: "Banner image in /l/[id] shows org logos overlaid on the banner background"
    why_human: "Requires live Gemini call and Blob image URL resolution in a real browser"
---

# Phase 2: Deploy + Storage Verification Report

**Phase Goal:** The app runs on a stable production Vercel URL where all created landing pages persist across requests
**Verified:** 2026-02-26
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Landing JSON is stored in Vercel Blob, not the filesystem | VERIFIED | `storage.ts` exports `saveLanding` using `@vercel/blob` `put()`; `create-landing/route.ts` calls `saveLanding(landingId, localLandingData)` with zero `fs/promises` imports remaining |
| 2 | Banner images are stored as separate public blobs, not base64 inside JSON | VERIFIED | `create-landing/route.ts` lines 118-126 detect `data:image/` URIs and call `saveImage()`, which calls `put()` with `access: "public"`, returning a blob URL stored in `localLandingData.assets` |
| 3 | Landing page reads work via Vercel Blob `head()` + `fetch()` | VERIFIED | `storage.ts` `getLanding()` calls `head()` for metadata then `fetch(meta.url)`; `landing/[id]/route.ts` calls `getLanding(id)` as the primary path with Apps Script fallback |
| 4 | Base URL resolves correctly on Vercel using `VERCEL_PROJECT_PRODUCTION_URL` | VERIFIED | `storage.ts` `getBaseUrl()` prefers `process.env.VERCEL_PROJECT_PRODUCTION_URL`; consumed in `banner/route.ts`, `l/[id]/page.tsx`, and `create-landing/route.ts` |
| 5 | Banner route has `maxDuration=60` to avoid timeout | VERIFIED | `banner/route.ts` line 3: `export const maxDuration = 60;` |
| 6 | `instructorEmail` is captured from session and saved in landing JSON | VERIFIED | `create-landing/route.ts` lines 77-83 extract the token from `SESSION_COOKIE_NAME`, call `verifySessionToken()`, and assign `session.username` to `instructorEmail`; field present in `localLandingData` and `LandingPageData` type |

**Score:** 6/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `landing-next/lib/storage.ts` | Blob storage helpers: `saveLanding`, `getLanding`, `saveImage`, `getBaseUrl` | VERIFIED | All four functions exported; substantive implementations using `@vercel/blob` `put`/`head`/`BlobNotFoundError` |
| `landing-next/app/api/create-landing/route.ts` | Landing creation with Blob storage and image upload | VERIFIED | Imports `saveLanding`, `saveImage`, `getBaseUrl` from `@/lib/storage`; calls all three; no `fs/promises` imports |
| `landing-next/app/api/landing/[id]/route.ts` | Landing retrieval from Blob store | VERIFIED | Imports `getLanding` from `@/lib/storage`; calls it as primary path before Apps Script fallback; no `fs/promises` imports |
| `landing-next/types/landing.ts` | `LandingPageData` with `instructorEmail` field | VERIFIED | `instructorEmail?: string` field at line 39, after `sheetId` |
| `landing-next/app/api/banner/route.ts` | `maxDuration=60` and `getBaseUrl()` usage | VERIFIED | `export const maxDuration = 60` at line 3; imports `getBaseUrl` from `@/lib/storage`; used in logo URL construction |
| `landing-next/app/l/[id]/page.tsx` | `getBaseUrl()` for server-side fetch | VERIFIED | Imports `getBaseUrl` from `@/lib/storage`; called at line 12 inside `getLandingData()` |
| `landing-next/.gitignore` | `.vercel` and `data/landings/` entries | VERIFIED | `.vercel` at line 37; `/data/landings/` at line 44 |
| `landing-next/package.json` | `@vercel/blob` dependency | VERIFIED | `"@vercel/blob": "^2.3.0"` present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `create-landing/route.ts` | `lib/storage.ts` | `saveLanding()` and `saveImage()` calls | WIRED | Both functions imported and called with actual arguments |
| `landing/[id]/route.ts` | `lib/storage.ts` | `getLanding()` call | WIRED | Function imported and called; return value used to build response |
| `l/[id]/page.tsx` | `VERCEL_PROJECT_PRODUCTION_URL` | `getBaseUrl()` from `lib/storage` | WIRED | `getBaseUrl()` imported and called; result used in `fetch()` call |
| `banner/route.ts` | `lib/storage.ts` | `getBaseUrl()` for logo URL construction | WIRED | Imported and used in logo fetch block |
| GitHub master branch | Vercel auto-deploy | Git integration | WIRED | Commits `cc7cfe8`, `1a7cb5b`, `208883d` confirmed in git log; SUMMARY documents Vercel connected to `makeai12555/landing-generator` branch `master` root `landing-next/` |
| Vercel project | Blob store | `BLOB_READ_WRITE_TOKEN` env var | WIRED | Confirmed via SUMMARY: Blob store `courseflow-landing-blob` provisioned, token auto-injected; production URL returns 200 (live evidence) |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| DEPL-01 | 02-01-PLAN.md | Landing data persists on Vercel (migrate from fs.writeFile to Vercel Blob) | SATISFIED | `storage.ts` with `saveLanding`/`getLanding` using `@vercel/blob`; no `fs/promises` calls remain in any route |
| DEPL-02 | 02-02-PLAN.md | App is deployed on Vercel with all env vars configured | SATISFIED | `curl https://courseflow-landing.vercel.app/login` returns HTTP 200; SUMMARY confirms all env vars set (SESSION_SECRET, AUTH_SCRIPT_URL, GEMINI_API_KEY, APPS_SCRIPT_URL, GEMINI_IMAGE_MODEL, BLOB_READ_WRITE_TOKEN) |
| DEPL-03 | 02-01-PLAN.md + 02-02-PLAN.md | Instructors can share production URLs to landing pages | SATISFIED | `/l/[id]` is not protected by `proxy.ts` (public route); `curl https://courseflow-landing.vercel.app/l/nonexistent-id-test` returns 404 (not 302 to /login), confirming public access; landing JSON stored in public Blob |

No orphaned requirements: REQUIREMENTS.md maps DEPL-01, DEPL-02, DEPL-03 to Phase 2. All three claimed by plans 02-01 and 02-02 respectively.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `create-landing/route.ts` | 60-61 | `console.log(JSON.stringify(courseData, ...))` | Info | Logs full course payload in production; not a blocker |
| `create-landing/route.ts` | 86-113 | `createSheet` call (Apps Script) outside Phase 2 scope | Info | Phase 4 concern already present; not a blocker for Phase 2 goal |

No blockers or warnings found. The `console.log` statements are operational logging, not placeholder implementations.

---

## Human Verification Required

### 1. Full End-to-End Landing Persistence

**Test:** Log in to https://courseflow-landing.vercel.app, create a course through the two-step flow, wait for banner generation, and note the returned `/l/[id]` URL. Close the browser tab. Reopen the URL in a new incognito window.
**Expected:** The landing page renders with the course title, description, and banner image — no 404.
**Why human:** Requires an authenticated Gemini invocation and Vercel Blob write; cannot be reproduced by static analysis.

### 2. Unauthenticated Landing Page Access

**Test:** In an incognito window (no session cookie), visit a known landing page URL `https://courseflow-landing.vercel.app/l/[id]`.
**Expected:** Page renders normally — no redirect to `/login`.
**Why human:** `proxy.ts` public-route exclusion logic requires a live request to confirm the pattern match works correctly.

### 3. Banner Image Rendering

**Test:** Create a landing page with a logo. On the resulting `/l/[id]` page, verify the banner image loads (no broken image icon) and the background hero image is visible.
**Expected:** Both images load from `https://*.vercel-storage.com/...` URLs (Vercel Blob CDN), not `data:image/` URIs.
**Why human:** Requires live Gemini API call and Blob URL resolution in a browser.

---

## Gaps Summary

No gaps. All six plan-defined must-have truths are verified against the actual codebase:

- `lib/storage.ts` is substantive and exports all four required functions.
- Both API routes (`create-landing`, `landing/[id]`) are fully migrated — zero `fs/promises` imports remain.
- `banner/route.ts` has `maxDuration = 60` and uses `getBaseUrl()`.
- `l/[id]/page.tsx` uses `getBaseUrl()` for server-side fetching.
- `LandingPageData` type includes `instructorEmail?: string`.
- `.gitignore` excludes `.vercel` and `data/landings/`.
- `@vercel/blob` is in `package.json`.
- Production URL `https://courseflow-landing.vercel.app/login` returns HTTP 200.
- `/l/nonexistent-id-test` returns HTTP 404 (not a login redirect), confirming public route access.

Three items are flagged for human verification due to requirements that need a live browser session and Gemini API invocation, but these are quality/integration checks — not code-level gaps.

---

_Verified: 2026-02-26_
_Verifier: Claude (gsd-verifier)_
