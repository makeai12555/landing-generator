# Phase 3: Banner Editing - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Instructors can refine the generated images for the course using free-text Hebrew instructions during the course creation flow, before the landing page is deployed.
The editing happens directly in the creation interface, next to the image previews for:
the course banner (shareable image with text), and
the landing page background (hero image without text).
Each image can be refined independently using a simple free-text input.
Edits are intentionally light and stylistically constrained in order to preserve the visual design language of the system.
A download button allows instructors to download the banner image for sharing (for example via WhatsApp)

</domain>

<decisions>
## Implementation Decisions

### Editing interface
-The editing interface appears in the course creation screen, next to the image previews for:
-Course Banner
-Landing Page Background Image
-Each image has its own small free-text input field for refinement.
-The instructor writes a short Hebrew instruction (for example:
"תכהה קצת את הרקע" or "תוסיף מעט צבע כחול"), and submits it.
-The system regenerates the image using the original generation prompt plus the refinement instruction.
-After generation, the instructor sees a preview of the newly generated image and can decide whether to replace the current image.
-If accepted, the new image replaces the existing one. If rejected, the original image remains unchanged.
-There is no conversation history and no chat UI — just a single input field for each image.
-The editing controls are visible only to logged-in instructors during course creation.
-Visitors to the landing page never see these controls.

### Refinement flow
- Limited to 3-5 refinement rounds per course (exact number at Claude's discretion)
- Show remaining refinements count to the instructor
- "Revert to original" button available — restores the first generated banner
- Reverting does NOT reset the refinement counter — total generations count toward the limit
- Loading spinner overlay on the banner area while Gemini generates

### Preview & replacement
-When a refinement is generated, the new image preview temporarily replaces the current image in the preview area so the instructor can see it in context.
-Two simple actions appear near the preview:
-Replace image — confirms the change and saves the new image as the current image.
-Cancel — discards the preview and restores the previous image.
-The replacement happens immediately after confirmation, updating the stored image URL for the course.
-This preview-and-confirm pattern keeps the editing process safe while allowing instructors to experiment with small visual refinements.
-The preview and replacement process works independently for each image:
-Course Banner
-Landing Page Background Image
-Images are not regenerated together. Each image is refined separately so instructors can adjust only the element they want to change.

### Instruction guidance
- Rotating placeholder text in the input field with Hebrew examples (e.g. "תעשה את הרקע כהה יותר")
- No additional guidance text or tooltip — keep it minimal
- No suggestion chips — placeholder examples are sufficient

### Banner download
- A Download Banner button is available next to the banner preview in the course creation interface.
- The button downloads exactly the banner image currently shown in the preview.
- If the instructor has generated a preview but has not accepted it yet, the download still reflects the image currently visible on screen.
- The button downloads exactly the banner image currently shown in the preview.
-Once a new banner is accepted, the download will naturally return that updated version
-Primary use case: instructors download the banner and share it through channels like WhatsApp or social media.

### Claude's Discretion
- Exact refinement limit number (within 3-5 range)
- Chat bubble positioning and animation
- Placeholder example rotation logic
- Loading spinner/shimmer design
- Accept/Reject button styling

</decisions>
 
<specifics>
## Specific Ideas

- Instructors download the banner to their phone and share it via WhatsApp — this is the primary distribution channel
- The system initially generates two images from the same generation JSON/prompt:
Course Banner – a shareable image with Hebrew text baked into the image.
Landing Page Background Image – the same visual concept but without text, used as the hero background on the landing page.
Both images originate from the same base prompt and visual concept to keep the course branding consistent.
After the initial generation, each image can be refined independently using its own free‑text refinement input.
Refining the banner does not automatically regenerate the landing background image, and refining the background does not regenerate the banner. regenerate both to keep them consistent.
- Keep the editing UI minimal — these are instructors, not designers. Simple input, clear feedback.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-banner-editing*
*Context gathered: 2026-02-26*
