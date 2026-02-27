---
phase: 03-banner-editing
plan: 01
subsystem: api
tags: [gemini, node-vibrant, image-editing, hebrew, inlineData]

# Dependency graph
requires:
  - phase: 02-deploy-storage
    provides: Banner generation pattern via /api/banner using Gemini inlineData
provides:
  - Single-image refinement API endpoint at /api/refine-banner
  - Gemini inlineData editing pattern for per-image refinement
affects:
  - 03-02 (frontend refinement UI that will call this endpoint)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gemini inlineData editing: send image as inlineData part + text instruction in a single user message"
    - "isBanner flag controls prompt strategy: preserve Hebrew text (banner) vs. exclude all text (background)"
    - "Color extraction runs conditionally — only when isBanner=true"

key-files:
  created:
    - landing-next/app/api/refine-banner/route.ts
  modified: []

key-decisions:
  - "Reused extractImageFromResponse and extractColorsFromImage verbatim from /api/banner — no shared module, routes remain self-contained"
  - "Image resolution handles both data URIs and http(s) Vercel Blob URLs via fetch + Buffer.toString('base64')"
  - "Colors returned only when isBanner=true — background refinements skip color extraction to save time"

patterns-established:
  - "Gemini inlineData editing pattern: [{ inlineData: { mimeType, data } }, { text: prompt }] in single user message"
  - "isBanner prompt strategy: banner preserves Hebrew text exactly, background forbids any text"

requirements-completed: [BNRE-01]

# Metrics
duration: 2min
completed: 2026-02-27
---

# Phase 3 Plan 01: Refine Banner API Summary

**Gemini inlineData image-editing endpoint that refines a single banner or background image from a Hebrew instruction, with conditional color extraction via node-vibrant**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-27T14:26:40Z
- **Completed:** 2026-02-27T14:28:20Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `/api/refine-banner` POST endpoint that accepts one image + Hebrew instruction and returns one refined image
- Gemini inlineData editing sends current image and instruction together in a single user message — no conversation history
- Banner refinements preserve all Hebrew text exactly; background refinements explicitly forbid any text
- Color extraction via node-vibrant runs only for banner refinements, returning `{ primary, accent }` in the response

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /api/refine-banner POST route with Gemini inlineData editing** - `7159f82` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `landing-next/app/api/refine-banner/route.ts` - New POST endpoint for single-image refinement; resolves data URI or Blob URL, sends to Gemini as inlineData, returns refined image as base64 data URI with optional colors

## Decisions Made
- Copied `extractImageFromResponse` and `extractColorsFromImage` verbatim from `/api/banner/route.ts` rather than creating a shared module — keeps routes self-contained and avoids import coupling between API routes
- Image resolution supports both `data:` URIs (parsed directly) and `http(s)` URLs (fetched and converted to base64) to handle both formats the frontend may send
- `colors` field omitted from response when `isBanner=false` — background refinements do not drive UI theming, so skipping color extraction saves ~100ms per call

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

- `landing-next/app/api/refine-banner/route.ts` — FOUND
- Commit `7159f82` — FOUND
- `npx next build` succeeded with `/api/refine-banner` listed as dynamic route

## Next Phase Readiness
- Backend endpoint ready for Plan 02 (frontend refinement UI on `/create/config`)
- No blockers — build passes, patterns match existing `/api/banner` structure

---
*Phase: 03-banner-editing*
*Completed: 2026-02-27*
