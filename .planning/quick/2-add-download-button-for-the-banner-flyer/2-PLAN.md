---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - landing-next/components/course/BannerPreview.tsx
autonomous: true
requirements: [QUICK-2]

must_haves:
  truths:
    - "Instructor sees a download button below the banner preview"
    - "Clicking the download button saves the banner as a PNG file to their device"
    - "Download button only appears when a banner image exists (not during loading or empty state)"
  artifacts:
    - path: "landing-next/components/course/BannerPreview.tsx"
      provides: "Banner preview with download button"
      contains: "download"
  key_links:
    - from: "BannerPreview download button"
      to: "bannerUrl prop"
      via: "anchor tag with download attribute or programmatic blob download"
      pattern: "download"
---

<objective>
Add a download button to the BannerPreview component so instructors can save the generated banner/flyer as a PNG file to their device.

Purpose: Instructors need to download the banner to share it on social media, WhatsApp, print, etc. Currently they can only view it.
Output: Updated BannerPreview.tsx with a working download button.
</objective>

<execution_context>
@C:/Users/boede/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/boede/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@landing-next/components/course/BannerPreview.tsx
@landing-next/app/create/config/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add download button to BannerPreview component</name>
  <files>landing-next/components/course/BannerPreview.tsx</files>
  <action>
Add a download button to the BannerPreview component that appears below the banner image only when `bannerUrl` is truthy and `isLoading` is false.

Implementation approach:
- Add a helper function `handleDownload` that handles both data URI and remote URL cases:
  - For data URIs (`data:image/png;base64,...`): create a temporary anchor element, set href to the data URI, set download attribute to `banner.png`, click it programmatically.
  - For remote URLs (Vercel Blob URLs): fetch the image, convert to blob, create an object URL, trigger download via temporary anchor, then revoke the object URL.
- Place the download button right below the banner image div, inside the banner card (the first `bg-white rounded-2xl` div), after the `aspect-[16/9]` container.
- Button styling: use a secondary/outline style consistent with the app — `w-full mt-3 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2 text-sm`.
- Use Material Symbols icon `download` (the app already uses `material-symbols-outlined` class — see config page for examples).
- Button text in Hebrew: "הורד באנר" (Download Banner).
- The component is already `"use client"` so no changes needed for that.
- Do NOT add a download button to the background/hero preview section — only the banner (flyer) section.
  </action>
  <verify>
    <automated>cd C:/Users/boede/projects/courseflow/landing-next && npx tsc --noEmit 2>&1 | head -20</automated>
    <manual>Visit /create, generate a banner, verify download button appears below the banner image. Click it and confirm a PNG file downloads.</manual>
  </verify>
  <done>Download button appears below the banner preview when a banner exists. Clicking it downloads the banner as `banner.png`. Button is hidden during loading and when no banner exists. TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- TypeScript compilation passes with no errors
- BannerPreview renders download button only when bannerUrl is present
- Download works for data URI banners (step 1 flow) and Blob URL banners (if applicable)
</verification>

<success_criteria>
- Instructor can download the generated banner as a PNG file with one click
- Button uses Hebrew text and matches the app's visual style
- No regressions in banner preview display
</success_criteria>

<output>
After completion, create `.planning/quick/2-add-download-button-for-the-banner-flyer/2-SUMMARY.md`
</output>
