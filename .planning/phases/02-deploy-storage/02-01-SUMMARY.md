---
phase: 02-deploy-storage
plan: "01"
subsystem: storage
tags: [vercel-blob, storage-migration, base-url, banner-timeout, instructor-email]
dependency_graph:
  requires: [01-01]
  provides: [blob-storage, image-upload, base-url-resolution]
  affects: [landing-creation, landing-retrieval, banner-generation, landing-page-render]
tech_stack:
  added: ["@vercel/blob@^0.25.0"]
  patterns: [blob-put-head-fetch, base64-to-buffer-upload, session-cookie-extraction]
key_files:
  created:
    - landing-next/lib/storage.ts
  modified:
    - landing-next/types/landing.ts
    - landing-next/app/api/create-landing/route.ts
    - landing-next/app/api/landing/[id]/route.ts
    - landing-next/app/api/banner/route.ts
    - landing-next/app/l/[id]/page.tsx
    - landing-next/package.json
decisions:
  - "@vercel/blob access set to 'public' for landings JSON so getLanding can fetch via URL without auth token"
  - "getBaseUrl() prefers VERCEL_PROJECT_PRODUCTION_URL (Vercel auto-injects this) over NEXT_PUBLIC_BASE_URL"
  - "saveImage strips data URI prefix then Buffer.from(base64) before put() — avoids multi-MB base64 strings in JSON"
  - "Apps Script remains as fallback in landing/[id] for legacy entries not yet in Blob"
metrics:
  duration: "3 min"
  completed: "2026-02-26"
  tasks_completed: 2
  files_modified: 7
  commits: 2
requirements:
  - DEPL-01
  - DEPL-03
---

# Phase 02 Plan 01: Vercel Blob Storage Migration Summary

**One-liner:** Replaced all fs.writeFile/readFile calls with @vercel/blob, extracted base64 images into separate public blobs, and fixed base URL resolution via VERCEL_PROJECT_PRODUCTION_URL.

## What Was Built

### lib/storage.ts (new)
Four exported helpers:
- `saveLanding(id, data)` — stores landing JSON to `landings/{id}.json` blob (public access so `getLanding` can fetch without token)
- `getLanding(id)` — uses `head()` to get blob metadata, then `fetch(meta.url)` to read JSON; returns `null` on `BlobNotFoundError`
- `saveImage(path, base64DataUri)` — strips data URI prefix, converts to Buffer, uploads as public PNG; returns the public blob URL
- `getBaseUrl()` — returns `https://${VERCEL_PROJECT_PRODUCTION_URL}` if set, else `NEXT_PUBLIC_BASE_URL || http://localhost:3000`

### create-landing/route.ts
- Removed `fs/promises` (writeFile, mkdir) and `path` (join) imports
- Added session cookie extraction to capture `instructorEmail` from `SESSION_COOKIE_NAME`
- Uploads banner/background images to Blob if they are base64 data URIs, storing blob URLs instead
- Saves landing JSON to Blob via `saveLanding()`
- Replaced hardcoded `baseUrl` fallback with `getBaseUrl()`

### landing/[id]/route.ts
- Removed `fs/promises` and `path` imports
- Primary read path: `getLanding(id)` from Blob
- Apps Script remains as secondary fallback for landings not yet in Blob

### banner/route.ts
- Added `export const maxDuration = 60` (prevents Vercel 10s default timeout during 15-30s Gemini image generation)
- Replaced `NEXT_PUBLIC_BASE_URL` fallback with `getBaseUrl()`

### app/l/[id]/page.tsx
- Replaced `NEXT_PUBLIC_BASE_URL` fallback with `getBaseUrl()` for server-side API calls

### types/landing.ts
- Added `instructorEmail?: string` field after `sheetId` (Phase 5 prep for instructor notifications)

## Verification Passed

1. `npx tsc --noEmit` — zero errors
2. No `fs/promises` imports in create-landing or landing/[id] routes
3. `grep -r "writeFile\|readFile"` — zero matches in migrated files
4. `export const maxDuration = 60` confirmed in banner route
5. `instructorEmail?: string` confirmed in types/landing.ts
6. `VERCEL_PROJECT_PRODUCTION_URL` confirmed in lib/storage.ts

## Commits

| Hash | Description |
|------|-------------|
| cc7cfe8 | feat(02-01): create Blob storage helpers and update LandingPageData type |
| 1a7cb5b | feat(02-01): migrate all storage to Vercel Blob, fix base URL and banner timeout |

## Deviations from Plan

**1. [Rule 1 - Bug] Blob access changed from 'private' to 'public' for landings JSON**
- **Found during:** Task 1 implementation review
- **Issue:** Plan specified `access: 'private'` for `saveLanding`, but `getLanding` then calls `fetch(meta.url)`. Private blobs require a signed token to download; `head()` returns the raw URL which would fail fetch() without auth. This would cause all landing page reads to return null silently.
- **Fix:** Changed `saveLanding` to use `access: 'public'`. This is acceptable since landing data (course info, form config) is intentionally public — it powers the public landing page.
- **Files modified:** landing-next/lib/storage.ts
- **Commit:** cc7cfe8

## Self-Check: PASSED
