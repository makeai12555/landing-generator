# Phase 3: Banner Editing - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Instructors can refine a generated banner DURING course creation (on `/create/config`, Step 2) using free-text Hebrew instructions. The refinement happens before the landing page is created — the instructor perfects the banner, then submits the final version. Both the shareable banner (with text) and the landing page background (without text) are regenerated together. The original banner can be reverted to. A download button (already exists on BannerPreview) lets instructors grab the banner for WhatsApp sharing.

</domain>

<decisions>
## Implementation Decisions

### Editing interface
- Refinement panel on the `/create/config` page (Step 2 of course creation), below or beside the banner preview
- Available to the instructor during course creation — before the landing page exists
- Single input field, no conversation history — clean and simple
- Instructor types a Hebrew instruction, submits, sees refined banner in the BannerPreview

### Refinement flow
- Limited to 3-5 refinement rounds per course (exact number at Claude's discretion)
- Show remaining refinements count to the instructor
- "Revert to original" button available — restores the first generated banner
- Reverting does NOT reset the refinement counter — total generations count toward the limit
- Loading spinner overlay on the banner area while Gemini generates

### Preview & replacement
- New banner shows in-place (replacing current banner visually) with floating Accept/Reject buttons
- Instructor sees the new banner in context before committing
- Rejections still count toward the refinement limit (each generation costs API usage)
- On accept: banner updates in courseData (state + localStorage) — the "Create Landing Page" button submits the final version
- Both images regenerated together (banner with text + background without text) to stay visually consistent

### Instruction guidance
- Rotating placeholder text in the input field with Hebrew examples (e.g. "תעשה את הרקע כהה יותר")
- No additional guidance text or tooltip — keep it minimal
- No suggestion chips — placeholder examples are sufficient

### Banner download
- Download button already exists on BannerPreview component (added in quick-2)
- Always downloads the latest accepted banner version
- Key use case: instructors download and share via WhatsApp

### Claude's Discretion
- Exact refinement limit number (within 3-5 range)
- Refinement panel layout and positioning on /create/config
- Placeholder example rotation logic
- Download button already handled (BannerPreview)
- Loading spinner/shimmer design
- Accept/Reject button styling

</decisions>

<specifics>
## Specific Ideas

- Instructors download the banner to their phone and share it via WhatsApp — this is the primary distribution channel
- The system generates two images from the same prompt: banner (with Hebrew text baked in) for sharing, and background (text-free) for the landing page Hero section. Refinement must regenerate both to keep them consistent.
- Keep the editing UI minimal — these are instructors, not designers. Simple input, clear feedback.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-banner-editing*
*Context gathered: 2026-02-26*
