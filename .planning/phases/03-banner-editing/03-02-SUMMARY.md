---
phase: 03-banner-editing
plan: 02
subsystem: ui
tags: [refinement-ui, hebrew-rtl, react-state, localstorage, gemini]

# Dependency graph
requires:
  - phase: 03-banner-editing
    plan: 01
    provides: /api/refine-banner POST endpoint
provides:
  - Per-image refinement UI on /create/config for banner and background
  - Replace/Cancel/Revert flow with localStorage state persistence
affects:
  - Instructor workflow on /create/config (Step 2 of course creation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-image independent loading overlay — only the image being refined shows spinner"
    - "Preview mode: Gemini result shown temporarily; Replace commits, Cancel discards (both decrement counter)"
    - "Rotating placeholder with setInterval cycling through Hebrew example instructions"
    - "Originals backup in localStorage on first visit to /create/config for revert support"

key-files:
  created: []
  modified:
    - landing-next/components/course/BannerPreview.tsx
    - landing-next/app/create/config/page.tsx

key-decisions:
  - "Counter decrements on both Replace AND Cancel — API call already made, Gemini credit consumed"
  - "Revert does NOT reset counter — instructor already used a generation slot"
  - "onRefinementUsed callback lets BannerPreview signal Cancel to page.tsx without coupling counter state into component"
  - "Originals stored in localStorage (not React state) so they survive page refreshes"
  - "handleBannerReplace also updates theme colors (primary + accent) from Gemini color extraction"

requirements-completed: [BNRE-02]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 3 Plan 02: Per-Image Refinement UI Summary

**Per-image refinement UI on /create/config — instructors independently refine banner and background with Hebrew instructions, preview results, Replace or Cancel, revert to original, with localStorage-backed state persistence**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-27T14:30:15Z
- **Completed:** 2026-02-27T14:32:57Z
- **Tasks:** 1 of 2 complete (Task 2 is human-verify checkpoint)
- **Files modified:** 2

## Accomplishments

- Redesigned `BannerPreview.tsx` with full refinement UI for both banner and background images
- Each image has an independent refinement input (`dir="rtl"`, rotating Hebrew placeholders), loading overlay, and counter
- Preview mode: refined image shown temporarily with "החלף תמונה" (Replace) and "בטל" (Cancel) buttons
- Counter decrements on both Replace and Cancel — API cost is incurred at generation time
- Revert-to-original link appears when current image differs from Phase A original; does NOT reset counter
- `config/page.tsx` manages: originals backup in localStorage, per-image counters (max 4), callbacks for Replace/Revert/Cancel
- On landing creation, `ORIGINALS_KEY` is removed from localStorage (clean up)
- Build passes with no type errors; `/api/refine-banner` route listed as dynamic

## Task Commits

1. **Task 1: Per-image refinement UI — BannerPreview.tsx + config page.tsx** — `67196ab` (feat)

## Files Created/Modified

- `landing-next/components/course/BannerPreview.tsx` — Redesigned with per-image refinement: input field, loading overlay, preview Replace/Cancel, counter display, revert button, rotating Hebrew placeholders
- `landing-next/app/create/config/page.tsx` — Added refinement state management: MAX_REFINEMENTS=4, originals localStorage backup, handleBannerReplace/handleBackgroundReplace/handleBannerRevert/handleBackgroundRevert/handleRefinementUsed callbacks, wired to BannerPreview props

## Decisions Made

- Counter decrements on both Replace and Cancel — generation already happened at submit time, Gemini credit consumed
- Revert to original does NOT reset the counter — instructor used a generation slot regardless of whether they kept the result
- `onRefinementUsed` callback pattern: BannerPreview signals Cancel back to page.tsx to decrement counter without coupling counter state into the component
- Originals stored in localStorage (not React state only) so they survive page refreshes during Step 2 editing session
- `handleBannerReplace` also updates `branding.theme.colors.primary` and `.accent` with colors extracted by Gemini — landing page theming stays in sync with refined banner

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Build passed cleanly on first attempt.

## User Setup Required

None — no new environment variables, no external service configuration.

## Checkpoint Status

Task 2 is `checkpoint:human-verify` — awaiting instructor to verify the complete refinement flow end-to-end before plan is marked complete.

## Self-Check: PASSED

- `landing-next/components/course/BannerPreview.tsx` — FOUND (428 lines, min 80)
- `landing-next/app/create/config/page.tsx` — FOUND (517 lines, min 50)
- Commit `67196ab` — FOUND
- Build succeeded: all routes including `/api/refine-banner` listed

## Next Phase Readiness

- Frontend refinement UI complete — instructors can independently refine banner and background
- Once human verification passes, Phase 3 is complete
- Phase 4 (Google Sheets per course) can begin after checkpoint approval
