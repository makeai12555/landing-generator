# Codebase Structure

**Analysis Date:** 2026-02-23

## Directory Layout

```
landing-next/
├── app/                    # Next.js App Router - pages and API routes
│   ├── page.tsx           # Root page (redirects to /create)
│   ├── layout.tsx         # Root layout with fonts, metadata
│   ├── globals.css        # Global styles (Tailwind)
│   ├── create/            # Course creation flow
│   │   ├── page.tsx       # Step 1: Course details form
│   │   └── config/
│   │       └── page.tsx   # Step 2: Landing configuration
│   ├── login/
│   │   └── page.tsx       # Login page with form
│   ├── l/                 # Public landing pages
│   │   └── [id]/
│   │       └── page.tsx   # Dynamic landing page by ID
│   └── api/               # Server-side API routes
│       ├── auth/          # Authentication endpoints
│       │   ├── login/
│       │   │   └── route.ts
│       │   └── logout/
│       │       └── route.ts
│       ├── banner/
│       │   └── route.ts   # Gemini banner generation
│       ├── landing/       # Landing data retrieval
│       │   └── [id]/
│       │       └── route.ts
│       ├── logos/
│       │   └── route.ts   # Logo list endpoint
│       ├── create-landing/
│       │   └── route.ts   # Landing page creation
│       └── register/
│           └── route.ts   # Registration submission
├── components/            # React components
│   ├── course/           # Course creation components
│   │   ├── CourseForm.tsx
│   │   ├── BannerPreview.tsx
│   │   └── LogoPicker.tsx
│   ├── landing/          # Landing page components
│   │   ├── Hero.tsx
│   │   ├── CourseDetails.tsx
│   │   ├── DetailItem.tsx
│   │   └── RegistrationForm.tsx
│   └── ui/               # Shared UI components
│       ├── Icon.tsx
│       └── LogoutButton.tsx
├── lib/                  # Utility functions
│   ├── auth.ts          # Session token management
│   └── colors.ts        # Color manipulation utilities
├── constants/            # Constants and config
│   └── fonts.ts         # Hebrew font definitions
├── types/               # TypeScript type definitions
│   ├── course.ts        # CourseData, CourseDetails, etc.
│   └── landing.ts       # LandingPageData schema
├── data/                # Persistent data storage
│   └── landings/        # JSON files for landing pages
│       └── {id}.json    # Per-landing JSON file
├── public/              # Static assets
│   ├── brand/
│   │   └── logos/       # Brand logo files
│   └── fonts/           # Downloaded font files
├── node_modules/        # Dependencies
├── .next/               # Next.js build output (gitignored)
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── next.config.ts       # Next.js configuration
├── .gitignore           # Git ignore rules
└── README.md            # Project documentation
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router structure - contains all pages and API routes
- Contains: Page components (.tsx), API route handlers (.ts), shared layout
- Key files: `layout.tsx` (root layout), route files (HTTP handlers)

**app/api/:**
- Purpose: Backend API endpoints
- Contains: Server-side handlers for banner generation, landing creation, authentication, registration
- All routes use Next.js server components and `NextResponse.json()` pattern

**app/create/:**
- Purpose: Two-step course creation wizard
- Contains: Step 1 form page (`page.tsx`), Step 2 config page (`config/page.tsx`)
- Data flows from localStorage persistence between steps

**app/l/:**
- Purpose: Public landing pages - dynamic routes by course ID
- Contains: Server-side rendered landing page with registration form
- Pattern: Dynamic segment `[id]` maps to URL `/l/{courseId}`

**components/course/:**
- Purpose: Reusable components for course creation workflow
- Contains:
  - `CourseForm.tsx`: Main form with all course detail inputs, design preferences, banner generation trigger
  - `BannerPreview.tsx`: Displays generated banner/background images with loading state
  - `LogoPicker.tsx`: Multi-select logo picker for branding

**components/landing/:**
- Purpose: Reusable components for public landing pages
- Contains:
  - `Hero.tsx`: Hero section with background image
  - `CourseDetails.tsx`: Grid layout of course information
  - `DetailItem.tsx`: Individual detail card (dates, location, etc.)
  - `RegistrationForm.tsx`: Student registration form with field validation

**components/ui/:**
- Purpose: Shared UI primitives
- Contains: Icon component for Material Symbols, LogoutButton for navigation header

**lib/:**
- Purpose: Reusable utility functions
- Contains:
  - `auth.ts`: Session token creation/verification using Web Crypto API
  - `colors.ts`: Color manipulation (adjust brightness, contrast color calculation, hex validation)

**constants/:**
- Purpose: Application constants and configuration
- Contains: Hebrew font definitions, design style mappings used in banner generation prompts

**types/:**
- Purpose: TypeScript interfaces and type definitions
- Contains:
  - `course.ts`: CourseData, CourseDetails, DesignPreferences, Branding, Logo types
  - `landing.ts`: LandingPageData immutable snapshot type

**data/landings/:**
- Purpose: Persistent storage of landing page JSON records
- Contains: `{landingId}.json` files created by `/api/create-landing`
- Generated at runtime: Each landing creation writes new file to this directory
- Not committed: JSON files are runtime generated (added to `.gitignore`)

**public/:**
- Purpose: Static assets served at root URL
- Contains: Brand logos, custom fonts, images
- Path reference: `/brand/logos/filename.ext` maps to `public/brand/logos/filename.ext`

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Root page redirects to `/create`
- `app/layout.tsx`: Root layout loads fonts, metadata, sets RTL/Hebrew
- `app/create/page.tsx`: Step 1 of course creation
- `app/l/[id]/page.tsx`: Public landing page renderer

**Configuration:**
- `tsconfig.json`: TypeScript compiler config with `@/*` path alias
- `next.config.ts`: Next.js build configuration
- `package.json`: Dependencies, build scripts
- `.gitignore`: Excludes node_modules, .next, data/landings/*.json

**Core Logic:**
- `app/api/banner/route.ts`: Gemini image generation with art direction prompts
- `app/api/create-landing/route.ts`: Landing page creation, JSON persistence, sheet creation
- `components/course/CourseForm.tsx`: Form state management, localStorage persistence
- `lib/auth.ts`: Session token generation with HMAC-SHA256

**Testing:**
- Not present in current codebase

## Naming Conventions

**Files:**
- `.tsx` for React components (server or client)
- `.ts` for utilities, types, API routes
- Directories use kebab-case: `course-details`, `landing-config`
- Component files use PascalCase: `CourseForm.tsx`, `BannerPreview.tsx`
- Utility files use camelCase: `colors.ts`, `auth.ts`

**Directories:**
- `app/` for Next.js routing
- `components/` for UI components organized by feature
- `lib/` for utilities and helpers
- `types/` for TypeScript type definitions
- `constants/` for constants and configuration
- `data/` for runtime-generated persistent data

**Components:**
- Functional components using `export function ComponentName() {}`
- Client components marked with `"use client"` directive
- Props passed as destructured parameters with type annotation

**Functions:**
- camelCase for all function names
- Async functions use `async/await` pattern
- Handler functions named as `handle{Action}` (e.g., `handleSubmit`)
- Utility functions named descriptively (e.g., `extractColorsFromImage`, `generateLandingId`)

**Types/Interfaces:**
- PascalCase for all types and interfaces
- Prefix for related types (e.g., `CourseData`, `CourseDetails`, `CourseForm`)
- Optional fields marked with `?` in interface definitions

**Variables:**
- camelCase for all variable names
- Constants use UPPER_SNAKE_CASE (e.g., `SESSION_COOKIE_NAME`, `STORAGE_KEY`)
- State variables use verb phrases (e.g., `isGenerating`, `isSaving`, `bannerStatus`)

## Where to Add New Code

**New Feature (e.g., Analytics):**
- Primary code: `lib/analytics.ts` for utility functions
- Integration: Add initialization in `app/layout.tsx`
- Components: Create new feature files in `components/` if UI needed
- API endpoint: Add new route in `app/api/{feature}/route.ts`

**New Component/Module:**
- Implementation: Place in `components/{category}/NewComponent.tsx`
- Types: Add to `types/{feature}.ts` or inline in component if small
- Styling: Use Tailwind classes; no separate CSS files
- Export: Use named export `export function ComponentName() {}`

**Utilities/Helpers:**
- Shared helpers: Add to `lib/` directory with descriptive filename
- Feature-specific helpers: Colocate with components in `components/{category}/` or keep in `lib/`
- Type definitions: Define types in `types/` or at top of utility file if not shared

**API Endpoints:**
- New action: Create `app/api/{action}/route.ts` with `POST`, `GET`, `PUT`, `DELETE` handlers
- Proxy endpoints: Keep in `app/api/` at root level or grouped by service
- Response format: Always return `Response.json({ success, data/error })` structure
- Environment vars: Use process.env for all configuration (API keys, URLs)

**Constants/Configuration:**
- Add to `constants/` directory with descriptive filename
- Export as objects or arrays for easy usage
- Document purpose and usage in comments

## Special Directories

**data/landings/:**
- Purpose: Runtime-generated landing page JSON files
- Generated: By `/api/create-landing` route when user creates a landing
- Committed: No, added to `.gitignore`
- Persists: Until deleted manually or cleanup process runs
- Schema: Each file matches `LandingPageData` interface from `types/landing.ts`

**.next/:**
- Purpose: Next.js build output and development cache
- Generated: Automatically by Next.js during build/dev
- Committed: No, added to `.gitignore`
- Cleanup: Safe to delete; will be regenerated on next `next build` or `next dev`

**node_modules/:**
- Purpose: Installed npm dependencies
- Generated: By `npm install` or `npm ci`
- Committed: No
- Managed: Via package-lock.json or similar lock file

**public/:**
- Purpose: Static assets served at URL root
- Contains: Brand logos, icons, fonts
- Access: Reference as `/public/path` in img src or link href
- Committed: Yes, source assets committed

