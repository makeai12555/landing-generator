# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- TypeScript 5.x - Full codebase including React components, Next.js routes, and utilities
- JSX/TSX - React component development

**Secondary:**
- JavaScript (Node.js runtime for API routes and utilities)

## Runtime

**Environment:**
- Node.js (via Next.js server runtime)
- Browser runtime (React 19 on client)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.3 - Full-stack React framework with API routes, file-based routing, SSR/static generation
- React 19.2.3 - UI component library

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework with @tailwindcss/postcss 4
- PostCSS 4 - CSS processing pipeline

**Testing:**
- No testing framework detected (no Jest, Vitest, or test runners configured)

**Build/Dev:**
- TypeScript compiler (tsc) - Type checking and transpilation
- Next.js build system - Incremental compilation and optimization
- ESLint 9 - Code linting
- eslint-config-next 16.1.3 - Next.js specific linting rules

## Key Dependencies

**Critical:**
- `@google/genai` 1.38.0 - Google Generative AI SDK for Gemini image generation and text models
- `node-vibrant` 4.0.4 - Extracts dominant colors from images for banner palette analysis

**Infrastructure:**
- `next` 16.1.3 - Server, routing, and framework
- `react` 19.2.3 - UI rendering
- `react-dom` 19.2.3 - DOM reconciliation

**Dev Dependencies:**
- `@types/node` 20 - TypeScript definitions for Node.js APIs (fs, path, crypto)
- `@types/react` 19 - TypeScript definitions for React
- `@types/react-dom` 19 - TypeScript definitions for React DOM
- `typescript` 5 - TypeScript compiler and language server
- `tailwindcss` 4 - CSS utility framework
- `@tailwindcss/postcss` 4 - PostCSS plugin for Tailwind
- `eslint` 9 - Code quality tool
- `eslint-config-next` 16.1.3 - Next.js recommended ESLint rules

## Configuration

**Environment:**
- Loaded from `.env.local` file (Node.js standard)
- Key environment variables required (not exposed in source):
  - `GEMINI_API_KEY` - Google Gemini API authentication
  - `GEMINI_IMAGE_MODEL` - Gemini model selection for image generation
  - `SESSION_SECRET` - HMAC secret for session token signing
  - `AUTH_SCRIPT_URL` - Google Apps Script endpoint for authentication
  - `APPS_SCRIPT_URL` - Google Apps Script endpoint for landing creation and registration
  - `NEXT_PUBLIC_BASE_URL` - Public base URL (prefixed for browser access)
  - `NODE_ENV` - Development or production

**Build:**
- `tsconfig.json` - TypeScript compiler options (ES2017 target, bundler module resolution)
- `next.config.ts` - Next.js configuration (currently minimal)
- `postcss.config.mjs` - PostCSS configuration with Tailwind plugin
- `eslint.config.mjs` - ESLint configuration with Next.js core web vitals and TypeScript

**Client-Side Configuration:**
- Path aliases: `@/*` maps to project root for absolute imports

## Platform Requirements

**Development:**
- Node.js with npm
- TypeScript compiler
- Modern browser with ES2017+ support

**Production:**
- Node.js runtime (compatible with 16.1.3 requirements)
- HTTPS-capable server (secure cookies in production)
- Google Gemini API access
- Google Apps Script deployment URL

---

*Stack analysis: 2026-02-23*
