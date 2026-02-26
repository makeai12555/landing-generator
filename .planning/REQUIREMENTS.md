# Requirements: CourseFlow

**Defined:** 2026-02-26
**Core Value:** An instructor logs in, creates a landing page, shares a URL, and tracks registrations — the complete course marketing loop in one tool.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Instructor can log in with username/password (via Google Apps Script + Sheets backend) and session is created
- [x] **AUTH-02**: Unauthenticated users are redirected to /login when accessing protected routes (/create, /api/*)
- [x] **AUTH-03**: Instructor can log out and session is cleared

### Deployment

- [ ] **DEPL-01**: Landing data persists on Vercel (migrate from fs.writeFile to Vercel Blob or equivalent)
- [ ] **DEPL-02**: App is deployed on Vercel with all env vars configured
- [ ] **DEPL-03**: Instructors can share production URLs to landing pages (e.g. https://domain.com/l/[id])

### Banner Editing

- [ ] **BNRE-01**: Instructor can type a free-text instruction to refine an existing banner (chat-style)
- [ ] **BNRE-02**: Refined banner replaces the original in the landing page JSON

### Google Sheets Integration

- [ ] **SHTS-01**: A separate Google Sheet is created automatically when a new course landing is created
- [ ] **SHTS-02**: Instructor sees a link to their course's Google Sheet after creation

### Feedback

- [ ] **FDBK-01**: Feedback Google Form is automatically created and sent to registrants when course end date passes
- [ ] **FDBK-02**: Course creation flow captures course end date

## v2 Requirements

### Authentication

- **AUTH-V2-01**: Session persistence across browser refresh (stay logged in)
- **AUTH-V2-02**: Graceful session expiry with redirect back to login

### Dashboard

- **DASH-01**: Instructor sees a list of their created courses
- **DASH-02**: Registration count visible per course in dashboard

### Notifications

- **NOTF-01**: Email confirmation sent to registrants after registration

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth / Google sign-in | Username/password via Google Sheets is sufficient for this org |
| Visual drag-and-drop banner editor | Chat-style refinement is simpler and better for non-technical users |
| Database migration (Supabase/Postgres) | JSON files + Google Sheets sufficient for 50 instructors |
| Real-time registration dashboard | Google Sheets already provides live view |
| Payment processing | Municipal youth programs are free |
| Multi-language support | Hebrew only for this department |
| Mobile native app | Web-only, responsive design |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| DEPL-01 | Phase 2 | Pending |
| DEPL-02 | Phase 2 | Pending |
| DEPL-03 | Phase 2 | Pending |
| BNRE-01 | Phase 3 | Pending |
| BNRE-02 | Phase 3 | Pending |
| SHTS-01 | Phase 4 | Pending |
| SHTS-02 | Phase 4 | Pending |
| FDBK-01 | Phase 5 | Pending |
| FDBK-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
