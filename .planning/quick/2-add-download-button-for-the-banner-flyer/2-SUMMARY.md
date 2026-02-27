---
phase: quick
plan: 2
subsystem: banner-preview
tags: [download, ui, banner, flyer]
dependency_graph:
  requires: []
  provides: [banner-download]
  affects: [BannerPreview]
tech_stack:
  added: []
  patterns: [blob-download, data-uri-download]
key_files:
  created: []
  modified:
    - landing-next/components/course/BannerPreview.tsx
decisions:
  - Used fetch+blob approach for remote URLs to handle cross-origin download reliably
  - Button visibility gated on `!isLoading && bannerUrl` — hidden during generation and when no banner exists
metrics:
  duration: 8 min
  completed: 2026-02-27
---

# Quick Task 2: Add Download Button for the Banner/Flyer — Summary

**One-liner:** Download button added to BannerPreview using anchor+blob for remote URLs and direct data URI for base64 banners, with Hebrew label and outline style matching the app.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add download button to BannerPreview component | 06b984f | landing-next/components/course/BannerPreview.tsx |

## What Was Built

Added a `handleDownload` async function and a download button to the `BannerPreview` component:

- **Data URI banners** (step-1 flow where Gemini returns base64): creates a temporary `<a>` element, sets `href` to the data URI and `download="banner.png"`, then clicks it.
- **Remote URL banners** (Vercel Blob URLs): fetches the image, creates a `Blob`, generates an object URL via `URL.createObjectURL`, triggers download, then revokes the object URL to avoid memory leaks.
- Button is rendered only when `!isLoading && bannerUrl` — it does not appear during banner generation or when no banner exists.
- Styling: `w-full mt-3 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium` — consistent with secondary/outline style in the app.
- Icon: `material-symbols-outlined` `download` icon (18px), matching existing icon usage in the app.
- Hebrew label: "הורד באנר".
- Placed inside the banner card div, directly below the `aspect-[16/9]` container — not in the background/hero preview section.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `landing-next/components/course/BannerPreview.tsx` modified and contains download button
- [x] TypeScript compiles without errors (`npx tsc --noEmit` — no output)
- [x] Commit 06b984f exists
