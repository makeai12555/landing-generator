# Phase 2: Deploy + Storage - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate file-based JSON storage to Vercel Blob and deploy the app to production Vercel. Landing pages must persist across requests and be publicly shareable via URL. Auth, banner generation, and the creation flow already work from Phase 1 — this phase makes them production-ready.

</domain>

<decisions>
## Implementation Decisions

### Production URL & hosting
- Deploy to existing Vercel project `courseflow-landing` (default vercel.app URL)
- No custom domain — `courseflow-landing.vercel.app` is the production URL
- Landing page URLs: `courseflow-landing.vercel.app/l/[id]` with generated IDs (current format)
- Auto-deploy on push to master via GitHub integration

### Environment & secrets
- All env vars set via Vercel dashboard (not CLI, not code)
- Existing secrets from `.env.local` are copied to Vercel production environment — no new credentials needed
- Vercel Blob storage token created as part of deployment (new Blob store provisioned during this phase)
- Production-only configuration — no separate preview environment setup

### Claude's Discretion
- Vercel Blob migration approach (how to refactor fs.readFile/fs.writeFile to Blob SDK)
- Banner image storage strategy (same Blob store or separate)
- Build configuration and Next.js output settings for Vercel
- Error handling for Blob operations
- Whether to add a health check endpoint

</decisions>

<specifics>
## Specific Ideas

- Vercel project `courseflow-landing` is currently connected to the wrong GitHub repo (`makeai12555/courseflow-landing`). The correct repo is `makeai12555/landing-generator` (branch: `master`). Reconnecting Vercel to the correct repo must be the first step in this phase.
- All services are on the organization account `makeai12555@gmail.com` — Vercel, GitHub, Google Sheets
- Vercel team is `makeai12555s-projects` (ID: `team_fV9hFBKyNKPZ78grlw5KIAeO`)
- The app currently redirects to `/login` when unauthenticated — this should work the same in production

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-deploy-storage*
*Context gathered: 2026-02-26*
