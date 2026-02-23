# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Full-stack Next.js application with two-phase course creation flow and dynamic landing page generation. Implements a **layered architecture** with clear separation between client-side form handling, server-side business logic, and external service integration.

**Key Characteristics:**
- Server-side rendering for public landing pages with client-side interactivity for course creation
- API routes acting as bridges to external services (Gemini for image generation, Google Apps Script for auth/data)
- Hybrid storage: localStorage for form state persistence, JSON files for landing page data, Google Sheets for registrations
- Real-time banner preview and color extraction from generated images

## Layers

**Presentation Layer:**
- Purpose: User interface components and page layouts
- Location: `app/` pages and `components/` directory
- Contains: React components, forms, preview panels, landing page templates
- Depends on: Utility functions, type definitions, API routes
- Used by: Browser clients, Next.js rendering engine

**Page/Route Layer:**
- Purpose: Entry points for HTTP requests and page rendering
- Location: `app/**/*.tsx` (page components) and `app/api/**/*.ts` (API routes)
- Contains: Page layouts, API handlers, form containers
- Depends on: Business logic, external services, type definitions
- Used by: Next.js router, browser requests

**Business Logic Layer:**
- Purpose: Core application workflows and transformations
- Location: `components/course/` (form handling), `app/api/` route handlers
- Contains: Form validation, banner generation orchestration, landing page creation
- Depends on: External APIs (Gemini, Apps Script), data access layer
- Used by: Page layer, API routes

**Service/Integration Layer:**
- Purpose: Communication with external services
- Location: `app/api/banner/route.ts`, `app/api/landing/[id]/route.ts`, `app/api/create-landing/route.ts`
- Contains: API clients (GoogleGenAI, fetch calls to Apps Script)
- Depends on: Environment configuration, type definitions
- Used by: Business logic layer

**Data/State Layer:**
- Purpose: Persistent state and data retrieval
- Location: `data/landings/` (JSON files), `types/` (schemas)
- Contains: TypeScript interfaces, JSON landing page records, form state (localStorage)
- Depends on: File system, browser storage APIs
- Used by: All layers

**Utilities Layer:**
- Purpose: Reusable helper functions
- Location: `lib/colors.ts`, `lib/auth.ts`, `constants/`
- Contains: Color manipulation, session token generation, font/design constants
- Depends on: Web Crypto API, type definitions
- Used by: Business logic and presentation layers

## Data Flow

**Course Creation Flow:**

1. **Initial Entry** (`/create`): User lands on step 1 form page
2. **Form Input** (`CourseForm.tsx`): Collects course details, design preferences, logo selection
3. **Local State**: Data persisted to localStorage with key `courseData`
4. **Banner Generation**: User triggers `/api/banner` POST with course data and design params
5. **Gemini Processing**: API route calls GoogleGenAI with detailed art direction prompt
6. **Color Extraction**: node-vibrant extracts dominant colors from generated banner image
7. **State Update**: Banner URLs and extracted colors saved to localStorage and React state
8. **Step 2 Navigation** (`/create/config`): User advances to config page with all data loaded
9. **Landing Config**: Extended description, interview requirement, Hebrew font selection
10. **Landing Creation**: User clicks "Create Landing" → `/api/create-landing` POST
11. **Sheet Creation**: Apps Script creates dedicated Google Sheet for registrations
12. **Data Persistence**: Landing data saved to JSON file in `data/landings/{id}.json`
13. **Redirect**: User navigated to `/l/{id}` public landing page

**Landing Page Display Flow:**

1. **Request**: User visits `/l/{id}` public landing page
2. **Data Fetch** (server-side): `getLandingData()` retrieves from local JSON file or Apps Script fallback
3. **Metadata Generation**: Page title and description set for SEO
4. **Theme Injection**: CSS custom properties injected for colors, fonts dynamically loaded
5. **Component Rendering**: Hero, CourseDetails, RegistrationForm components assembled
6. **Form Submission**: Registration data sent to `/api/register` proxy
7. **Apps Script Proxy**: Registration forwarded to Google Sheet for the specific course

**State Management:**

- **Client-side**: React state (`useState`) for form inputs, loading states; localStorage for persistence across sessions
- **Server-side**: JSON file-based storage in `data/landings/` for landing page data
- **External**: Google Sheets via Apps Script for user registrations, session tokens in httpOnly cookies

## Key Abstractions

**CourseData Object:**
- Purpose: Represents complete course information from creation to landing page
- Examples: `types/course.ts`, used throughout form and API routes
- Pattern: TypeScript interface with nested objects for course_details, branding, design_preferences, generated_assets
- Structure preserves camelCase (JS) and snake_case (API) versions of field names

**LandingPageData Object:**
- Purpose: Immutable snapshot of a landing page after creation
- Examples: `types/landing.ts`, stored as JSON in `data/landings/{id}.json`
- Pattern: Flattened structure for JSON serialization, contains all needed info for rendering without API calls
- Contracts between backend creation and frontend rendering

**Design Preferences Maps:**
- Purpose: Translate user-friendly dropdown selections into detailed Gemini prompt instructions
- Examples: `STYLE_MAP`, `COLOR_MAP`, `MATERIAL_MAP`, `VISUAL_STYLE_MAP`, `COMPOSITION_RULE_MAP`, `LIGHTING_MOOD_MAP`, `COLOR_MOOD_MAP`
- Pattern: Key-value mappings in `app/api/banner/route.ts` (lines 95-151)
- Enables art direction framework - separates visual style concepts from content elements

**Logo Integration:**
- Purpose: Support up to 4 branded logos in generated banners
- Examples: `Logo` interface in `types/course.ts`, logo placement config in `app/api/banner/route.ts`
- Pattern: Logos fetched, converted to base64, passed as inline images to Gemini prompt
- SVG filtering: SVG files detected and excluded (not supported by Gemini image gen)

## Entry Points

**Public Landing Page:**
- Location: `app/l/[id]/page.tsx`
- Triggers: Direct URL access or redirect from `/create/config`
- Responsibilities: Server-side data fetching, SEO metadata, theme injection, rendering public landing with registration form

**Course Creation Step 1:**
- Location: `app/create/page.tsx`
- Triggers: User navigates to `/create` or root redirect
- Responsibilities: Layout and header, progress bar, mounting CourseForm component

**Course Creation Step 2:**
- Location: `app/create/config/page.tsx`
- Triggers: User clicks "Next" from step 1
- Responsibilities: Load localStorage data, display summary + landing config options, handle banner/background preview, trigger landing creation

**Login Page:**
- Location: `app/login/page.tsx`
- Triggers: Authentication required, redirect from protected routes
- Responsibilities: Form submission to `/api/auth/login`, session token creation via cookies

**Banner Generation API:**
- Location: `app/api/banner/route.ts`
- Triggers: POST from CourseForm.tsx generate button
- Responsibilities: Validate input, construct art direction prompt, call Gemini, extract colors, return base64 images

**Landing Creation API:**
- Location: `app/api/create-landing/route.ts`
- Triggers: POST from config page confirm button
- Responsibilities: Generate unique ID, create Google Sheet, save JSON locally, return landing URL

**Landing Retrieval API:**
- Location: `app/api/landing/[id]/route.ts`
- Triggers: Server-side data fetching from landing page component
- Responsibilities: Try local file first, fallback to Apps Script, return LandingPageData JSON

**Registration API:**
- Location: `app/api/register/route.ts`
- Triggers: POST from RegistrationForm on public landing page
- Responsibilities: Proxy registration data to Apps Script with correct sheetId for the course

## Error Handling

**Strategy:** Try-catch blocks at API boundaries, client-side validation before submission, fallback mechanisms for data retrieval

**Patterns:**
- API routes catch errors and return JSON with `success: false` and descriptive error messages in Hebrew
- Client components show toast-like error messages via state (e.g., `bannerStatus` in CourseForm)
- Banner generation validates form before sending request, clears old banners on new attempts
- Landing retrieval tries local file first, fails gracefully with 404 if Apps Script also unavailable
- Session validation uses try-catch in `verifySessionToken()`, returns null on signature verification failure or expiration

## Cross-Cutting Concerns

**Logging:** Console.log statements in API routes for debugging (banner generation status, sheet creation, landing retrieval flow). Production should be monitored via external logging service.

**Validation:**
- Client-side: Form validation in `CourseForm.validateForm()` checks required fields
- API-side: Request body validation for banner, landing creation, registration payloads
- Type safety: TypeScript strict mode enforces correct data shapes

**Authentication:**
- Session tokens created with HMAC-SHA256 signature using `SESSION_SECRET`
- httpOnly cookies prevent XSS access, `sameSite: "lax"` prevents CSRF
- Login proxied to Apps Script for credential verification
- 7-day max age for session tokens

**Hebrew/RTL Support:**
- All pages set `lang="he" dir="rtl"` in HTML
- Noto Sans Hebrew font loaded via Google Fonts for Hebrew text
- Gemini prompts explicitly instruct RTL text generation
- CSS uses `rtl:` modifiers for conditional Tailwind utilities on RTL elements

