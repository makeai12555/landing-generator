# Codebase Concerns

**Analysis Date:** 2026-02-23

## Tech Debt

**Gemini Model Selection:**
- Issue: Free tier Gemini models produce degraded banner quality; production depends on paid-tier `gemini-3-pro-image-preview` which has zero free quota
- Files: `app/api/banner/route.ts` (line 10)
- Impact: Project is at risk of service interruption if quota exhausted or billing changes. Free-tier alternative `gemini-2.0-flash-preview-image-generation` produces poor output unsuitable for production
- Fix approach: Implement model fallback strategy with circuit breaker, add cost monitoring, consider secondary image generation provider as backup

**Hardcoded Referral Options:**
- Issue: Registration referral options duplicated across codebase instead of centralized configuration
- Files: `app/create/config/page.tsx` (lines 65, 96), `components/landing/RegistrationForm.tsx` (lines 13-20), `app/api/create-landing/route.ts` (lines 129-134)
- Impact: Changes require updates in multiple locations; inconsistency risk across flows
- Fix approach: Move to single source of truth in `constants/` or `config/` directory

**Session Management Implementation:**
- Issue: Custom HMAC-based session token using Web Crypto API without proven production testing or audit
- Files: `lib/auth.ts` (entire file)
- Impact: Authentication is hand-rolled rather than using battle-tested library; potential timing attack vulnerabilities, no protection against session fixation
- Fix approach: Consider migration to established session library (next-auth, iron-session) or conduct security audit and add constant-time comparison for HMAC verification

**Temporary Data Storage Model:**
- Issue: Landing data stored only in local JSON files (`data/landings/`) with fallback to Apps Script, no real database
- Files: `app/api/create-landing/route.ts` (lines 141-145), `app/api/landing/[id]/route.ts` (lines 13-17)
- Impact: No concurrent write protection, data loss on server restart, no transaction support, scaling bottleneck
- Fix approach: Migrate to proper database (Postgres, MongoDB) with migration scripts

## Known Bugs

**Session Token Casting Issue:**
- Symptoms: Potential type safety issue in HMAC verification
- Files: `lib/auth.ts` (line 76)
- Trigger: Valid session verification flow
- Details: `new Uint8Array(base64UrlDecode(signatureStr)) as unknown as ArrayBuffer` performs unsafe cast - Uint8Array is not an ArrayBuffer
- Workaround: Function currently works but type cast masks underlying issue
- Fix: Change to `base64UrlDecode(signatureStr).buffer` to use proper ArrayBuffer conversion

**Image Extraction Assumes Specific Response Structure:**
- Symptoms: Banner generation fails silently if Gemini response format changes
- Files: `app/api/banner/route.ts` (lines 63-92)
- Trigger: If Gemini API changes response structure for image data
- Details: Assumes exact nested path `candidates[0]?.content?.parts[*]?.inlineData?.data` with no validation of mimeType or data format
- Workaround: None - request will fail with generic "No image returned" error
- Fix: Add response structure validation and fallback handling

**Landing ID Generation Not Cryptographically Secure:**
- Symptoms: Landing page IDs are predictable
- Files: `app/api/create-landing/route.ts` (lines 44-50)
- Trigger: Math.random() is not cryptographically secure
- Details: Uses `Math.random()` for ID generation instead of `crypto.getRandomValues()`
- Workaround: None
- Fix: Replace with `crypto.getRandomValues(new Uint8Array(6))` or similar

**No Validation of Logo URL Before Fetch:**
- Symptoms: Server-side request could be sent to malicious URLs
- Files: `app/api/banner/route.ts` (lines 416-438)
- Trigger: Malicious logo URL in branding configuration
- Details: Logo URLs fetched without URL validation; could target internal services or cause SSRF attacks
- Workaround: None - depends on external trust
- Fix: Validate URLs against whitelist or parse URL to reject non-http(s) schemes

## Security Considerations

**Open Redirect via `from` Query Parameter:**
- Risk: After login, user can be redirected to arbitrary URLs
- Files: `app/api/auth/login/route.ts`, `proxy.ts` (line 55)
- Current mitigation: Redirect uses request URL object which prevents some attacks
- Recommendations: Add explicit URL allowlist or only allow relative paths starting with `/`

**Session Token Stored in Non-Secure Context:**
- Risk: Session cookie set with `secure: process.env.NODE_ENV === "production"` - fails to set HttpOnly in development, domain scope not specified
- Files: `app/api/auth/login/route.ts` (lines 42-48)
- Current mitigation: HttpOnly flag present in production
- Recommendations: Set secure flag to true even in development (use test with https://localhost), always set explicit domain and path

**No Input Sanitization on Form Fields:**
- Risk: Course title, description, and registration data sent directly to Gemini API and Apps Script without sanitization
- Files: `components/course/CourseForm.tsx` (lines 166-189), `components/landing/RegistrationForm.tsx` (lines 41-53)
- Current mitigation: HTML rendering uses React which escapes by default
- Recommendations: Add input length limits, validate email format, sanitize special characters before external API calls

**Apps Script Secret Not Validated:**
- Risk: No authentication/authorization token sent to Apps Script endpoints
- Files: `app/api/create-landing/route.ts` (line 81), `app/api/register/route.ts` (line 16), `app/api/auth/login/route.ts` (line 23)
- Current mitigation: None - relies on Apps Script URL being private
- Recommendations: Add HMAC signature or OAuth token to all Apps Script requests

**Dangerously Set Inner HTML:**
- Risk: CSS injection possible via theme colors
- Files: `app/l/[id]/page.tsx` (lines 72-82)
- Current mitigation: Colors come from extracted palette or defaults, not user input
- Recommendations: Validate hex color format before injecting into CSS

## Performance Bottlenecks

**Sequential Gemini API Calls During Banner Generation:**
- Problem: Banner generation could be parallelized but isn't fully optimized
- Files: `app/api/banner/route.ts` (lines 443-446)
- Cause: Promise.all is used but two parallel generations still hit rate limits; no retry logic or exponential backoff
- Improvement path: Implement queue system with exponential backoff, consider caching design preferences, pre-generate common design combinations

**Color Extraction with node-vibrant on Every Landing Creation:**
- Problem: Full palette analysis runs synchronously for every banner without caching
- Files: `app/api/banner/route.ts` (lines 156-176)
- Cause: No memoization of results; if same image regenerated, extraction repeats
- Improvement path: Cache extracted colors keyed on image hash, implement LRU cache with TTL

**Real-Time Form State Serialization to localStorage:**
- Problem: Every keystroke triggers localStorage.setItem() call
- Files: `components/course/CourseForm.tsx` (lines 35-37), `app/create/config/page.tsx` (line 69)
- Cause: saveToStorage called on every field change without debouncing
- Improvement path: Add 500ms debounce to localStorage writes, batch multiple updates

**Loading Landing Page Data Without Cache:**
- Problem: `cache: "no-store"` on landing page fetch defeats Next.js ISR/SSG benefits
- Files: `app/l/[id]/page.tsx` (line 13)
- Cause: All landing pages hit API on every request, no caching layer
- Improvement path: Use `revalidate: 3600` for 1-hour cache, add CDN caching headers

## Fragile Areas

**Banner Generation Prompt Complexity:**
- Files: `app/api/banner/route.ts` (lines 178-340)
- Why fragile: 400+ line prompt with 30+ art direction parameters; small changes to parameter names or descriptions break image output consistency; Gemini may interpret variations differently
- Safe modification: Version the prompt, create test suite with baseline images, document parameter semantics clearly, test art direction changes with multiple seeds
- Test coverage: No tests for prompt generation or output validation

**Logo Integration in Banner:**
- Files: `app/api/banner/route.ts` (lines 323-360)
- Why fragile: Assumes Gemini can integrate 1-4 reference images; no fallback if logo processing fails; assumes JPEG/PNG MIME type detection works
- Safe modification: Add logo integration toggle, graceful degradation without logos, explicit error logging for logo fetch failures
- Test coverage: No tests for logo data format conversion or fetch error scenarios

**localStorage Dependency in Course Creation Flow:**
- Files: `components/course/CourseForm.tsx`, `app/create/config/page.tsx`
- Why fragile: Entire multi-step flow depends on localStorage; no server session; if user clears storage, progress lost; SSR incompatible
- Safe modification: Implement server-side session store (Redis), validate data integrity on each step, add data migration logic
- Test coverage: No tests for localStorage corruption or concurrent tab scenarios

**Custom Base64 Encoding/Decoding:**
- Files: `lib/auth.ts` (lines 15-30)
- Why fragile: Manual string manipulation in encoding functions; no library validation; could fail on edge cases (null bytes, surrogate pairs)
- Safe modification: Use built-in Buffer methods or TextEncoder/TextDecoder, add round-trip tests
- Test coverage: No tests for encoding edge cases or invalid input

**Apps Script as Critical Infrastructure:**
- Files: `app/api/create-landing/route.ts`, `app/api/register/route.ts`, `app/api/auth/login/route.ts`
- Why fragile: All registration and sheet creation depends on single external service; no circuit breaker, no fallback storage, silent failures on Apps Script timeout
- Safe modification: Add timeout handling (currently defaults to 30s), implement local registration queue with batch retry, add health check endpoint
- Test coverage: No error scenario testing for Apps Script unavailability

## Scaling Limits

**Gemini API Quota:**
- Current capacity: Depends on billing tier (free tier has 0 quota for paid models)
- Limit: Hits rate limit or quota exhaustion; project stops working
- Scaling path: Implement queue system with priority, add secondary image provider (OpenAI DALL-E, Replicate), implement caching layer for repeated prompts

**Local File Storage for Landing Data:**
- Current capacity: Filesystem limits (typically supports millions of files but performance degrades)
- Limit: 1000+ landing pages cause file system I/O performance issues; no concurrent write protection
- Scaling path: Migrate to database (PostgreSQL can handle millions of records), implement proper concurrent write handling

**Fetch Request Concurrency:**
- Current capacity: Node.js default allows ~1000 concurrent connections per domain
- Limit: Under load (many simultaneous course creations), fetch to Apps Script blocks on connection pooling
- Scaling path: Implement connection pooling library (agent-base), add request queuing, batch API calls to Apps Script

## Dependencies at Risk

**@google/genai Version 1.38.0:**
- Risk: Early version number indicates immature API; breaking changes likely in future versions
- Impact: Banner generation breaks on major version update
- Migration plan: Pin to exact version, monitor release notes, implement API abstraction layer to ease migration

**node-vibrant 4.0.4:**
- Risk: May not handle all image formats reliably; last major version bump suggests older maintenance
- Impact: Color extraction fails silently with no alternative, user gets default colors
- Migration plan: Add fallback palette, implement image validation before extraction, consider alternative (sharp + color-thief)

**Custom Session Auth vs Industry Standard:**
- Risk: No maintainer community, no security audits, no performance benchmarks
- Impact: Security vulnerabilities discovered after deployment
- Migration plan: Evaluate next-auth, iron-session, or other established libraries; implement compatibility layer

## Missing Critical Features

**No Landing Page Analytics:**
- Problem: Can't track registration sources, banner effectiveness, or user behavior
- Blocks: Can't optimize marketing, can't validate design choices, can't prove ROI to stakeholders

**No Error Recovery:**
- Problem: If banner generation fails halfway, user gets error but no way to retry with same ID
- Blocks: Users must start over, losing all course configuration

**No Admin Dashboard:**
- Problem: No way to monitor landing pages, view registrations, or troubleshoot issues without direct database access
- Blocks: Operations team can't manage system effectively

**No Rate Limiting on API Endpoints:**
- Problem: Abuse attacks possible on registration and banner generation endpoints
- Blocks: Production deployment at risk of DDoS

## Test Coverage Gaps

**Banner Generation Logic:**
- What's not tested: Prompt generation, Gemini API response parsing, color extraction edge cases
- Files: `app/api/banner/route.ts` (entire file)
- Risk: Changes to prompt or response handling could break silently; can't validate output quality
- Priority: High

**Authentication Flow:**
- What's not tested: Session token creation/verification, login error scenarios, session expiration
- Files: `lib/auth.ts`, `app/api/auth/login/route.ts`
- Risk: Auth bypass or token forgery could go undetected
- Priority: High

**Course Form State Management:**
- What's not tested: localStorage round-trip, multi-step form state persistence, error recovery
- Files: `components/course/CourseForm.tsx`, `app/create/config/page.tsx`
- Risk: Users could lose all form data on browser crash or refresh
- Priority: Medium

**Registration Form Submission:**
- What's not tested: Form validation, error handling from /api/register, network failure scenarios
- Files: `components/landing/RegistrationForm.tsx`
- Risk: Silent submission failures possible; users think they registered but sheet entry fails
- Priority: Medium

**Landing Page Data Fetch:**
- What's not tested: 404 handling, Apps Script fallback path, concurrent requests
- Files: `app/l/[id]/page.tsx`, `app/api/landing/[id]/route.ts`
- Risk: Missing landing pages could show wrong page; Apps Script errors not validated
- Priority: Medium

**Input Validation:**
- What's not tested: Hebrew text handling, emoji/special character edge cases, SQL injection (if ever added)
- Files: `components/course/CourseForm.tsx`, `components/landing/RegistrationForm.tsx`
- Risk: Malformed input could break banner generation or Apps Script sheet
- Priority: Low

---

*Concerns audit: 2026-02-23*
