# Phase 3: Banner Editing - Context

**Gathered:** 2026-02-26
**Updated:** 2026-02-27 (independent refinement clarification)
**Status:** Ready for planning

<domain>
## Phase Boundary

Two-phase image system:

**Phase A — Initial generation (already implemented, DO NOT CHANGE):**
Form → single generation prompt → produces both images together:
- Course Banner (with Hebrew text baked in) — for sharing via WhatsApp
- Landing Page Background (same visual concept, no text) — for Hero section
Both created together to ensure style consistency. If the instructor changes form values and regenerates, both images regenerate together again.

**Phase B — Refinement (NEW — this phase):**
After initial generation is complete and both images exist, the instructor can refine EACH IMAGE INDEPENDENTLY using a short Hebrew instruction. Refinement of one image does NOT regenerate the other. This happens on `/create/config` (Step 2), before the landing page is created.

A download button (already exists on BannerPreview) lets instructors grab the banner for WhatsApp sharing.

</domain>

<decisions>
## Implementation Decisions

### Editing interface
- Refinement UI on the `/create/config` page (Step 2 of course creation), near each image preview
- Available to the instructor during course creation — before the landing page exists
- Each image has its own refinement input — instructor picks which image to edit
- Single input field per image, no conversation history — clean and simple
- Instructor types a short Hebrew instruction, submits, sees preview for that specific image

### Independent refinement (CRITICAL)
- Banner and background are refined INDEPENDENTLY — editing one does NOT affect the other
- Each image has its own refine flow: write instruction → see preview → replace or cancel
- The API endpoint accepts ONE image + instruction and returns ONE refined image
- This is fundamentally different from Phase A (initial generation) which produces both images together

### Refinement flow
- Limited to 3-5 refinement rounds per image (exact number at Claude's discretion)
- Show remaining refinements count to the instructor per image
- "Revert to original" available — restores the image from Phase A (initial generation)
- Reverting does NOT reset the refinement counter
- Loading spinner overlay on the image area while Gemini generates

### Preview & replacement
- New image shows as preview — instructor sees it before committing
- Two actions: **Replace image** (accept the new version) or **Cancel** (discard preview, keep previous)
- Cancelled refinements still count toward the limit (each generation costs API usage)
- On replace: image updates in courseData (state + localStorage) — the "Create Landing Page" button submits the final versions

### Instruction guidance
- Rotating placeholder text in the input field with Hebrew examples (e.g. "תכהה קצת את הרקע", "תוסיף מעט צבע כחול")
- No additional guidance text or tooltip — keep it minimal
- No suggestion chips — placeholder examples are sufficient

### Banner download
- Download button already exists on BannerPreview component (added in quick-2)
- Always downloads the latest accepted banner version
- Key use case: instructors download and share via WhatsApp

### Claude's Discretion
- Exact refinement limit number per image (within 3-5 range)
- Refinement UI layout and positioning on /create/config
- Placeholder example rotation logic
- Loading spinner/shimmer design
- Replace/Cancel button styling

</decisions>

<specifics>
## Specific Ideas

- Instructors download the banner to their phone and share it via WhatsApp — this is the primary distribution channel
- Phase A (initial generation) creates both images together from the same prompt — this ensures visual consistency and must remain unchanged
- Phase B (refinement) edits images independently — the instructor may want to darken only the background, or tweak only the banner text styling, without affecting the other image
- Keep the editing UI minimal — these are instructors, not designers. Simple input, clear feedback.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-banner-editing*
*Context gathered: 2026-02-26*
*Updated: 2026-02-27*
