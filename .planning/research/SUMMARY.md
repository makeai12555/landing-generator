# Project Research Summary

**Project:** CourseFlow — Hebrew Course Landing Page Builder
**Domain:** AI-assisted event/course landing page builder for non-technical Hebrew-speaking instructors
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

CourseFlow is a Next.js 16 tool that generates AI-powered Hebrew banners and landing pages for municipal youth program instructors. The existing codebase has a working 2-step course creation flow, Gemini banner generation, and scaffolded auth — but the app cannot be deployed to production without resolving a critical storage problem: `fs.writeFile` to `data/landings/` silently fails on Vercel's read-only serverless filesystem. The fix is a targeted migration to Vercel KV or Vercel Blob before the first production deploy.

The recommended approach is to work in strict dependency order. Auth must be fixed first because it unblocks all instructor-facing features. The auth system is completely scaffolded (`proxy.ts`, `lib/auth.ts`, `api/auth/login`) — the issue is an undiagnosed runtime or environment variable problem, not a rebuild. Once auth works and storage is migrated, Vercel deployment unlocks the core value prop (shareable public URLs). Chat-style banner editing and per-course Google Sheets then ship independently. The Google Forms feedback feature is deferred to last as the highest-complexity item.

Key risks are: (1) the silent JSON storage failure on Vercel described above; (2) `NEXT_PUBLIC_BASE_URL` must be set in the Vercel dashboard before the build runs or logos will be missing from all banners; (3) Gemini iterative banner editing requires thought signature round-tripping via the SDK's chat session object — if done manually, each edit generates a new composition instead of refining the previous one. All three risks have clear mitigations and none require architectural redesign.

---

## Key Findings

### Recommended Stack

The core stack requires no changes — Next.js 16.1.3, React 19.2.3, TypeScript 5, Tailwind 4, and `@google/genai` with `gemini-3-pro-image-preview` are all correct and already installed. Two new packages are needed: `@vercel/blob` (or `@vercel/kv`) to replace filesystem-based landing storage, and `googleapis` v171 for the Google Sheets and Google Forms APIs. The existing custom HMAC session system in `lib/auth.ts` works and should not be replaced — migration to `jose` is optional polish.

**Core technologies:**
- `next@16.1.3`: Full-stack framework — already correct, `proxy.ts` is the verified Next.js 16 pattern
- `@google/genai`: Gemini banner generation — do NOT upgrade or swap; paid tier active on `gemini-3-pro-image-preview`
- `@vercel/blob` or `@vercel/kv`: Landing JSON persistence — required before Vercel deploy; replaces broken `fs.writeFile`
- `googleapis@^171`: Google Sheets + Forms API — one package covers both, use Service Account auth
- Custom `lib/auth.ts` HMAC sessions: Session management — works, keep as-is unless debugging reveals issues

**Critical version note:** Google Forms API requires `setPublishSettings` for forms created after March 31, 2026. Implement from day one.

### Expected Features

All four research files agree on the same priority ordering. Auth and deployment are P1 blockers; banner editing and per-course sheets are P1 value; feedback forms are P2.

**Must have (table stakes):**
- Working login and session persistence — scaffolded but broken; diagnosis needed before any rebuild
- Route protection for `/create` and API routes — `proxy.ts` already implements this; depends on auth fix
- Production deployment with stable shareable URL — Vercel team exists, not yet deployed
- JSON data persistence on Vercel — hard blocker; silent failure is already in production-path code
- Per-course Google Sheet — Next.js side is wired; Apps Script `createSheet` action needs implementation

**Should have (competitive):**
- Chat-style banner refinement — the primary differentiator for non-technical users; describe change in Hebrew, Gemini re-generates
- Manual "Send feedback form" button — triggers Google Form creation via Apps Script at course end

**Defer (v2+):**
- Instructor dashboard (list of my courses) — workaround: bookmark URLs; small user base
- Automatic scheduled feedback delivery — requires cron/background job infrastructure Vercel doesn't provide
- Email notifications to registrants — WhatsApp is more effective for Israeli youth programs; significant scope increase

### Architecture Approach

The app follows a clean pattern: `proxy.ts` as route guard, stateless API routes for all Gemini and Google calls, Apps Script as the Google Workspace gateway (auth, Sheets, Forms), and a JSON file store for landing data. No changes to this pattern are needed — only the storage layer swap for the JSON files. The `localStorage` bridge between `/create` and `/create/config` is intentional for the 2-step flow. All Google API operations correctly go through server-side routes, avoiding the Apps Script CORS pitfall.

**Major components:**
1. `proxy.ts` — Route-level auth guard; checks session cookie; redirects unauthenticated users to `/login`
2. `lib/auth.ts` + `api/auth/*` — HMAC session creation/verification; credential check delegates to Apps Script
3. `api/banner` + `api/banner-edit` — Stateless Gemini calls; node-vibrant color extraction; Node.js runtime required
4. `api/create-landing` + `api/landing/[id]` — Landing CRUD; currently filesystem-based; must migrate to Vercel KV/Blob
5. Google Apps Script — External Google Workspace gateway; handles auth, sheet creation, registration writes, feedback forms
6. `app/l/[id]/page.tsx` — Public landing page; no auth; consumes registration API

### Critical Pitfalls

1. **JSON file storage silently fails on Vercel** — `fs.writeFile` throws `EROFS` but the error is swallowed; user receives a valid landing URL that 404s. Fix: migrate to `@vercel/kv` (`kv.set`/`kv.get`) before any production deploy. Do not use `/tmp` as a workaround.

2. **`NEXT_PUBLIC_BASE_URL` baked at build time** — If missing from the Vercel dashboard before the build, logos are fetched from `localhost:3000` (fails silently); logos absent in all production banners. Fix: set all env vars in the Vercel dashboard as the very first deployment task.

3. **Gemini iterative editing loses context without thought signature round-tripping** — Manually reconstructing the messages array for each edit causes the model to generate a new image instead of refining the existing one. Fix: use `client.chats.create()` from the SDK; do not manually build the history array.

4. **Apps Script CORS blocks browser-side calls** — Apps Script Web Apps reject OPTIONS preflight from browsers. Fix: all Apps Script calls must stay in Next.js server routes (`/api/auth/login`, `/api/register`). Never call `APPS_SCRIPT_URL` from client components.

5. **Apps Script `createSheet` failure produces landing pages with empty `sheetId`** — Registrations silently fail later. Fix: validate `sheetId` is non-empty before returning success from `create-landing`; surface error to user if missing.

---

## Implications for Roadmap

Based on the dependency graph across all four research files, the correct phase order is:

### Phase 1: Auth Fix
**Rationale:** Every instructor-facing feature is gated by a working session. The scaffolding is complete; this is a diagnosis-and-fix task, not a build task. Nothing else should ship before auth works — adding more features to a broken auth system compounds debugging difficulty.
**Delivers:** Working login, session persistence, logout, route protection on `/create` and all protected API routes.
**Addresses:** Working login (table stakes), route protection (table stakes), open redirect fix in `proxy.ts`.
**Avoids:** Anti-pattern of adding more protected routes before auth is verified end-to-end.
**Research flag:** Skip deeper research — patterns are well-documented and code already exists.

### Phase 2: Vercel Deployment + Storage Migration
**Rationale:** Auth must work first so the deployed app is usable. Storage migration is a hard prerequisite for deployment — without it, every landing page created in production silently 404s. These two concerns are bundled because deployment without the storage fix is actively harmful.
**Delivers:** A publicly accessible production URL that instructors can share; landing pages that persist across requests.
**Uses:** `@vercel/kv` or `@vercel/blob` to replace `fs.writeFile`/`fs.readFile`; Vercel CLI for env var migration.
**Avoids:** Silent JSON storage failure (Critical Pitfall 1); `NEXT_PUBLIC_BASE_URL` missing at build time (Critical Pitfall 2); `maxDuration` too low for banner generation timeout.
**Research flag:** Skip deeper research — Vercel Blob/KV APIs are straightforward and well-documented.

### Phase 3: Chat-Style Banner Editing
**Rationale:** Independent of Sheets and Forms once auth and deployment are working. This is the primary UX differentiator and completes the "5 minutes, no graphic skills" value prop. Implemented as a stateless single-instruction edit (V1) — no conversation history stored server-side.
**Delivers:** Post-creation banner refinement UI with Hebrew text input; Gemini re-generates based on instruction; updated banner saved to landing JSON.
**Uses:** Existing `@google/genai` SDK; new `/api/banner-edit` route; SDK `chats.create()` pattern (not manual history).
**Avoids:** Gemini thought signature pitfall (Critical Pitfall 3); storing chat history server-side (anti-pattern for Vercel serverless).
**Research flag:** May need brief implementation research on the exact SDK chat session API shape before coding.

### Phase 4: Per-Course Google Sheets (End-to-End)
**Rationale:** The Next.js side is already wired — this phase is purely Apps Script backend work. Low risk, isolated scope. Needed before instructors rely on the registration tracking workflow.
**Delivers:** Each created course automatically gets its own Google Sheet with headers; `sheetId` reliably stored in landing JSON; registrations routed to the correct sheet.
**Uses:** Google Apps Script `createSheet` action (needs implementation); existing `create-landing` and `register` routes (no changes).
**Avoids:** Empty `sheetId` in landing JSON (Critical Pitfall 5); Apps Script 6-minute timeout (keep `createSheet` minimal).
**Research flag:** Skip deeper research — Apps Script Spreadsheet Service is well-documented with examples in ARCHITECTURE.md.

### Phase 5: Google Forms Feedback
**Rationale:** Highest complexity feature; depends on Sheets being stable (same Apps Script). Deferred to last. Implement as a manual "Send feedback form" button rather than automatic scheduling to avoid cron/background job infrastructure.
**Delivers:** Instructor can trigger Google Form creation at course end; form emailed to instructor; replaces manual coordinator work.
**Uses:** `googleapis` Forms v1 API or Apps Script FormApp; needs `instructorEmail` stored in landing JSON at creation time (schema change in Phase 2 or 4).
**Avoids:** Google Forms API `setPublishSettings` deadline (required for forms created after March 31, 2026 — implement from day one).
**Research flag:** Needs brief research on `googleapis` Forms v1 vs Apps Script `FormApp` trade-offs before Phase 5 planning.

### Phase Ordering Rationale

- **Auth first** because 3 of the 5 remaining features are instructor-only (protected by auth). Fixing auth before building those features prevents debugging a compounded system.
- **Deployment second** because shareable URLs are the entire value prop. Without a production URL, the tool cannot be validated with real instructors.
- **Banner editing third** because it is independent of Sheets/Forms and delivers the primary differentiator. Sequencing it before Sheets means instructors can use the full creation + refinement flow as soon as they have production access.
- **Sheets fourth** because the Next.js side is already done; the Apps Script work is isolated and low-risk. Can be compressed with Phase 3 if timeline allows.
- **Forms last** because it depends on Sheets stability, requires a schema change (instructorEmail), and is the most complex integration. Also has the April 1 API deadline, so it must be implemented correctly — not rushed.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Banner Editing):** The exact shape of the `client.chats.create()` SDK API for stateless iterative image editing should be verified against the current `@google/genai` v1.38 SDK before implementation begins.
- **Phase 5 (Google Forms):** Decision between `googleapis` Forms v1 API vs Apps Script `FormApp` service needs a brief comparison (DX, quota, `setPublishSettings` requirement) before planning Phase 5.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Auth Fix):** Diagnosis checklist is clear; all code exists; no new APIs involved.
- **Phase 2 (Deployment):** Vercel Blob/KV are well-documented; env var migration is mechanical.
- **Phase 4 (Google Sheets):** Apps Script Spreadsheet Service is fully documented with exact code in ARCHITECTURE.md.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against Next.js 16 official docs, Vercel official docs, Google APIs official docs. Version compatibility confirmed. |
| Features | MEDIUM | Codebase analysis is HIGH confidence; competitor analysis and UX patterns are MEDIUM (community sources). Priority ordering is well-justified. |
| Architecture | HIGH | All patterns verified against official Next.js 16 and Gemini API docs. Codebase directly inspected. |
| Pitfalls | HIGH | Verified against Vercel official KB, Next.js GitHub discussions, direct codebase inspection. |

**Overall confidence:** HIGH

### Gaps to Address

- **Auth root cause:** The exact reason the auth flow is broken is undiagnosed. Research flags it as likely an env var (`AUTH_SCRIPT_URL`, `SESSION_SECRET`) or path alias issue — but must be confirmed by running the app and inspecting logs before writing any auth-related code in Phase 1.
- **Apps Script `createSheet` status:** It is unknown whether the Apps Script currently implements the `createSheet` action or not. The Next.js call exists but silently fails if the action is missing. Check the deployed Apps Script before starting Phase 4.
- **`instructorEmail` schema field:** The feedback form (Phase 5) needs the instructor's email stored in the landing JSON. This field does not exist yet. The schema change should be added during Phase 2 (landing creation) to avoid a migration problem later.
- **Vercel function timeout for banner route:** Banner generation takes 15–30 seconds. The current `maxDuration` configuration needs to be verified and set high enough before production deploy in Phase 2.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16 official docs (`nextjs.org/blog/next-16`, `nextjs.org/docs/app/api-reference/file-conventions/proxy`) — `proxy.ts` pattern, Node.js runtime, session management with `jose`
- Vercel Blob official docs (`vercel.com/docs/vercel-blob`) + Vercel community KB — confirmed `fs.writeFile` failure on serverless, Blob/KV as replacement
- Google Gemini API docs (`ai.google.dev/gemini-api/docs/image-generation`) — image generation, multi-turn editing, thought signatures
- Google Forms API docs (`developers.google.com/workspace/forms/api`) — programmatic form creation, `setPublishSettings` deadline
- Google Apps Script Forms + Spreadsheet Service docs — confirmed `FormApp.create()`, `SpreadsheetApp.create()` patterns
- Direct codebase inspection — `proxy.ts`, `lib/auth.ts`, `api/create-landing/route.ts`, `api/banner/route.ts`, `api/register/route.ts`

### Secondary (MEDIUM confidence)
- Next.js authentication guide (`nextjs.org/docs/pages/building-your-application/authentication`) — `jose` recommendation
- Artium.AI: "Beyond Chat — How AI is Transforming UI Design Patterns" — hybrid chat+preview UX pattern for banner editing
- `NEXT_PUBLIC_*` env var pitfall documentation (multiple community sources) — baked-at-build-time behavior confirmed

### Tertiary (LOW confidence — needs validation)
- `jose@6.1.3` Edge Runtime bug fix — confirmed via npm changelog search, not directly fetched
- Google Apps Script 6-minute timeout on sheet creation under load — extrapolated from official quota docs; not directly measured in this codebase

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
