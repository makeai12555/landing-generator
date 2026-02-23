# External Integrations

**Analysis Date:** 2026-02-23

## APIs & External Services

**Google Gemini AI:**
- Service: Google Generative AI for image and text generation
  - SDK/Client: `@google/genai` 1.38.0
  - Auth: Environment variable `GEMINI_API_KEY`
  - Models used:
    - `gemini-3-pro-image-preview` (default) - High-quality image generation, requires paid tier
    - `gemini-2.5-flash-preview-image-generation` - Free tier alternative with acceptable quality
  - Endpoint: Implicit via SDK (`models.generateContent()`)
  - Purpose: Generate professional banner images with Hebrew text and hero backgrounds for course landing pages

**Google Apps Script:**
- Service: Custom backend for authentication, sheet creation, and registration data
  - Authentication: HTTP POST to URL specified in `AUTH_SCRIPT_URL` environment variable
  - Registration: HTTP POST to `APPS_SCRIPT_URL` for user registration and Google Sheets integration
  - Landing Creation: HTTP POST to `APPS_SCRIPT_URL` with action "createSheet" to create course-specific Google Sheets
  - Actions supported:
    - `authenticate` - Validates username/password credentials
    - `createSheet` - Creates new Google Sheet for course registrations
    - `register` - Writes registration data to course-specific sheet
    - `getLanding` - Retrieves landing page configuration

**Logo Fetching:**
- Service: Internal logo fetch from project public directory or external URLs
  - Location: `./public/brand/logos.json` defines available logos
  - Endpoint: `/api/logos` - GET returns available logos
  - Fetching: Server-side in `/api/banner/route.ts` constructs absolute URLs and fetches as image data
  - Format: PNG or JPEG (SVG not supported by Gemini)

## Data Storage

**Databases:**
- No traditional database (SQL or NoSQL)

**File Storage:**
- **Local filesystem only**:
  - Course landing data: `./data/landings/{id}.json` - Stores course metadata, assets, theme, form settings
  - Logo library: `./public/brand/logos.json` - JSON manifest of available logos
  - Generated images: Stored as base64 in memory and returned via API responses

**Caching:**
- No caching layer detected
- Next.js cache control: `cache: "no-store"` used in `/api/landing/[id]/route.ts` for Apps Script fallback

## Authentication & Identity

**Auth Provider:**
- Custom via Google Apps Script
  - Implementation: HTTP proxy to Apps Script authenticate endpoint
  - Credentials: Username/password validated against external system (not stored in this app)
  - Session management: Custom HMAC-based token using Web Crypto API (`lib/auth.ts`)

**Session Management:**
- **Custom implementation** (no third-party session store):
  - Location: `lib/auth.ts`
  - Token format: `base64url(payload).base64url(hmac_signature)`
  - Payload includes username, issued-at, expiration
  - Duration: 7 days
  - Cookie name: `cf_session` (httpOnly, Secure in production, SameSite=lax)
  - Signing: HMAC-SHA256 using `SESSION_SECRET` environment variable
  - Verification: Web Crypto API (edge-compatible, no dependencies)

**Protected Routes:**
- Routes requiring authentication: `/create`, `/api/banner`, `/api/create-landing`
- Public routes: `/login`, `/api/auth/*`, `/l/*`, `/api/landing/*`, `/api/register`, `/api/logos`
- Proxy: `proxy.ts` (Next.js middleware) implements route-based authentication checks
- Redirect: Unauthenticated users redirected to `/login` with `from` parameter

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Rollbar, or similar)

**Logs:**
- Console logging only (console.log, console.error)
- Log locations: API routes log banner generation progress, logo fetching, sheet creation, Apps Script responses

## CI/CD & Deployment

**Hosting:**
- Vercel (implied by Next.js and `.vercel` in gitignore)

**CI Pipeline:**
- Not detected in codebase

## Environment Configuration

**Required env vars:**
- `GEMINI_API_KEY` - Google Gemini API key for image generation
- `GEMINI_IMAGE_MODEL` - Optional; defaults to "gemini-3-pro-image-preview"
- `SESSION_SECRET` - Secret key for session token HMAC signing
- `AUTH_SCRIPT_URL` - Google Apps Script URL for authentication
- `APPS_SCRIPT_URL` - Google Apps Script URL for landing/registration operations
- `NEXT_PUBLIC_BASE_URL` - Base URL for the application (used for logo fetching in server context)
- `NODE_ENV` - Development or production (affects secure cookie flag)

**Secrets location:**
- `.env.local` file (Node.js convention; not committed per `.gitignore`)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- HTTP POST to Apps Script for:
  - User registration data from `/api/register` endpoint
  - Sheet creation requests from `/api/create-landing` endpoint
  - User authentication from `/api/auth/login` endpoint

## Data Flow Integrations

**Course Creation Flow:**
1. User submits course form (title, subtitle, branding, design preferences)
2. `/api/banner` generates banner and hero background images via Gemini
3. Color extraction via `node-vibrant` on generated banner
4. `/api/create-landing` creates Google Sheet via Apps Script
5. Landing data saved locally to `data/landings/{id}.json`
6. User redirected to landing at `/l/{id}`

**Registration Flow:**
1. User submits registration form on landing page
2. `/api/register` proxies form data to Apps Script with course's `sheetId`
3. Apps Script writes registration to course-specific Google Sheet
4. Response returned to client

**Landing Retrieval Flow:**
1. GET `/api/landing/{id}` checks local file first (`data/landings/{id}.json`)
2. Falls back to Apps Script if local file not found
3. Returns landing configuration JSON

---

*Integration audit: 2026-02-23*
