# Feature Research

**Domain:** Course/event landing page builder for non-technical instructors (Hebrew, municipal youth org)
**Researched:** 2026-02-26
**Confidence:** MEDIUM — most findings verified against codebase state and multiple web sources; Google Apps Script specifics rely on official docs + community sources.

---

## Context: What Already Exists

Before categorizing new features, the existing baseline:

- 2-step creation flow (`/create` → `/create/config` → `/l/[id]`) — **working**
- Gemini-powered Hebrew banner generation with art direction — **working**
- Landing page display with registration form — **working**
- Registration data saved to JSON files + per-course Google Sheet (via Apps Script) — **working** (sheet creation in `create-landing` route)
- Color extraction from banners (node-vibrant) — **working**
- Hebrew RTL support throughout UI — **working**
- Auth scaffolding: `proxy.ts`, `lib/auth.ts`, `/login/`, `/api/auth/login`, `LogoutButton` — **scaffolded but broken**

The new milestone adds: working auth, chat-style banner editing, feedback forms, production deployment.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that feel broken or incomplete if missing. For this product, users are 50+ non-technical instructors.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Working login + session persistence | Without auth, any instructor can see/create for anyone. Non-technical users expect simple username/password. | LOW | Scaffolding exists. `proxy.ts` + `lib/auth.ts` + `api/auth/login` all implemented. Issue is likely `AUTH_SCRIPT_URL` env var or Google Apps Script backend. Needs diagnosis, not rebuild. |
| Route protection for /create and /api/* | Industry standard — unauthenticated users redirected to login. | LOW | `proxy.ts` already implements this. Fix the auth flow and this works automatically. |
| Logout that actually clears session | Users expect logout to terminate their session. | LOW | `/api/auth/logout` and `LogoutButton` exist. Tied to auth fix. |
| "Return to login" redirect after session expiry | Non-technical users expect graceful expiry handling, not broken pages. | LOW | `proxy.ts` already sets `from` param and clears cookie on bad session. Works once auth works. |
| Shareable landing page URL | The core value prop — instructors share a URL to attract registrants. | LOW | Already works: `/l/[id]`. Needs production deployment to produce a stable URL. |
| Production deployment (not localhost) | A URL pointing to localhost is useless for sharing with the public. | MEDIUM | Vercel team exists (`makeai12555s-projects`), project not deployed yet. Requires env vars migrated and `NEXT_PUBLIC_BASE_URL` set. JSON data persistence on Vercel requires attention (ephemeral filesystem). |
| Registration confirmation feedback | Registrants expect acknowledgment after submitting. | LOW | Currently handled in `RegistrationForm.tsx`. Verify success state is shown. |
| Registration count visible to instructor | Instructors need to know how many signed up. | LOW | Google Sheet per course already created. No in-app count display. P2 to add count to landing page or dashboard. |

### Differentiators (Competitive Advantage)

Features that make this tool stand out for this specific use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Chat-style banner refinement | Instructors describe what to change in natural Hebrew — no design tools needed. Directly addresses the "5 minutes with no graphic skills" value prop. | MEDIUM | Requires: (a) UI for text input + submit on `/l/[id]` or a dedicated refinement page, (b) new API endpoint `/api/refine-banner` that passes previous image + instruction to Gemini, (c) save updated banner URL to landing JSON. The Gemini model already handles this pattern via conversational prompting. |
| Auto-generated per-course Google Sheet | Each course gets its own registration sheet automatically, shared with coordinator. Instructors don't have to manage spreadsheets. | LOW | Already implemented in `create-landing/route.ts`. The `createSheet` action is called via `APPS_SCRIPT_URL`. Needs Apps Script backend to implement the `createSheet` action if not done, and needs to share the sheet with the instructor/coordinator email. |
| Feedback form auto-sent at course end | After course ends, coordinator is notified; Google Form sent to participants. Closes the quality loop automatically. | HIGH | Complex because it requires: (a) storing course end date, (b) a scheduled job or manual trigger to send, (c) Google Forms API or Apps Script to create/send forms. Google Apps Script does support auto-generating forms. Consider making this a manual "Send feedback form" button rather than automatic scheduling — much lower complexity. |
| Hebrew-first design throughout | RTL, Hebrew fonts, Israeli cultural context. Competitors (Mailchimp, Eventbrite) are LTR-first and require manual Hebrew config. | LOW (maintain) | Already implemented. Must be guarded — no English-only components introduced. |
| Gemini-powered banner with logo upload | Competitors generate generic banners; this tool embeds org logos and produces Hebrew text banners correctly. | LOW (maintain) | Already working with `gemini-3-pro-image-preview`. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this team/codebase.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Drag-and-drop visual banner editor | Instructors might want pixel-level control | Requires a canvas library (Fabric.js, Konva), adds ~200KB bundle, complex state management, RTL drag issues. Out of scope per PROJECT.md. | Chat-style refinement: describe the change, Gemini re-generates. Simpler to build, better for non-technical users. |
| OAuth / Google sign-in | "Just use Google login" feels easier | Requires OAuth2 consent screen configuration, Google Cloud project setup, redirect URI management per environment. The org already has user credentials in Google Sheets. | Email/password via Google Sheets — already built, fits the existing user management workflow. |
| Database migration (Supabase / Postgres) | Perception that JSON files won't scale | Overkill for 50 instructors and ~200 courses/year. JSON files work fine. Migration mid-milestone risks data loss. | Stay on JSON files for landing data. Google Sheets for registrations. Revisit at v2 if usage explodes. |
| Real-time registration dashboard | "Nice to have" live count update | Requires WebSockets or polling, adds infrastructure complexity. The real data is in Google Sheets which already has live view. | Deep link to the course-specific Google Sheet from the success page after course creation. Instructors already use Sheets. |
| Email notifications to registrants | Registrants want confirmation email | Requires email provider integration (SendGrid, Resend), email templates in Hebrew, SPF/DKIM setup. Significant scope increase. | Show a clear success message on registration. Collect phone for WhatsApp follow-up (more culturally relevant for Israeli youth programs). |
| Multi-tenant instructor dashboard | "See all my courses in one place" | Requires associating courses with users at creation time, storing `createdBy` field, filtering UI. Adds auth complexity. | P2: add `createdBy: username` to landing JSON during creation (trivial change), build dashboard later. |
| Automatic course-end scheduling | Trigger feedback form automatically when course ends | Requires a cron job or cloud scheduler, persistent date comparison, background processing. Vercel has no persistent workers without upgrade. | Add a manual "Send feedback form" button on a course management page. Same outcome, no infrastructure complexity. |
| Payment processing | Some municipal courses have nominal fees | Municipal youth programs are free. Payments add PCI compliance, legal review, payment provider setup. | Out of scope. Per PROJECT.md constraints. |

---

## Feature Dependencies

```
[Working Auth (login + session)]
    └──required by──> [Route Protection works]
    └──required by──> [User-attributed course creation]
    └──required by──> [Instructor dashboard (future)]

[Production Deployment on Vercel]
    └──required by──> [Shareable public URL]
    └──requires──> [JSON data persistence strategy for Vercel]
    └──requires──> [All env vars migrated to Vercel dashboard]
    └──requires──> [NEXT_PUBLIC_BASE_URL set to production domain]

[Per-course Google Sheet]
    └──enhances──> [Registration tracking]
    └──already implemented in create-landing──> [needs Apps Script backend action]

[Chat-style Banner Refinement]
    └──requires──> [Existing banner URL stored in landing JSON] (already there: assets.bannerUrl)
    └──requires──> [New /api/refine-banner endpoint]
    └──requires──> [UI on /create/config or post-creation page]
    └──requires──> [Working auth] (refinement is instructor-only action)

[Feedback Form]
    └──requires──> [Course end date stored on landing]
    └──requires──> [Registrant emails/phones stored in Sheet]
    └──simplifies to──> [Manual "Send feedback form" button]
    └──that requires──> [Apps Script action to create + send Google Form]
```

### Dependency Notes

- **Auth must ship before anything instructor-facing**: Chat-style editing, feedback forms, and any dashboard feature are guarded by auth. Fix auth first.
- **Deployment must ship for the tool to be usable**: Localhost URLs cannot be shared publicly. Production deployment unblocks the entire value prop.
- **Per-course Sheet is already mostly implemented**: The `createSheet` Apps Script action just needs to work on the backend. Low effort to verify/fix.
- **Chat refinement is independent of feedback forms**: Can ship in either order once auth + deployment are done.
- **Feedback forms are highest complexity**: Defer to last; use a manual trigger button to reduce from HIGH to MEDIUM complexity.

---

## MVP Definition

### Launch With (v1 — this milestone)

Minimum to be genuinely usable by 50+ instructors.

- [x] Working login flow (fix the auth issue — code exists, diagnose the break)
- [x] Route protection (proxy.ts already works — depends on auth fix)
- [x] Production deployment on Vercel with stable shareable URL
- [x] JSON data persistence on Vercel (write to `/tmp` or migrate to Vercel KV / external storage — `process.cwd()/data/landings` won't persist between deploys)
- [x] Chat-style banner refinement on post-creation page
- [x] Per-course Google Sheet working end-to-end (verify Apps Script backend)

### Add After Validation (v1.x)

Once the tool is in instructors' hands and working.

- [ ] Manual "Send feedback form" button — trigger when: instructors request it after using the tool
- [ ] Registration count shown on landing page or success screen — trigger when: instructors ask "how many signed up?"
- [ ] `createdBy` field on landing JSON — trigger when: multiple instructors using, need to separate their courses

### Future Consideration (v2+)

Defer until product-market fit is clear.

- [ ] Instructor dashboard (list of my courses) — defer: small team, workaround is bookmarking URLs
- [ ] Automatic scheduled feedback form delivery — defer: needs background job infrastructure
- [ ] Email confirmation to registrants — defer: phone/WhatsApp is more effective for Israeli youth programs

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Working auth (fix existing scaffolding) | HIGH | LOW (diagnosis + fix, not rebuild) | P1 |
| Production deployment (Vercel) | HIGH | MEDIUM (env vars + persistence issue) | P1 |
| JSON persistence on Vercel | HIGH | LOW-MEDIUM (switch to `/tmp` or KV) | P1 |
| Per-course Google Sheet (verify end-to-end) | HIGH | LOW (likely just Apps Script backend work) | P1 |
| Chat-style banner refinement | HIGH | MEDIUM (new API endpoint + UI) | P1 |
| Manual feedback form trigger | MEDIUM | MEDIUM (Apps Script + UI button) | P2 |
| Registration count display | MEDIUM | LOW | P2 |
| `createdBy` on landing JSON | LOW | LOW | P2 |
| Instructor dashboard | LOW | MEDIUM | P3 |
| Automatic scheduled feedback | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for milestone completion
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

Competitors analyzed: Eventbrite, Mailchimp Landing Pages, Linktree, Thinkific.

| Feature | Eventbrite | Mailchimp | Our Approach |
|---------|------------|-----------|--------------|
| Auth model | OAuth/Google | OAuth/email | Email/password via Google Sheets (fits org workflow, no OAuth overhead) |
| Banner/image | Upload only | Upload/template | AI-generated from course details — unique differentiator |
| Registration tracking | Built-in dashboard | Form + spreadsheet export | Per-course Google Sheet — familiar to coordinators |
| RTL/Hebrew | Partial, LTR default | Poor RTL | Hebrew-first, RTL throughout — primary differentiator |
| Banner editing | Upload new image | Template drag-drop | Chat-style refinement via Gemini — lower friction |
| Feedback collection | Post-event survey tool (paid) | Email campaign | Google Forms via Apps Script — free, integrates with existing workflow |
| Deployment | Hosted on Eventbrite | eventbrite.com subdomain | Vercel with `NEXT_PUBLIC_BASE_URL` — custom domain option |
| Pricing | Per-ticket fees | Freemium | Free for org (self-hosted on their Vercel account) |

---

## Critical Implementation Notes

### Vercel JSON Persistence Problem (HIGH PRIORITY)

The current code saves landing JSON files to `process.cwd()/data/landings/`. On Vercel, the filesystem is ephemeral — files written during one request are not available in subsequent requests.

**Options ranked by simplicity:**
1. **Vercel KV (Redis)** — key-value store, `LANDING_ID → JSON string`. First-class Vercel integration, free tier available. Requires `@vercel/kv` package.
2. **Vercel Blob** — store JSON as blobs. Slightly higher latency than KV.
3. **Write to `/tmp`** — Vercel allows writes to `/tmp` but it's not shared between serverless function instances. Unreliable.
4. **Keep file system, use external volume** — over-engineered for this scale.

**Recommendation:** Vercel KV. One-time migration, `kv.set(landingId, JSON.stringify(data))` and `kv.get(landingId)` replaces file read/write. The existing API structure doesn't change.

### Auth Diagnosis Before Fix

The auth scaffolding is complete: `proxy.ts`, `lib/auth.ts`, `/api/auth/login`, `/api/auth/logout`, login page, `LogoutButton`. The issue is undiagnosed per PROJECT.md. Before implementing anything new, check:
1. Is `AUTH_SCRIPT_URL` set in `.env.local`?
2. Does the Google Apps Script `authenticate` action return `{ success: true, username: "..." }`?
3. Is `SESSION_SECRET` set in `.env.local`?
4. Does `proxy.ts` get invoked (check Next.js 16 export name: must be `export async function proxy`)?

This is a debugging task, not a build task.

### Chat-Style Banner Editing UX Pattern

Research confirms (MEDIUM confidence from WebSearch + Artium.AI source) that the most effective pattern in 2026 is **hybrid**: chat input for instruction, immediate preview of result. The pure chat model (no visual feedback) frustrates users on visual tasks.

Recommended UX for CourseFlow:
- Post-creation page shows current banner + text input: "תאר מה לשנות בבאנר..." (Describe what to change in the banner...)
- Submit sends current banner URL + instruction to `/api/refine-banner`
- API calls Gemini with: `[existing image as base64] + [Hebrew instruction]`
- New banner URL replaces old, updates landing JSON
- Show loading state with spinner (banner generation takes 5-15 seconds)

Do NOT make this a full chat thread — one-shot instruction is sufficient. Keep it simple.

---

## Sources

- Codebase analysis: `landing-next/app/api/`, `landing-next/lib/auth.ts`, `landing-next/proxy.ts` (HIGH confidence — direct source)
- PROJECT.md context (HIGH confidence — project definition)
- [Bizzabo: How to Build the Perfect Event Registration Landing Page](https://www.bizzabo.com/blog/how-to-build-the-perfect-event-registration-landing-page) (MEDIUM confidence)
- [Google Apps Script: Auto-generating Google Forms](https://workspace.google.com/blog/developers-practitioners/auto-generating-google-forms) (MEDIUM confidence)
- [Artium.AI: Beyond Chat — How AI is Transforming UI Design Patterns](https://artium.ai/insights/beyond-chat-how-ai-is-transforming-ui-design-patterns) (MEDIUM confidence)
- [Vercel: Environment Variables](https://vercel.com/docs/environment-variables) (HIGH confidence — official docs)
- [Next.js: Authentication Guide](https://nextjs.org/docs/pages/building-your-application/authentication) (HIGH confidence — official docs)
- [CVE-2025-29927: Next.js Middleware Authorization Bypass](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) — awareness note: the `proxy.ts` approach is correct for Next.js 16, which does not have this vulnerability (HIGH confidence)

---

*Feature research for: CourseFlow — Hebrew course landing page builder*
*Researched: 2026-02-26*
