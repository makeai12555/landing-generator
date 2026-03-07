---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - landing-next/components/course/BannerPreview.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Download button downloads the currently displayed banner image (refined preview or accepted replacement)"
    - "Download works for both data URI images and remote URL images"
  artifacts:
    - path: "landing-next/components/course/BannerPreview.tsx"
      provides: "Download handler using displayBannerUrl"
      contains: "displayBannerUrl"
  key_links:
    - from: "handleDownload"
      to: "displayBannerUrl"
      via: "uses display URL instead of raw prop"
      pattern: "displayBannerUrl"
---

<objective>
Fix the download banner button so it downloads the currently visible image (refined preview or accepted replacement) instead of always downloading the original banner.

Purpose: Users who refine a banner see the refined version on screen but download the original — confusing and wrong.
Output: Patched BannerPreview.tsx with correct download behavior.
</objective>

<execution_context>
@C:/Users/boede/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/boede/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@landing-next/components/course/BannerPreview.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix handleDownload to use displayBannerUrl</name>
  <files>landing-next/components/course/BannerPreview.tsx</files>
  <action>
In BannerPreview.tsx, the `handleDownload` function (line ~94) currently uses `bannerUrl` (the raw prop — always the original/committed banner). It should use `displayBannerUrl` (which equals `bannerPreview || bannerUrl`, already defined at line ~204).

Two changes needed:

1. **Move `displayBannerUrl` definition above `handleDownload`** — currently it is defined at line 204 (after the handlers). Move the line `const displayBannerUrl = bannerPreview || bannerUrl;` to just before `handleDownload` (around line 93), so it is in scope for the handler. (Note: `bannerPreview` is state declared at line 62, so it is already available.)

2. **Update `handleDownload`** to use `displayBannerUrl` instead of `bannerUrl`:
   - Guard: `if (!displayBannerUrl) return;`
   - data URI branch: `a.href = displayBannerUrl;`
   - fetch branch: `const response = await fetch(displayBannerUrl);`

3. **Update the download button's visibility condition** (line ~249): change `bannerUrl` to `displayBannerUrl` so the download button also appears when a refined preview is showing:
   `{!isLoading && displayBannerUrl && (`

Keep the second `const displayBannerUrl = ...` line at line 204 as-is (it will just be a harmless re-declaration of the same value, or remove it and keep only the earlier one — either approach is fine as long as the JSX still references it correctly). The cleanest approach: define it once, early, before the handlers, and remove the duplicate.

Similarly, keep `const displayBackgroundUrl` where it is (no change needed for background).
  </action>
  <verify>
    <automated>cd C:/Users/boede/projects/courseflow/landing-next && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>handleDownload uses displayBannerUrl. Download button visible during preview. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors in BannerPreview.tsx
- `displayBannerUrl` is defined before `handleDownload` and used inside it
- Download button renders when a refined preview is active
</verification>

<success_criteria>
- The download button downloads whichever banner image is currently displayed (preview or committed)
- No TypeScript compilation errors
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-download-banner-button-always-downlo/3-SUMMARY.md`
</output>
