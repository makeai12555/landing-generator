# Phase 3: Banner Editing - Research

**Researched:** 2026-02-27
**Domain:** Gemini image editing API + Next.js instructor-only UI overlay
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Editing interface:** Floating chat bubble on the landing page (`/l/[id]`). Corner icon opens a panel. Only visible to logged-in instructors. Visitors see the plain landing page unchanged.
- **Input:** Single text input field, no conversation history shown — clean and simple.
- **Refinement flow:** 3-5 round limit per course (exact count at Claude's discretion). Show remaining count to instructor. "Revert to original" button restores the first-ever banner. Reverting does NOT reset the counter — every generation (including rejected ones) counts toward the limit.
- **Preview & replacement:** New banner shows in-place (replaces current visually) with floating Accept/Reject buttons. Rejections still count. On accept: both `bannerUrl` and `backgroundUrl` are updated in the landing JSON immediately.
- **Both images regenerated together:** Banner (with Hebrew text) and background (text-free) are always regenerated as a pair to stay visually consistent.
- **Instruction guidance:** Rotating placeholder text with Hebrew examples (e.g. "תעשה את הרקע כהה יותר"). No tooltips, no suggestion chips.
- **Download button:** Visible to logged-in instructors on the landing page, positioned near the chat bubble. Always downloads the latest accepted banner version.

### Claude's Discretion

- Exact refinement limit number (within 3-5 range)
- Chat bubble positioning and animation details
- Placeholder example rotation logic
- Download button icon and placement details
- Loading spinner/shimmer design
- Accept/Reject button styling

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BNRE-01 | Instructor can type a free-text instruction to refine an existing banner (chat-style) | Gemini API image editing with inlineData supports passing existing image + text instruction. New API route `/api/refine-banner` handles this. |
| BNRE-02 | Refined banner replaces the original in the landing page JSON | `saveLanding()` in `lib/storage.ts` already supports overwrite via `allowOverwrite: true`. New `PATCH /api/landing/[id]` route updates `bannerUrl`, `backgroundUrl`, and `theme` colors in Blob. |
</phase_requirements>

---

## Summary

Phase 3 adds banner refinement to the landing page (`/l/[id]`). The core technical challenge is threefold: (1) detecting whether the current viewer is a logged-in instructor server-side and passing that signal to client components, (2) calling the Gemini API with an existing image + free-text Hebrew instruction to produce a refined image, and (3) persisting the accepted result back to Vercel Blob.

The Gemini API (`gemini-3-pro-image-preview`, already in use) natively supports image editing by accepting `inlineData` (base64 image) alongside a text prompt in the same `generateContent` call. No additional API or model is needed. The existing `/api/banner/route.ts` pattern (parallel generation of banner + background, color extraction, return as base64) can be reused almost verbatim for a new `/api/refine-banner` route that additionally accepts the current banner image URL.

The instructor-only UI (`<RefinementPanel>`) must be a `"use client"` component. The landing page (`/l/[id]/page.tsx`) is a Server Component that reads the session cookie via `cookies()` from `next/headers`, verifies it with `verifySessionToken()`, and passes a boolean `isInstructor` prop down to the panel. This avoids any client-side cookie reading and keeps auth logic server-side.

**Primary recommendation:** Build a `/api/refine-banner` API route that fetches the current banner from its Blob URL, passes it as `inlineData` alongside the Hebrew instruction to Gemini, regenerates both images in parallel, and returns base64 results. Store the refinement counter and original banner URLs inside the landing JSON itself (new fields). The `<RefinementPanel>` client component handles UI state (panel open/closed, loading, preview, accept/reject).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | ^1.38.0 (already installed) | Gemini image editing via `generateContent` with `inlineData` | Same SDK already used for banner generation — no new dependency |
| `@vercel/blob` | ^2.3.0 (already installed) | Overwrite existing banner Blob on accept | `allowOverwrite: true` is already the pattern in `lib/storage.ts` |
| Next.js | 16.1.3 (already installed) | API route for refinement, Server Component auth check | Existing framework |
| React | 19.2.3 (already installed) | `"use client"` RefinementPanel component | Existing framework |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node-vibrant` | ^4.0.4 (already installed) | Re-extract theme colors from refined banner | Already used in `/api/banner` — same call needed for refinement |
| Tailwind CSS | ^4 (already installed) | Floating panel, spinner, Accept/Reject buttons styling | Existing styling system |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `/api/refine-banner` route | Server Action | Server Actions are cleaner for co-location but this project uses API routes exclusively — stay consistent |
| Fetch current image from Blob URL | File API (Gemini) | File API adds complexity; images are under 4MB, direct fetch + base64 encode is sufficient |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
landing-next/
├── app/
│   ├── api/
│   │   ├── refine-banner/
│   │   │   └── route.ts          # NEW: POST — refine existing banner
│   │   └── landing/
│   │       └── [id]/
│   │           └── route.ts      # PATCH handler added — update landing JSON
│   └── l/
│       └── [id]/
│           └── page.tsx          # UPDATED: detect instructor, pass isInstructor prop
├── components/
│   └── landing/
│       ├── RefinementPanel.tsx   # NEW: "use client" floating chat bubble + panel
│       └── index.ts              # UPDATED: export RefinementPanel
└── types/
    └── landing.ts                # UPDATED: add refinements fields to LandingPageData
```

### Pattern 1: Server Component Auth Check → Client Prop

The landing page (`/l/[id]/page.tsx`) is a Server Component. Read the session cookie here and pass `isInstructor` as a boolean prop to `<RefinementPanel>`.

```typescript
// app/l/[id]/page.tsx (server component)
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export default async function LandingPage({ params }) {
  const { id } = await params;
  const data = await getLandingData(id);
  if (!data) notFound();

  // Auth check — server side only
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let isInstructor = false;
  if (token) {
    const session = await verifySessionToken(token);
    // Only the instructor who created this landing sees editing UI
    isInstructor = session?.username === data.instructorEmail;
  }

  return (
    <>
      <Hero ... />
      {isInstructor && (
        <RefinementPanel
          landingId={data.id}
          currentBannerUrl={data.assets.bannerUrl}
          currentBackgroundUrl={data.assets.backgroundUrl}
          originalBannerUrl={data.refinements?.originalBannerUrl}
          originalBackgroundUrl={data.refinements?.originalBackgroundUrl}
          refinementsUsed={data.refinements?.count ?? 0}
          refinementLimit={5}
        />
      )}
    </>
  );
}
```

**Source:** [Next.js cookies() API](https://nextjs.org/docs/app/api-reference/functions/cookies) — `cookies()` from `next/headers` works in Server Components (async).

### Pattern 2: Gemini Image Editing via inlineData

To refine an existing image, fetch it from its Blob URL, convert to base64, and pass as `inlineData` alongside the Hebrew instruction text:

```typescript
// app/api/refine-banner/route.ts
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  const { landingId, instruction, currentBannerUrl, currentBackgroundUrl, courseData, designData } = await req.json();

  // Fetch current banner image from Vercel Blob
  const bannerResponse = await fetch(currentBannerUrl);
  const bannerBuffer = await bannerResponse.arrayBuffer();
  const bannerBase64 = Buffer.from(bannerBuffer).toString("base64");

  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3-pro-image-preview";

  // Refinement prompt: existing image + Hebrew instruction
  const refinementParts = [
    { text: `${instruction}\n\nKeep all Hebrew text exactly as it appears. Maintain the same course title and subtitle. Only change the visual elements described in the instruction.` },
    { inlineData: { mimeType: "image/png", data: bannerBase64 } },
  ];

  // Also fetch background for consistent refinement
  const bgResponse = await fetch(currentBackgroundUrl);
  const bgBuffer = await bgResponse.arrayBuffer();
  const bgBase64 = Buffer.from(bgBuffer).toString("base64");

  const bgRefinementParts = [
    { text: `${instruction}\n\nThis is the background version (NO TEXT). Apply the same visual change. Keep it a clean background suitable for text overlay.` },
    { inlineData: { mimeType: "image/png", data: bgBase64 } },
  ];

  // Generate both in parallel
  const [bannerResponse2, bgResponse2] = await Promise.all([
    client.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: refinementParts }],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    }),
    client.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: bgRefinementParts }],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  ]);

  // Extract image bytes from response (same helper as existing banner route)
  // ... extractImageFromResponse()
  // Return base64 of both
}
```

**Source:** [Gemini API image editing docs](https://ai.google.dev/gemini-api/docs/image-generation) — confirmed: `inlineData` with base64 + text instruction = image editing.

### Pattern 3: Landing JSON Schema Extension

Add a `refinements` field to `LandingPageData` to track the counter, original URLs, and deferred revert capability:

```typescript
// types/landing.ts — add to LandingPageData
refinements?: {
  count: number;           // total generations used (includes rejected)
  limit: number;           // cap (5 by default)
  originalBannerUrl?: string;     // URL of the first-ever generated banner
  originalBackgroundUrl?: string; // URL of the first-ever background
};
```

The first time a refinement is accepted, capture and save the original URLs. On "Revert to original", restore `assets.bannerUrl` and `assets.backgroundUrl` to the originals (but do NOT decrement `count`).

### Pattern 4: PATCH /api/landing/[id] for Accepting Refinements

A new PATCH handler updates only the asset URLs, theme colors, and refinements counter:

```typescript
// app/api/landing/[id]/route.ts — add PATCH
export async function PATCH(req: Request, { params }) {
  // Auth check via cookie (same pattern as create-landing)
  const { bannerUrl, backgroundUrl, theme, refinementsCount } = await req.json();
  const landing = await getLanding(id);
  // Update only the changed fields, re-save
  await saveLanding(id, { ...landing, assets: { bannerUrl, backgroundUrl }, theme, refinements: { ...landing.refinements, count: refinementsCount } });
  return Response.json({ ok: true });
}
```

### Pattern 5: RefinementPanel Client Component

The panel is a self-contained `"use client"` component. UI states:

1. **Closed:** Floating chat bubble icon (bottom-right corner, above fold)
2. **Open:** Panel with remaining count, Hebrew text input, rotating placeholder, Submit button
3. **Loading:** Banner area shows shimmer/spinner overlay while Gemini generates
4. **Preview:** New banner shown with Accept/Reject floating buttons
5. **Accepted:** Landing URL re-fetched, panel closes
6. **Limit reached:** Input disabled, message shown, Revert button still available

### Anti-Patterns to Avoid

- **Reading `document.cookie` on the client to check auth:** HttpOnly cookies are not accessible from JS. Use server-side check only (pass `isInstructor` prop).
- **Sending base64 images in both directions unnecessarily:** The `/api/refine-banner` route fetches the current image by URL server-side. The client never handles large base64 blobs.
- **Regenerating from scratch without the existing image:** Passing the current image via `inlineData` is what makes it a true refinement (the model modifies the image) rather than generating a new one. Always include `inlineData`.
- **Storing the refinement counter client-side only:** Counter must persist in the landing JSON (Vercel Blob) so it survives page reloads and is the source of truth.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image editing capability | Custom image manipulation / canvas transforms | Gemini `inlineData` + text instruction | Gemini handles natural language edits (color, style, mood) in Hebrew natively |
| Auth check on `/l/[id]` | Middleware redirect for landing pages | Server Component `cookies()` + prop | Landing pages are public; only the instructor toolbar is gated, not the page |
| State persistence for counter | localStorage or React state | JSON field in Vercel Blob | Must survive navigation; already the project pattern for all landing data |
| Base64 streaming to client | Streaming base64 chunks | Return complete base64 in JSON response, same as existing `/api/banner` | Simplest pattern already working in this codebase |

**Key insight:** The existing `/api/banner/route.ts` is a near-complete template for refinement. The only addition is fetching the current image and passing it as `inlineData`. The response format (`banner`, `background`, `colors`) stays identical.

---

## Common Pitfalls

### Pitfall 1: Hebrew Text Destroyed During Refinement

**What goes wrong:** Gemini changes or garbles the Hebrew text on the banner when the instructor asks for a visual change (e.g., "darker background"). The model interprets the instruction too broadly and regenerates text.

**Why it happens:** The model treats the entire image as editable unless explicitly told to preserve text.

**How to avoid:** Prefix every refinement prompt with an explicit instruction: "Keep all Hebrew text exactly as it appears: [title], [subtitle]. Only change [what was asked]." Include the original Hebrew text from `courseData` in the refinement request payload.

**Warning signs:** Banner returned without Hebrew text, or with different/garbled Hebrew.

### Pitfall 2: 20MB Request Size Limit

**What goes wrong:** `generateContent` returns 413 or silently fails when the image payload exceeds limits.

**Why it happens:** Gemini API has a 20MB total request size limit for inline data. A 16:9 PNG banner at high quality can be 3-8MB as base64 (base64 adds ~33% overhead). Two images (banner + background) sent in two separate calls each stay under the limit.

**How to avoid:** Send banner and background as separate `generateContent` calls (already the pattern in `/api/banner/route.ts` with `Promise.all`). Do not combine both images in one call.

**Warning signs:** HTTP 413, empty response, or "Request too large" error from Gemini.

### Pitfall 3: Vercel Function Timeout on Refinement

**What goes wrong:** `/api/refine-banner` times out after 10s (Vercel default) because two Gemini image calls in parallel can take 20-40s.

**Why it happens:** Default Vercel serverless function timeout is 10s. Image generation takes 15-30s.

**How to avoid:** Add `export const maxDuration = 60;` to the route file — same as the existing `/api/banner/route.ts`. This is already a known pattern in the codebase (STATE.md records this fix from Phase 2).

**Warning signs:** 504 Gateway Timeout from Vercel.

### Pitfall 4: `isInstructor` Shows UI to All Users of Same Account

**What goes wrong:** Any logged-in instructor sees the editing panel on all landings, not just their own.

**Why it happens:** Auth check only verifies "is a valid session" not "is the creator of this landing."

**How to avoid:** Compare `session.username === data.instructorEmail` (the email stored at creation time). Only the creating instructor sees the editing panel. This field was added to `LandingPageData` in Phase 2.

**Warning signs:** Instructor A can edit Instructor B's landing page.

### Pitfall 5: Original Banner URL Lost After First Refinement

**What goes wrong:** After accepting the first refinement, the original banner URL is overwritten. "Revert to original" has nothing to restore to.

**Why it happens:** `saveLanding` overwrites `assets.bannerUrl` without preserving the previous value.

**How to avoid:** On the first-ever accept, copy the current `assets.bannerUrl` and `assets.backgroundUrl` into `refinements.originalBannerUrl` and `refinements.originalBackgroundUrl` before overwriting. In the PATCH route, check `if (!landing.refinements?.originalBannerUrl)` to know if this is the first refinement.

**Warning signs:** "Revert to original" restores to the first refinement, not the Gemini-generated banner.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Gemini Image Editing (inlineData pattern)

```typescript
// Source: https://ai.google.dev/gemini-api/docs/image-generation#image-editing
const imageResponse = await fetch(existingBannerUrl);
const imageBuffer = await imageResponse.arrayBuffer();
const imageBase64 = Buffer.from(imageBuffer).toString("base64");

const response = await client.models.generateContent({
  model: MODEL,
  contents: [{
    role: "user",
    parts: [
      { text: "תעשה את הרקע כהה יותר. שמור על כל הטקסט בעברית כפי שהוא." },
      { inlineData: { mimeType: "image/png", data: imageBase64 } },
    ],
  }],
  config: { responseModalities: ["TEXT", "IMAGE"] },
});
// extractImageFromResponse(response) — same helper as /api/banner/route.ts
```

### PATCH Landing JSON (accept refinement)

```typescript
// app/api/landing/[id]/route.ts
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return Response.json({ ok: false }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return Response.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const landing = await getLanding(id);
  if (!landing) return Response.json({ ok: false }, { status: 404 });
  if (landing.instructorEmail !== session.username) return Response.json({ ok: false }, { status: 403 });

  // Preserve original URLs on first refinement
  const existingRefinements = landing.refinements ?? { count: 0, limit: 5 };
  const originalBannerUrl = existingRefinements.originalBannerUrl ?? landing.assets.bannerUrl;
  const originalBackgroundUrl = existingRefinements.originalBackgroundUrl ?? landing.assets.backgroundUrl;

  const updated = {
    ...landing,
    assets: { bannerUrl: body.bannerUrl, backgroundUrl: body.backgroundUrl },
    theme: body.theme ?? landing.theme,
    refinements: {
      count: body.refinementsCount,
      limit: existingRefinements.limit,
      originalBannerUrl,
      originalBackgroundUrl,
    },
  };

  await saveLanding(id, updated);
  return Response.json({ ok: true });
}
```

### RefinementPanel Skeleton (client component)

```typescript
// components/landing/RefinementPanel.tsx
"use client";

import { useState } from "react";

const PLACEHOLDER_EXAMPLES = [
  "תעשה את הרקע כהה יותר",
  "שנה את הצבעים לטונים חמים",
  "הוסף אפקט מקצועי לתמונה",
  "תעשה את הסגנון מינימליסטי יותר",
  "שנה לתאורת לילה",
];

interface RefinementPanelProps {
  landingId: string;
  currentBannerUrl?: string;
  currentBackgroundUrl?: string;
  originalBannerUrl?: string;
  originalBackgroundUrl?: string;
  refinementsUsed: number;
  refinementLimit: number;
}

export function RefinementPanel({ landingId, currentBannerUrl, currentBackgroundUrl, originalBannerUrl, originalBackgroundUrl, refinementsUsed, refinementLimit }: RefinementPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<{ banner: string; background: string; colors: object } | null>(null);
  const [used, setUsed] = useState(refinementsUsed);
  const remaining = refinementLimit - used;
  const canRefine = remaining > 0;

  // ... submit, accept, reject, revert handlers
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate image editing API (Imagen Edit) | Native `inlineData` edit in `generateContent` | 2024-2025 (Gemini 2.0+) | No separate endpoint needed; same call as generation |
| File API required for images | Inline base64 for images under 20MB | Gemini 2.0 release | Simpler for banner-sized images |
| `middleware.ts` in Next.js | `proxy.ts` in Next.js 16 | Next.js 16 release | Already established in this project |

**Deprecated/outdated:**
- Multi-turn conversation history for image editing: While Gemini supports it, this phase does NOT need conversation history (single instruction per refinement, no history UI). Pass only the current image + new instruction each time.

---

## Open Questions

1. **Does `gemini-3-pro-image-preview` support `inlineData` image input for editing?**
   - What we know: Official docs confirm image editing via inlineData for `gemini-2.0-flash` and `gemini-3.1-flash-image-preview`. The `gemini-3-pro-image-preview` model is described as a higher-quality variant.
   - What's unclear: Whether `gemini-3-pro-image-preview` (the model locked by `CLAUDE.md`) specifically supports the edit-from-image path. It is a preview model and API surface may differ.
   - Recommendation: Test the image editing call against `gemini-3-pro-image-preview` first in the implementation wave. If it fails (no image in output), fall back to `gemini-2.0-flash-image` for the refinement route only, and document this. The `CLAUDE.md` lock "Do NOT downgrade the Gemini model" applies to generation quality; editing with a different model is a different use case.

2. **Rotating placeholder UX — state or static array?**
   - What we know: No library is needed; a simple array cycle on focus or interval works.
   - What's unclear: Whether rotation should be on interval (auto-rotating) or on input focus only.
   - Recommendation: Use an index that cycles on a 3-second interval while the input is empty. Stop rotation once the user types.

---

## Sources

### Primary (HIGH confidence)
- [Gemini API Image Generation Docs](https://ai.google.dev/gemini-api/docs/image-generation) — `inlineData` editing pattern confirmed
- Existing codebase `/api/banner/route.ts` — `generateContent` pattern, `extractImageFromResponse`, parallel generation, `maxDuration=60`
- Existing `lib/storage.ts` — `saveLanding`, `saveImage`, `getLanding` patterns
- Existing `lib/auth.ts` — `verifySessionToken`, `SESSION_COOKIE_NAME`
- Existing `types/landing.ts` — current `LandingPageData` schema with `instructorEmail`

### Secondary (MEDIUM confidence)
- [Next.js cookies() API reference](https://nextjs.org/docs/app/api-reference/functions/cookies) — async `cookies()` in Server Components
- [Gemini image editing quickstart](https://github.com/google-gemini/gemini-image-editing-nextjs-quickstart) — confirms inlineData pattern in Next.js

### Tertiary (LOW confidence)
- Whether `gemini-3-pro-image-preview` specifically supports image input for editing (preview model, unverified — see Open Questions)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, patterns verified in existing code
- Architecture: HIGH — follows established project conventions (proxy auth, saveLanding, API routes)
- Gemini editing API: MEDIUM-HIGH — inlineData pattern confirmed in official docs, model-specific support for preview model unverified
- Pitfalls: HIGH — derived from existing codebase patterns and known Vercel/Gemini constraints

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (Gemini preview models change frequently; re-check model support if implementation is delayed)
