# CourseFlow — Next Features Milestone

## What This Is

A tool for creating professional flyers and landing pages in Hebrew for the Jerusalem Youth Department (אגף הנוער בירושלים). Instructors and coordinators create a professional flyer in 5 minutes with no design skills, get an automatic landing page for registration, and track sign-ups. The app already has a working 2-step creation flow, Gemini-powered banner generation, and registration forms — but needs auth, deployment, and workflow polish to be ready for 50+ instructors.

## Core Value

An instructor logs in, creates a landing page, shares a URL, and tracks registrations — the complete course marketing loop in one tool.

## Requirements

### Validated

- ✓ 2-step course creation flow (`/create` → `/create/config` → `/l/[id]`) — existing
- ✓ Gemini-powered Hebrew banner generation with art direction controls — existing
- ✓ Landing page display with registration form — existing
- ✓ Registration data saved to JSON files — existing
- ✓ Single shared Google Sheet for registrations — existing
- ✓ Color extraction from banners (node-vibrant) — existing
- ✓ Hebrew RTL support throughout UI — existing

### Active

- [ ] Working login flow for instructors (email/password via Google Sheets)
- [ ] Route protection — unauthenticated users redirected to /login
- [ ] Chat-style banner editing after creation (free-text instructions to refine)
- [ ] Separate Google Sheet created automatically per course
- [ ] Feedback form (Google Forms) auto-sent to instructors at course end
- [ ] Production deployment on Vercel with shareable URL

### Out of Scope

- OAuth/social login — email/password via Google Sheets is sufficient for this org
- Mobile native app — web-only, responsive design
- Visual banner editor (drag-and-drop) — chat-style refinement instead
- Payment processing — courses are free municipal programs
- Multi-language support — Hebrew only for this department

## Context

- Auth scaffolding exists: `proxy.ts`, `lib/auth.ts`, `/login/`, `/api/auth/`, `LogoutButton.tsx` — but login flow has undiagnosed issues
- Backend auth uses Google Apps Script checking against a Google Sheet of users
- Session management uses Web Crypto API (not middleware.ts — Next.js 16 pattern)
- All services on the organization account: `makeai12555@gmail.com`
- Gemini model `gemini-3-pro-image-preview` — paid tier active, do NOT switch
- Vercel team exists (`makeai12555s-projects`) but app not yet deployed
- Target audience: 50+ instructors, non-technical, need simple UX
- Timeline: needs to be ready this week

## Constraints

- **Tech stack**: Next.js app in `landing-next/`, Gemini for banners, Google Sheets as user DB
- **Account**: All services on `makeai12555@gmail.com` — Vercel, GitHub, Google Sheets
- **Auth backend**: Google Apps Script + Sheets — no Supabase or other DB for users
- **Storage**: JSON files for landing data, Google Sheets for registrations
- **Hebrew**: All UI must be RTL Hebrew, banners must render Hebrew text correctly
- **Timeline**: This week — ship fast, polish later

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google Sheets for user management | Already set up, fits org workflow | — Pending |
| Chat-style banner editing over visual editor | Lower complexity, leverages existing Gemini API | — Pending |
| JSON files over database | Already working, sufficient for scale | — Pending |
| proxy.ts over middleware.ts | Next.js 16 pattern | — Pending |

---
*Last updated: 2026-02-26 after initialization*
