# Roadmap: CourseFlow

## Overview

The app's core creation flow and banner generation already work. This milestone ships the five remaining capabilities that turn a working prototype into a tool 50+ instructors can actually use: a working login, a stable production deployment, post-creation banner refinement, per-course registration tracking, and automated feedback collection.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Auth Fix** - Diagnose and fix the broken login/session/route-protection flow
- [ ] **Phase 2: Deploy + Storage** - Migrate storage off the filesystem and ship to production Vercel
- [ ] **Phase 3: Banner Editing** - Add chat-style banner refinement after course creation
- [ ] **Phase 4: Per-Course Sheets** - Wire Apps Script to auto-create a Google Sheet per course
- [ ] **Phase 5: Feedback Forms** - Let instructors trigger a Google Form feedback at course end

## Phase Details

### Phase 1: Auth Fix
**Goal**: Instructors can log in, stay logged in, and be blocked from protected routes when unauthenticated
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. An instructor submits username/password on /login and lands on /create with a valid session cookie set
  2. An unauthenticated user visiting /create or any /api/* protected route is redirected to /login
  3. An instructor clicks logout and their session cookie is cleared, then /create redirects them back to /login
**Plans**: 1 plan
Plans:
- [x] 01-01-PLAN.md — Diagnose and fix auth flow (proxy.ts wiring, HMAC bug, open redirect, error messages)

### Phase 2: Deploy + Storage
**Goal**: The app runs on a stable production Vercel URL where all created landing pages persist across requests
**Depends on**: Phase 1
**Requirements**: DEPL-01, DEPL-02, DEPL-03
**Storage decision**: Migrate JSON files from `fs.writeFile`/`fs.readFile` to **Vercel Blob** (simple API, free 1GB tier, native Vercel integration)
**Success Criteria** (what must be TRUE):
  1. An instructor creates a landing page in production and its URL returns the page (not a 404) on second visit
  2. The app is accessible at a public Vercel URL (not localhost)
  3. An instructor can copy their landing page URL (https://domain.com/l/[id]) and share it — recipients see the page without logging in
  4. Banner images appear correctly in production (no missing logos from NEXT_PUBLIC_BASE_URL misconfiguration)
**Plans**: TBD

### Phase 3: Banner Editing
**Goal**: Instructors can refine a generated banner after creation using a free-text Hebrew instruction
**Depends on**: Phase 2
**Requirements**: BNRE-01, BNRE-02
**Success Criteria** (what must be TRUE):
  1. After creating a course, an instructor types a Hebrew instruction (e.g. "make the background darker") and a new banner is generated
  2. The refined banner replaces the original in the landing page — visitors to /l/[id] see the updated version
**Plans**: TBD

### Phase 4: Per-Course Sheets
**Goal**: Every new course landing page automatically gets its own Google Sheet for registration tracking
**Depends on**: Phase 2
**Requirements**: SHTS-01, SHTS-02
**Success Criteria** (what must be TRUE):
  1. When an instructor creates a course, a new Google Sheet is created automatically with correct registration headers
  2. After creation, the instructor sees a direct link to their course's Google Sheet on the confirmation screen
  3. New registrations appear in the course-specific sheet (not a shared sheet)
**Plans**: TBD

### Phase 5: Feedback Forms
**Goal**: Instructors can trigger a Google Form feedback survey at course end, sent to registered participants
**Depends on**: Phase 4
**Requirements**: FDBK-01, FDBK-02
**Success Criteria** (what must be TRUE):
  1. The course creation flow includes a field for course end date
  2. An instructor can press a "Send Feedback Form" button on their course page after the end date
  3. A Google Form is created and the link is sent to the instructor (or registrants) — the instructor does not have to create it manually
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth Fix | 1/1 | Complete | 2026-02-26 |
| 2. Deploy + Storage | 0/? | Not started | - |
| 3. Banner Editing | 0/? | Not started | - |
| 4. Per-Course Sheets | 0/? | Not started | - |
| 5. Feedback Forms | 0/? | Not started | - |
