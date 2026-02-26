---
phase: 02-deploy-storage
plan: 02
subsystem: infra
tags: [vercel, vercel-blob, deployment, github, production]

# Dependency graph
requires:
  - phase: 02-deploy-storage/02-01
    provides: Blob storage migration — app code ready for Vercel deployment
provides:
  - Working production deployment at courseflow-landing.vercel.app
  - Auto-deploy pipeline via GitHub push to master (makeai12555/landing-generator)
  - Vercel Blob store connected for persistent landing JSON and banner images
  - Public /l/[id] landing pages (unauthenticated), protected /create behind login
affects: [03-registration, 04-sheets, 05-forms]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Push to master triggers Vercel auto-deploy — CI/CD via GitHub integration"
    - "Vercel-injected VERCEL_PROJECT_PRODUCTION_URL used as base URL (no manual config)"

key-files:
  created: []
  modified:
    - landing-next/.gitignore

key-decisions:
  - "Vercel project connected to makeai12555/landing-generator, root directory landing-next, branch master"
  - "Blob store named 'courseflow-landing-blob' — BLOB_READ_WRITE_TOKEN auto-injected by Vercel"
  - "Push permission granted to BOeden on makeai12555/landing-generator to unblock deployment"

patterns-established:
  - "Deploy pattern: push master → Vercel auto-builds landing-next/ subfolder → production live"

requirements-completed: [DEPL-02, DEPL-03]

# Metrics
duration: 60min
completed: 2026-02-26
---

# Phase 2 Plan 02: Deploy Storage Summary

**Vercel production deployment at courseflow-landing.vercel.app with Blob store persistence, GitHub auto-deploy, and authenticated /create protected behind Hebrew login page**

## Performance

- **Duration:** ~60 min (including human-action checkpoints)
- **Started:** 2026-02-26
- **Completed:** 2026-02-26
- **Tasks:** 4 (2 auto, 2 human-action checkpoints)
- **Files modified:** 1 (landing-next/.gitignore)

## Accomplishments

- Production app live at https://courseflow-landing.vercel.app — /login returns 200
- Auto-deploy pipeline established: push to master triggers Vercel build of landing-next/ subfolder
- Vercel Blob store provisioned and connected — BLOB_READ_WRITE_TOKEN set in production environment
- All secrets set in Vercel production env (SESSION_SECRET, AUTH_SCRIPT_URL, GEMINI_API_KEY, APPS_SCRIPT_URL, GEMINI_IMAGE_MODEL)
- /l/[id] returns 404 for nonexistent IDs (not a login redirect — publicly accessible)

## Task Commits

Each task was committed atomically:

1. **Task 1: Reconnect Vercel to correct GitHub repo** - human-action checkpoint (no commit)
2. **Task 2: Prepare for deployment — gitignore and build check** - `208883d` (chore)
3. **Task 3: User sets up Vercel Blob store and environment variables** - human-action checkpoint (no commit)
4. **Task 4: Push to master and verify deployment** - push triggered deploy; no code change commit needed

**Additional commits in this plan:**
- `1df97f2` — feat(02-02): pass sheetId through registration flow and add logout buttons
- `9a66970` — chore(02-02): add CLAUDE.md project instructions and MCP config
- `d1d5732` — chore(02-02): remove stale root PLAN.md

## Files Created/Modified

- `landing-next/.gitignore` — Added `.vercel`, `data/landings/`, gdrive credential files

## Decisions Made

- Vercel project `courseflow-landing` reconnected to `makeai12555/landing-generator` (branch master, root `landing-next/`) — previous repo `makeai12555/courseflow-landing` was wrong
- Blob store named `courseflow-landing-blob` for clarity; BLOB_READ_WRITE_TOKEN auto-injected by Vercel on connection
- GitHub push required BOeden to have Write collaborator access on makeai12555/landing-generator — granted before push

## Deviations from Plan

None - plan executed exactly as written. The push permission issue was resolved by the user before this continuation agent ran (BOeden granted Write access to makeai12555/landing-generator).

## Issues Encountered

- Initial push attempt failed due to GitHub permissions (BOeden lacked write access to makeai12555/landing-generator). Resolved by user granting collaborator Write access before this execution continued.

## User Setup Required

This plan required two human-action checkpoints:

1. **Task 1:** Reconnect Vercel project to `makeai12555/landing-generator` in Vercel dashboard
2. **Task 3:** Create Vercel Blob store and set all production environment variables in Vercel dashboard

Both completed by user before auto-deploy triggered.

## Next Phase Readiness

- Production deployment live and verified — ready for Phase 3 (Registration flow)
- Landing pages created in production will persist to Blob storage
- Banner images stored in Blob — no local filesystem dependency
- No blockers for Phase 3

---
*Phase: 02-deploy-storage*
*Completed: 2026-02-26*
