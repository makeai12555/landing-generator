---
phase: quick
plan: 3
subsystem: banner-preview
tags: [bug-fix, download, banner, refinement, react]
key-files:
  modified:
    - landing-next/components/course/BannerPreview.tsx
decisions:
  - Move displayBannerUrl definition before handleDownload to make preview URL available to the handler
metrics:
  duration: 5 min
  completed: 2026-03-07
  tasks: 1
  files: 1
---

# Quick Task 3: Fix Download Banner Button Always Downloads Original

## One-liner

Fixed download button to use `displayBannerUrl` (preview-aware) instead of raw `bannerUrl` prop, so users download the currently visible image.

## Problem

When a user refined a banner using the AI refinement UI, the preview image was shown on screen but the download button still downloaded the original `bannerUrl` prop — confusing and incorrect behavior.

**Root cause:** `handleDownload` referenced `bannerUrl` (the raw committed prop), while `displayBannerUrl = bannerPreview || bannerUrl` (the preview-aware URL) was defined later in the file and thus out of scope for the handler.

## Changes Made

### `landing-next/components/course/BannerPreview.tsx`

Three targeted changes:

1. **Moved `displayBannerUrl` definition** from line ~204 (after all handlers) to line ~94 (just before `handleDownload`), so it is in scope.

2. **Updated `handleDownload`** to use `displayBannerUrl` instead of `bannerUrl`:
   - Guard: `if (!displayBannerUrl) return;`
   - data URI branch: `a.href = displayBannerUrl;`
   - fetch branch: `const response = await fetch(displayBannerUrl);`

3. **Updated download button visibility condition** from `bannerUrl` to `displayBannerUrl`, so the button appears when a refined preview is active (even before it's accepted).

4. **Removed duplicate** `const displayBannerUrl = ...` declaration that was originally at line ~204 — now defined only once, early.

## Verification

- TypeScript: `npx tsc --noEmit` passes with zero errors
- `displayBannerUrl` is defined before `handleDownload` and used in all three branches
- Download button is visible during active refined preview

## Commits

| Hash    | Message                                                  |
|---------|----------------------------------------------------------|
| 46fbc22 | fix(quick-3): download banner uses currently displayed image |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `landing-next/components/course/BannerPreview.tsx` modified with correct changes
- [x] Commit 46fbc22 exists
- [x] `displayBannerUrl` defined before `handleDownload` (line 95)
- [x] `handleDownload` uses `displayBannerUrl` in guard and both branches (lines 98, 102, 107)
- [x] Download button condition uses `displayBannerUrl` (line 250)
