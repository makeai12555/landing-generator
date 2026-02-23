# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- API routes: `route.ts` (Next.js convention) - `c:\Users\boede\projects\courseflow\landing-next\app\api\banner\route.ts`, `c:\Users\boede\projects\courseflow\landing-next\app\api\create-landing\route.ts`
- Components: PascalCase with .tsx extension - `CourseForm.tsx`, `BannerPreview.tsx`, `RegistrationForm.tsx`
- Utilities/libs: camelCase with .ts extension - `auth.ts`, `colors.ts`
- Types: descriptive names in files - `course.ts`, `landing.ts`
- Barrel exports: `index.ts` for component grouping - `c:\Users\boede\projects\courseflow\landing-next\components\course\index.ts`

**Functions:**
- camelCase for all functions: `generateLandingId()`, `generateBannerImage()`, `updateCourseDetails()`, `validateForm()`, `extractColorsFromImage()`
- Event handlers: `handle*` prefix - `handleSubmit()`, `handleReferralChange()`, `onClick()`
- React hooks usage: `useRouter()`, `useEffect()`, `useState()`, `useCallback()`
- Async functions clearly named: `async function generateHeroBackground()`

**Variables:**
- camelCase for all variables and constants: `courseData`, `bannerStatus`, `isMounted`, `landingId`, `formState`
- Boolean variables prefixed with `is`, `has`, `should`: `isMounted`, `isSaving`, `isGenerating`, `showOtherField`, `requiresInterview`, `validLogos`
- State setter convention: `setCourseData()`, `setFormState()`, `setBannerStatus()`
- Constants in UPPER_SNAKE_CASE: `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE`, `STORAGE_KEY`, `DEFAULT_REFERRAL_OPTIONS`, `MODEL`, `LOGO_PLACEMENTS`

**Types:**
- PascalCase for all interfaces and types: `CourseData`, `CourseDetails`, `BannerRequest`, `SessionPayload`, `DesignPreferences`
- Optional properties marked with `?`: `design?: DesignPreferences`, `colors?: BrandingColors`
- Union types for limited options: `formState: "idle" | "submitting" | "success"`, `visual_style: 'photorealistic' | 'three_d_render' | 'vector_flat' | 'abstract_tech' | 'hand_drawn'`

## Code Style

**Formatting:**
- ESLint 9 with Next.js config (eslint-config-next) for enforcement
- Config file: `c:\Users\boede\projects\courseflow\landing-next\eslint.config.mjs`
- No Prettier configuration detected - using ESLint defaults
- TypeScript strict mode enabled: `"strict": true` in tsconfig

**Linting:**
- ESLint extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Active warnings:
  - `@next/next/no-img-element`: Use `<Image />` instead of `<img>` for optimization
  - `@next/next/no-page-custom-font`: Custom fonts should be in _document.js
  - `react-hooks/set-state-in-effect`: Avoid setState synchronously in useEffect
- Example violation in `c:\Users\boede\projects\courseflow\landing-next\components\course\LogoPicker.tsx:22` - direct setState in effect

**Line length:** No explicit limit enforced, but code tends to stay under 120 characters

## Import Organization

**Order:**
1. React/Next.js framework imports: `import type { Metadata } from "next"`, `import { useState, useEffect } from "react"`
2. Next.js utilities: `import { useRouter } from "next/navigation"`, `import { NextResponse } from "next/server"`
3. External packages: `import { GoogleGenAI } from "@google/genai"`, `import { Vibrant } from "node-vibrant/node"`
4. Alias imports (from `@/`): `import type { CourseData } from "@/types/course"`, `import { CourseForm } from "@/components/course"`
5. Local relative imports: `import { extractImageFromResponse } from "./helpers"` (rare, mostly using alias)

**Path Aliases:**
- `@/*` resolves to project root - `c:\Users\boede\projects\courseflow\landing-next\*`
- Examples: `@/types/course`, `@/components/course`, `@/lib/auth`, `@/constants/fonts`

**Client/Server:**
- Client components: `"use client"` directive at top - `c:\Users\boede\projects\courseflow\landing-next\components\course\CourseForm.tsx`
- Server components: No directive, used in pages
- API routes: `export async function POST(req: Request)` or `GET` pattern
- Runtime exports: `export const runtime = "nodejs"` for backend-specific routes

## Error Handling

**Patterns:**
- Try-catch with specific error extraction: `error instanceof Error ? error.message : "Unknown error"`
- Console logging for debugging: `console.log()`, `console.error()`, `console.warn()`
- API error responses: `Response.json({ ok: false, error: message }, { status: 400 })`
- NextResponse for success: `NextResponse.json({ success: true, ... })`

**Examples:**

From `c:\Users\boede\projects\courseflow\landing-next\app\api\banner\route.ts`:
```typescript
try {
  const body = await req.json();
} catch {
  return Response.json(
    { ok: false, error: "Invalid JSON body" },
    { status: 400 }
  );
}

// Type guard for error message extraction
const message = error instanceof Error ? error.message : "Unknown error";
return Response.json(
  { ok: false, error: message },
  { status: 502 }
);
```

From `c:\Users\boede\projects\courseflow\landing-next\components\course\CourseForm.tsx`:
```typescript
try {
  const response = await fetch("/api/banner", { ... });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Banner generation failed");
  }
} catch (error) {
  console.error("Banner generation error:", error);
  setBannerStatus(`שגיאה ביצירת באנר: ${error instanceof Error ? error.message : "Unknown error"}`);
}
```

## Logging

**Framework:** Native `console` object

**Patterns:**
- Debug info: `console.log()` - Used extensively for API requests, data processing
- Errors: `console.error()` - Used for failures, exceptions
- Warnings: `console.warn()` - Used for non-critical issues (e.g., failed logo fetch)

**Examples:**
- `console.log("=== CREATE LANDING PAGE ===")` - Process markers
- `console.log(JSON.stringify(courseData, null, 2))` - Pretty-printed data
- `console.error("Failed to extract colors:", error)` - Error context
- `console.warn("Failed to fetch logo:", logo.name, logoResponse.status)` - Non-fatal issues

## Comments

**When to Comment:**
- Comments used sparingly - code is mostly self-documenting
- JSDoc used for utility functions and public APIs

**JSDoc/TSDoc:**
Used in `c:\Users\boede\projects\courseflow\landing-next\lib\colors.ts`:
```typescript
/**
 * Darken or lighten a hex color by a percentage
 * @param hex - Hex color string (e.g., "#13ecda")
 * @param percent - Negative to darken, positive to lighten
 * @returns Modified hex color
 */
export function adjustColor(hex: string, percent: number): string
```

Comments in code mostly explain "why" not "what":
- `// Generate unique ID` - Purpose
- `// Extract dominant colors from the banner` - Intent
- `// Map design preferences to English descriptions for visual style` - Context

## Function Design

**Size:** Functions generally stay under 50 lines; larger functions (e.g., `generateBannerImage`) are complex due to prompt construction

**Parameters:**
- Explicit typed parameters in interfaces: `function generateBannerImage(client: GoogleGenAI, course: CourseData, ...)`
- Optional parameters: `design?: DesignPreferences`
- Callback pattern for state updates: `useCallback((data: CourseData) => { ... }, [])`

**Return Values:**
- Explicit return types in async functions: `async function generateBannerImage(...): Promise<Uint8Array>`
- Success/failure pattern for APIs: `{ success: true, ... }` or `{ success: false, error: "..." }`
- Null returns for optional operations: `return null;` in `extractImageFromResponse()`
- Promise-wrapped returns: `return new Promise((resolve) => { ... })`

## Module Design

**Exports:**
- Named exports preferred: `export function Icon({ ... })`
- Default exports rare: Used for page components
- Interface exports: `export interface CourseData { ... }`
- Constant exports: `export const SESSION_COOKIE_NAME = "cf_session"`

**Barrel Files:**
Used in `c:\Users\boede\projects\courseflow\landing-next\components\course\index.ts`:
```typescript
export { CourseForm } from "./CourseForm";
export { BannerPreview } from "./BannerPreview";
export { LogoPicker } from "./LogoPicker";
```

**Type Separation:**
- Shared types in dedicated files: `c:\Users\boede\projects\courseflow\landing-next\types\course.ts`, `c:\Users\boede\projects\courseflow\landing-next\types\landing.ts`
- Route-specific types in route files: `interface CourseData { ... }` defined where used
- Map/lookup constants near functions: `const STYLE_MAP: Record<string, string> = { ... }` in banner route

## State Management

**Client Components:**
- React hooks: `useState()`, `useEffect()`, `useCallback()`
- localStorage for persistence: `localStorage.getItem(STORAGE_KEY)`, `localStorage.setItem(STORAGE_KEY, ...)`
- State updates via setter with spread operator for immutability:
```typescript
setCourseData((prev) => {
  const updated = { ...prev, field: newValue };
  saveToStorage(updated);
  return updated;
});
```

**API Layer:**
- Request/response pattern through fetch API
- No global state management (Redux, Zustand)
- Form data via FormData API: `const formData = new FormData(e.currentTarget)`

---

*Convention analysis: 2026-02-23*
