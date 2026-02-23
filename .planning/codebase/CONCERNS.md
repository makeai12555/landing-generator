# Codebase Concerns

**Analysis Date:** 2026-02-23

## Tech Debt

**Weak Landing ID Generation:**
- Issue: Uses weak Math.random()-based ID generation with only lowercase letters/numbers. Only 8 characters means potential for ID collisions in high-volume scenarios.
- Files: `landing-next/app/api/create-landing/route.ts` (lines 44-50)
- Impact: Non-cryptographic ID generation could allow ID prediction or collisions. Landing pages may be overwritten or accessed by guessing IDs.
- Fix approach: Replace with `crypto.randomUUID()` or a cryptographically secure random function. Consider using slug-safe base32 encoding for shorter human-readable IDs (12+ chars).

**Hardcoded Fixed Model Selection:**
- Issue: Gemini image model is hardcoded with fallback to paid tier model (`gemini-3-pro-image-preview`) that free tier has zero quota for. Previous commit notes indicate free tier models produce bad quality.
- Files: `landing-next/app/api/banner/route.ts` (line 10)
- Impact: Paid API calls will fail silently, then fallback to fetch from Apps Script. Unpredictable banner generation behavior depending on API quotas.
- Fix approach: Implement runtime environment variable for model selection with validation. Add explicit fallback logic for quota exhaustion. Consider caching response to avoid repeated failed calls.

**Dangerous dangerouslySetInnerHTML for CSS:**
- Issue: Uses `dangerouslySetInnerHTML` to inject theme colors into CSS. Color values are extracted from images but not validated as hex format before injection.
- Files: `landing-next/app/l/[id]/page.tsx` (lines 72-81)
- Impact: Malformed color values could break CSS parsing. If color extraction fails, fallback colors are used, but no validation exists.
- Fix approach: Add color validation in `adjustColor()` and extracted color handling. Use CSS.supports() to validate before injection, or use CSS variables with fallback values instead.

**No Input Validation on Course Data:**
- Issue: Course details (title, description, location, etc.) are accepted and passed directly to Gemini prompts without sanitization or length validation.
- Files: `landing-next/app/api/banner/route.ts` (lines 197-320), `landing-next/components/course/CourseForm.tsx` (validation at line 120-139)
- Impact: Prompt injection risk. Long inputs could exceed Gemini's token limits. HTML/special chars in course titles could break Gemini prompt parsing.
- Fix approach: Add max-length validation for all course fields. Sanitize special characters in prompts. Add escape/quote handling for Hebrew text in prompts.

**Incomplete Error Recovery in Banner Generation:**
- Issue: If image extraction fails, the function returns null gracefully but client shows generic error. No retry mechanism exists.
- Files: `landing-next/app/api/banner/route.ts` (lines 63-92, 238-240)
- Impact: Transient API failures cause entire landing creation to fail. Users lose form progress (banner cleared on request).
- Fix approach: Implement exponential backoff retry logic. Preserve banner URL on transient failures. Add queue for failed banner generation jobs.

**Landing Data Storage Without Backup Strategy:**
- Issue: Landing pages saved as JSON files locally (fallback to Apps Script). No backup, no versioning, no atomic writes. File corruption risk on simultaneous writes.
- Files: `landing-next/app/api/create-landing/route.ts` (lines 140-148), `landing-next/app/api/landing/[id]/route.ts` (lines 13-20)
- Impact: Concurrent landing page creations could corrupt files. Data loss if filesystem fails. No recovery mechanism.
- Fix approach: Implement atomic write with temp file + rename. Add JSON schema validation on read. Consider versioned backups or database storage instead of filesystem.

**Session Token Secret Management:**
- Issue: SESSION_SECRET must be set as environment variable but no documentation or validation on minimum entropy. Token expiry is fixed at 7 days with no refresh mechanism.
- Files: `landing-next/lib/auth.ts` (line 34)
- Impact: Weak secrets compromise all user sessions. Leaked secrets can't be rotated without invalidating all sessions. No session revocation mechanism.
- Fix approach: Document SESSION_SECRET requirements (min 32 bytes). Add session refresh tokens. Implement session revocation endpoint. Consider JWT key rotation strategy.

**Data Persistence Across Form Steps:**
- Issue: All course data stored in browser localStorage. Data not synced to backend until final landing creation. Step 1 and Step 2 changes aren't persisted anywhere.
- Files: `landing-next/components/course/CourseForm.tsx` (line 10, 21-37), `landing-next/app/create/config/page.tsx` (line 11)
- Impact: Browser cache clear or tab close loses all progress. No recovery mechanism. Step-by-step progress not trackable by backend.
- Fix approach: Add auto-save to backend after each step. Implement draft landing endpoints. Add recovery mechanism on page reload to fetch latest draft.

---

## Known Bugs

**SVG Logos Not Supported in Banner Generation:**
- Symptoms: SVG logos are filtered out before sending to Gemini, but users aren't told why logos aren't appearing.
- Files: `landing-next/app/api/banner/route.ts` (lines 323-325)
- Trigger: Upload SVG logo, generate banner, logo doesn't appear in banner.
- Workaround: Users must convert SVG to PNG/JPEG before upload. Error message should explain this.

**Subtitle Truncation at 80 Characters:**
- Symptoms: Course description in banner subtitle is sliced to 80 chars, causing incomplete text.
- Files: `landing-next/components/course/CourseForm.tsx` (line 168)
- Trigger: Course description longer than 80 characters.
- Workaround: Manually write short descriptions or check banner preview. This truncation isn't mentioned in UI.

**Form Validation Doesn't Check Banner Generation:**
- Symptoms: User can proceed to step 2 without generating a banner. Creates landing page without banner if banner generation was skipped.
- Files: `landing-next/components/course/CourseForm.tsx` (line 240), `landing-next/app/create/config/page.tsx` (line 113)
- Trigger: Fill form, click "Next Step" without clicking "Generate Banner".
- Workaround: Require banner generation before proceeding. Current flow allows banner-less landings.

**Color Extraction Fallback on Failure:**
- Symptoms: If node-vibrant fails to extract colors, fallback colors are used but user isn't notified. Creates landing with wrong brand colors.
- Files: `landing-next/app/api/banner/route.ts` (lines 172-175)
- Trigger: Corrupted image data from Gemini or image format incompatible with node-vibrant.
- Workaround: Extraction usually succeeds, but failures are silent. No visual feedback to user.

---

## Security Considerations

**Open Registration Endpoints:**
- Risk: `/api/register` accepts any `sheetId` value without validation. Could write registrations to arbitrary Google Sheets if sheetId enumeration is possible.
- Files: `landing-next/app/api/register/route.ts` (lines 11-21)
- Current mitigation: Relies on sheetId being non-guessable (Google Sheets uses long UUID-like IDs).
- Recommendations: Add whitelist of valid sheetIds per landing. Validate sheetId format and ownership before forwarding to Apps Script. Implement rate limiting on registration endpoint.

**XSS Risk via Landing Page Images:**
- Risk: Background images and banners are data URIs stored in landing JSON and rendered directly in `<img src>`. If data corruption occurs, malicious data could be injected.
- Files: `landing-next/app/l/[id]/page.tsx` (lines 89-90)
- Current mitigation: Images come from Gemini API (trusted source). Local JSON files could be corrupted.
- Recommendations: Validate base64 image format before saving. Implement CSP headers to restrict image sources. Consider serving images from static directory instead of data URIs.

**No CORS Protection:**
- Risk: Landing page endpoints are public. CORS headers not configured, allowing any domain to fetch landing data or register.
- Files: `landing-next/app/api/landing/[id]/route.ts`, `landing-next/app/api/register/route.ts`
- Current mitigation: None.
- Recommendations: Add CORS headers restricting to same-origin only. Implement rate limiting. Add CSRF tokens for state-changing operations.

**Session Cookie Vulnerability:**
- Risk: Session token stored in cookie without Secure/HttpOnly flags (not visible in route.ts but likely missing in middleware configuration).
- Files: `landing-next/lib/auth.ts`, `landing-next/proxy.ts`
- Current mitigation: Token verification is cryptographically sound, but cookie transport isn't.
- Recommendations: Ensure cookies are set with Secure/HttpOnly/SameSite=Strict flags. Add CSRFProtection middleware. Document cookie policy.

**No Input Length Limits:**
- Risk: Course title, description, and form inputs have no max-length constraints. Could cause buffer issues in Gemini API or Apps Script.
- Files: `landing-next/components/course/CourseForm.tsx` (form inputs), `landing-next/app/api/banner/route.ts` (prompt building)
- Current mitigation: Browser input type="text" has natural limits, but no server-side validation.
- Recommendations: Add max-length validation on server. Implement request size limits. Add Gemini token counting before API call.

---

## Performance Bottlenecks

**Parallel Banner Generation:**
- Problem: Banner and hero background generated in parallel via Promise.all(), but both hit same Gemini API endpoint with rate limits.
- Files: `landing-next/app/api/banner/route.ts` (lines 443-446)
- Cause: Gemini API has request/minute limits. Parallel requests could trigger rate limiting.
- Improvement path: Implement request queue with backoff. Generate hero background as fallback/optional. Cache banner results to avoid re-generation on retry.

**No Caching Strategy:**
- Problem: Banner generation requested every time user clicks button, no caching of Gemini responses.
- Files: `landing-next/components/course/CourseForm.tsx` (line 162)
- Cause: Each design preference change clears cache, but re-clicking with same prefs regenerates.
- Improvement path: Cache banner in-memory indexed by course title + design hash. Add 1-hour TTL. Implement "Use Previous Banner" option.

**Logo Fetching Sequential:**
- Problem: Each logo fetched in a for loop. If 4 logos requested, 4 sequential HTTP requests to fetch them before Gemini call.
- Files: `landing-next/app/api/banner/route.ts` (lines 416-438)
- Cause: Logo fetching not parallelized.
- Improvement path: Use Promise.all() for logo fetches. Add timeout per fetch. Implement retry logic per logo.

**localStorage I/O on Every Field Change:**
- Problem: Every input change triggers full course data JSON stringify/save to localStorage.
- Files: `landing-next/components/course/CourseForm.tsx` (line 36)
- Cause: saveToStorage callback called on every field update.
- Improvement path: Debounce localStorage writes. Batch updates. Consider IndexedDB for larger data.

---

## Fragile Areas

**Gemini API Model Dependency:**
- Files: `landing-next/app/api/banner/route.ts`
- Why fragile: Relies on specific Gemini model behavior for Hebrew text rendering, multi-logo placement, and text styling. Model changes break layout/typography.
- Safe modification: Test banner output with different course titles/descriptions. Add integration tests for banner quality. Monitor Gemini model version.
- Test coverage: No automated tests for banner generation. Manual testing only.

**Google Fonts Loading:**
- Files: `landing-next/app/l/[id]/page.tsx` (lines 67-69)
- Why fragile: Hardcoded preconnect to googleapis.com and fonts.gstatic.com. If CDN changes or is blocked, font loading fails silently.
- Safe modification: Add fallback font loading. Implement font preloading with rel="preload". Test with slow network conditions.
- Test coverage: No tests for font loading failures.

**JSON.parse Without Schema Validation:**
- Files: `landing-next/app/api/create-landing/route.ts` (line 56), `landing-next/app/api/landing/[id]/route.ts` (line 15)
- Why fragile: Landing JSON parsed directly without schema validation. Corrupted files or outdated schema cause crashes.
- Safe modification: Add Zod/io-ts schema validation on read. Implement migration logic for schema changes.
- Test coverage: No tests for corrupted JSON handling.

**Color Extraction Dependency on node-vibrant:**
- Files: `landing-next/app/api/banner/route.ts` (lines 156-176)
- Why fragile: node-vibrant might fail on certain image types or corrupted buffers. Fallback colors are hardcoded and may not match banner.
- Safe modification: Add image format validation before passing to vibrant. Implement multiple color extraction strategies (fallback to dominant color from image histogram).
- Test coverage: No tests for color extraction failures with different image types.

**Middleware Authentication on Dynamic Routes:**
- Files: `landing-next/proxy.ts`
- Why fragile: Whitelist-based public paths. Any new endpoint must be manually added to PUBLIC_PATHS or it becomes protected.
- Safe modification: Use pattern matching instead of hardcoded paths. Implement route-level auth decorators. Test all new routes for correct protection level.
- Test coverage: No automated tests for path protection rules.

---

## Scaling Limits

**Browser localStorage Storage Limit:**
- Current capacity: ~5-10MB in modern browsers
- Limit: If storing large base64-encoded images (banner + background) in courseData, can hit limits quickly with multiple drafts.
- Scaling path: Implement server-side draft storage instead of localStorage. Use IndexedDB for larger capacity. Clean old drafts automatically.

**JSON File Storage for Landings:**
- Current capacity: Filesystem limits (typically 256 char filename = 8-char ID is fine, but total files in `data/landings/` directory could grow large).
- Limit: Directory with 1M+ files becomes slow to list/index. No sharding or archival mechanism.
- Scaling path: Migrate to database (PostgreSQL/MongoDB). Implement archival for old landings. Use S3-like storage for images instead of data URIs.

**Gemini API Quota:**
- Current capacity: Depends on API tier and rate limits.
- Limit: Each landing creation requires 2 Gemini calls (banner + background). Free tier quotas are 0 for paid models (gemini-3-pro-image).
- Scaling path: Implement request queue with backoff. Add fallback to free tier model (gemini-2.5-flash) or template-based fallback. Monitor quota usage.

**Google Sheets Registration Scaling:**
- Current capacity: Each course gets dedicated sheet created via Apps Script.
- Limit: Apps Script quota limits (quota resets daily, limited concurrent executions).
- Scaling path: Implement batch registration writes. Cache sheet creation requests. Consider migrating registrations to database.

---

## Dependencies at Risk

**@google/genai ^1.38.0:**
- Risk: Major version locked to 1.x. SDK API could change in major version without backwards compatibility. Breaking changes in image generation.
- Impact: Future versions might require code refactoring. Gemini model names/APIs could change.
- Migration plan: Pin exact version for stability. Monitor release notes. Create abstraction layer for Gemini calls to isolate from SDK changes.

**node-vibrant ^4.0.4:**
- Risk: Unmaintained or low-activity package. Color extraction algorithm might not work with modern image formats from AI-generated images.
- Impact: Color extraction failures could become more common as Gemini generates different image types.
- Migration plan: Consider alternative: `get-image-colors` or `dominant-color-lib`. Implement fallback color detection using canvas-based histogram if vibrant fails.

---

## Missing Critical Features

**No User Authentication Recovery:**
- Problem: If session expires, user loses all in-progress form data. No "save draft" mechanism or email recovery.
- Blocks: Large forms/multi-step flows. Users can't resume interrupted workflows.
- Impact: High abandonment rate on course creation if session expires during long banner generation wait.

**No Landing Page Version History:**
- Problem: Once landing created, edits overwrite previous version with no audit trail. Can't revert to previous banner/colors.
- Blocks: A/B testing landing pages. Accidental changes can't be undone.
- Impact: Users trapped with bad landing designs with no recovery option.

**No Bulk Course Creation:**
- Problem: Must create courses one-by-one. No CSV import or batch API.
- Blocks: Organizations with 10+ courses can't bulk onboard.
- Impact: Limits adoption for large training organizations.

**No Analytics Integration:**
- Problem: Landing pages generate registrations but no tracking of views, click-through rate, or conversion metrics.
- Blocks: Course creators can't measure landing page effectiveness.
- Impact: Users have no data-driven way to improve landing pages.

---

## Test Coverage Gaps

**Banner Generation Integration:**
- What's not tested: Gemini API responses, image extraction, color extraction, prompt generation for different course types.
- Files: `landing-next/app/api/banner/route.ts`
- Risk: Silent failures in banner generation could leave landings without visual assets. Prompt injection or token limit issues undetected.
- Priority: High

**Authentication Flow:**
- What's not tested: Session token creation, verification, expiration, invalid tokens, missing secrets.
- Files: `landing-next/lib/auth.ts`, `landing-next/proxy.ts`
- Risk: Auth bugs could allow unauthorized access or session hijacking.
- Priority: High

**Landing Page Data Persistence:**
- What's not tested: localStorage corruption, concurrent writes, JSON parsing errors, schema mismatches.
- Files: `landing-next/components/course/CourseForm.tsx`, `landing-next/app/api/landing/[id]/route.ts`
- Risk: Data loss or corruption in form flow and landing retrieval.
- Priority: High

**Form Validation:**
- What's not tested: Empty/null fields, max-length validation, special character handling, Hebrew text edge cases.
- Files: `landing-next/components/course/CourseForm.tsx` (validateForm function)
- Risk: Invalid data reaches Gemini API, causing prompt injection or token limit errors.
- Priority: Medium

**Color Extraction Edge Cases:**
- What's not tested: Monochrome images, corrupted image data, unusual image formats, edge cases where vibrant returns null.
- Files: `landing-next/app/api/banner/route.ts` (extractColorsFromImage)
- Risk: Default fallback colors don't match generated banner, causing visual inconsistency.
- Priority: Medium

**Registration Form Submission:**
- What's not tested: Network failures, invalid sheetId, Apps Script timeouts, malformed form data.
- Files: `landing-next/components/landing/RegistrationForm.tsx`, `landing-next/app/api/register/route.ts`
- Risk: Registrations lost or corrupted if submission fails. No error recovery.
- Priority: Medium

---

*Concerns audit: 2026-02-23*
