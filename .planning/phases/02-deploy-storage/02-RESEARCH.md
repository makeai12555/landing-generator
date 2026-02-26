# Phase 2: Deploy + Storage - Research

**Researched:** 2026-02-26
**Domain:** Vercel Blob storage migration + Next.js production deployment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Deploy to existing Vercel project `courseflow-landing` (default vercel.app URL)
- No custom domain — `courseflow-landing.vercel.app` is the production URL
- Landing page URLs: `courseflow-landing.vercel.app/l/[id]` with generated IDs (current format)
- Auto-deploy on push to master via GitHub integration
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPL-01 | Landing data persists on Vercel (migrate from fs.writeFile to Vercel Blob) | @vercel/blob `put`/`get` pattern; private access for JSON; public access for images |
| DEPL-02 | App is deployed on Vercel with all env vars configured | BLOB_READ_WRITE_TOKEN auto-provisioned; NEXT_PUBLIC_BASE_URL replaced by VERCEL_PROJECT_PRODUCTION_URL |
| DEPL-03 | Instructors can share production URLs to landing pages | Public landing pages at `/l/[id]` — no auth required, already implemented in route |
</phase_requirements>

---

## Summary

The app currently stores landing JSON and banner images via `fs.writeFile`/`fs.readFile` into `data/landings/*.json`. On Vercel's serverless runtime this filesystem is read-only — writes silently fail with `EROFS`. Migration to `@vercel/blob` fixes this permanently with a minimal API change: `writeFile` → `put`, `readFile` → `fetch(blobUrl)`.

The banner images are currently returned as base64 data URIs embedded in the JSON (see `assets.backgroundUrl` and `assets.bannerUrl`). These can be large (1–3 MB each as base64). The right strategy is to store banner/background images as separate public blobs, then write only the blob URL into the JSON landing record. This keeps landing JSON small and makes image loading fast via CDN.

The Vercel deployment itself is straightforward: the project `courseflow-landing` already exists on the team `makeai12555s-projects`. The only new env var needed is `BLOB_READ_WRITE_TOKEN` (auto-generated when the Blob store is created in the Vercel dashboard). All other secrets carry over from `.env.local`. One critical fix required: `NEXT_PUBLIC_BASE_URL` hardcoded to `localhost:3000` must be updated to use `VERCEL_PROJECT_PRODUCTION_URL` (a system env var Vercel provides automatically).

**Primary recommendation:** Use `@vercel/blob` with `access: 'private'` for JSON landing data and `access: 'public'` for banner images. Store JSON at `landings/{id}.json`, images at `banners/{id}-banner.png` and `banners/{id}-background.png`. Replace all `fs` calls in 2 files: `app/api/create-landing/route.ts` and `app/api/landing/[id]/route.ts`. Set `maxDuration = 60` on the banner route.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/blob` | latest | Store/retrieve blobs (JSON + images) | Official Vercel storage, free 1 GB tier, auto-tokenized in same project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vercel` CLI | latest | `vercel env pull` to sync BLOB_READ_WRITE_TOKEN locally | Local dev against real Blob store |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vercel/blob` | `@vercel/kv` (Redis) | KV is better for key-value lookups but overkill for JSON blobs; Blob is simpler and already decided |
| `@vercel/blob` | AWS S3 / Supabase Storage | External services add complexity; Blob is native to Vercel project |

**Installation:**
```bash
npm install @vercel/blob
```

---

## Architecture Patterns

### Storage Layout in Blob Store

```
Blob store (private):
  landings/{id}.json          ← Landing page data (JSON)

Blob store (public):
  banners/{id}-banner.png     ← Marketing banner image
  banners/{id}-background.png ← Hero background image
```

**Reason for split access:** Landing JSON contains `sheetId` (a Google Sheets ID) — keep private. Banner images are shown to unauthenticated visitors on `/l/[id]` — must be public.

### Pattern 1: Write Landing JSON to Blob

**What:** Replace `fs.writeFile` with `blob.put()` using `allowOverwrite: true` and `access: 'private'`

**When to use:** In `POST /api/create-landing`

```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob';

const { url: blobUrl } = await put(
  `landings/${landingId}.json`,
  JSON.stringify(landingData),
  {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
  }
);
```

### Pattern 2: Read Landing JSON from Blob

**What:** Replace `fs.readFile` with a `fetch()` call to the blob URL. The `head()` method is used to look up the URL by pathname.

**When to use:** In `GET /api/landing/[id]`

```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { head } from '@vercel/blob';

try {
  const blobMeta = await head(`landings/${id}.json`);
  // blobMeta.url is the authenticated URL for private blobs
  const res = await fetch(blobMeta.url);
  const landing = await res.json();
  return Response.json(landing);
} catch {
  // BlobNotFoundError → return 404
  return new Response('Not Found', { status: 404 });
}
```

**Alternative:** Store the blob URL in a separate index (e.g., another blob `index.json`). For this scale (50 instructors), `head()` by pathname is simpler and sufficient.

### Pattern 3: Store Banner Images to Blob

**What:** In `POST /api/banner`, instead of returning base64 to the client, upload images to Blob and return public URLs.

**Current flow:** `banner route → returns base64 → client stores in localStorage → create-landing saves base64 in JSON`

**New flow:** `banner route → upload to Blob → return public URL → client stores URL → create-landing saves URL in JSON`

```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob';

// bannerBytes is Uint8Array from Gemini
const { url: bannerUrl } = await put(
  `banners/${landingId}-banner.png`,
  Buffer.from(bannerBytes),
  { access: 'public', contentType: 'image/png', allowOverwrite: true }
);
```

**Note:** The banner route currently does not receive a `landingId` — it is called before the landing is created. Two options:
1. Generate `landingId` early (in the banner route) and pass it back to the client for later use in `create-landing`
2. Use a temporary UUID in the banner route; `create-landing` uses the same ID

Option 1 is cleaner. Generate the `landingId` in the banner API, store images as `banners/{tempId}-banner.png`, return both the URLs and the `tempId` to the client. `create-landing` receives the `tempId` and uses it as the final landing ID.

**Alternatively (simpler):** Keep base64 in-transit through the client flow but upload to Blob inside `create-landing`. The `create-landing` route receives the base64 strings, uploads them to Blob, stores the resulting URLs in the JSON. This avoids changing the banner route's interface.

**Recommendation:** Upload images inside `create-landing` (simpler, fewer interface changes). The banner route stays unchanged — it returns base64 to the client as today. `create-landing` receives base64, uploads to Blob, stores the URLs.

### Pattern 4: Base URL for Server-Side Fetches

**What:** Replace hardcoded `NEXT_PUBLIC_BASE_URL` with Vercel system variable

**Current code (broken in production):**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
```

**Fix:** Use `VERCEL_PROJECT_PRODUCTION_URL` (always the stable production domain):
```typescript
// Server-side only
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
```

- `VERCEL_PROJECT_PRODUCTION_URL` = `courseflow-landing.vercel.app` (no `https://`, always the production domain even in preview deployments)
- `VERCEL_URL` = current deployment's auto-generated URL (changes per deploy)
- Available at **both** build and runtime on Vercel (no need to set manually)

This fixes the logo fetch bug in `app/api/banner/route.ts` line 423.

### Pattern 5: Function Timeout for Banner Route

**What:** Banner generation takes 15–30 seconds. Vercel Hobby tier default is 10s; Pro is 15s (configurable to 60s).

**Fix:** Export `maxDuration` from the route file:

```typescript
// app/api/banner/route.ts (add at top)
// Source: https://vercel.com/docs/functions/configuring-functions/duration
export const maxDuration = 60; // seconds, requires Pro plan
```

**Note:** The team is on `makeai12555s-projects`. Verify whether this is a Hobby or Pro plan. If Hobby, max is 10s which will cause banner timeouts. Pro allows up to 300s (5 min).

### Anti-Patterns to Avoid
- **Storing base64 images in JSON blobs:** 1–3 MB per base64 string makes every JSON read slow. Store images as separate blobs, store URLs in JSON.
- **Using `fs.existsSync` / `fs.mkdirSync` in any API route:** Always fails on Vercel. No exceptions.
- **`cache: 'force-cache'` on landing page fetches:** Landing data can change (future phases). Keep `cache: 'no-store'` on `GET /api/landing/[id]`.
- **Setting `NEXT_PUBLIC_BASE_URL` to a specific domain:** Use system env vars instead; they auto-update across deployments.
- **Calling `list()` to find a landing by ID:** `O(N)` cost per request. Use `head(pathname)` to look up by deterministic path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent file storage | Custom S3 wrapper | `@vercel/blob` | Free 1GB, same project token, 3-line API |
| Production URL detection | Environment-sniffing logic | `VERCEL_PROJECT_PRODUCTION_URL` system var | Always correct, no config needed |
| Function timeout config | Custom response timeout wrapper | `export const maxDuration = N` in route file | Official Next.js/Vercel mechanism |

**Key insight:** All three hand-rolled solutions have edge cases. Vercel's built-in primitives handle them correctly by design.

---

## Common Pitfalls

### Pitfall 1: EROFS — Silent fs.writeFile Failure
**What goes wrong:** `writeFile` calls on Vercel serverless succeed locally, fail silently in production. The landing is "created" (returns a URL) but the JSON was never saved. Visiting the URL returns 404.
**Why it happens:** Vercel serverless functions have a read-only filesystem. Only `/tmp` is writable, but `/tmp` is ephemeral and not shared between invocations.
**How to avoid:** Replace ALL `fs.writeFile` and `fs.readFile` calls with `@vercel/blob` calls. There are exactly 2 files: `app/api/create-landing/route.ts` and `app/api/landing/[id]/route.ts`.
**Warning signs:** Landing created successfully in dev → 404 in production.

### Pitfall 2: Private Blob URL Expiry
**What goes wrong:** Private blob URLs returned by `head()` or `put()` are authenticated and expire. Storing them in the JSON record causes future reads to fail with 401/403.
**Why it happens:** Private blob URLs include a short-lived signature token.
**How to avoid:** Never store private blob URLs. Instead, store the **pathname** (`landings/{id}.json`) and call `head(pathname)` each time to get a fresh URL. For landing JSON reads, just use `head()` at runtime.
**Warning signs:** Landing page loads fine when first created → 403 error after some hours.

### Pitfall 3: Missing BLOB_READ_WRITE_TOKEN in Local Dev
**What goes wrong:** `@vercel/blob` calls fail locally with "missing token" error.
**Why it happens:** The token is auto-set on Vercel but not in `.env.local`.
**How to avoid:** After creating the Blob store in Vercel dashboard, run `vercel env pull .env.local` to pull the `BLOB_READ_WRITE_TOKEN` into local dev. Or add it manually from the Blob store settings page.
**Warning signs:** `Error: BLOB_READ_WRITE_TOKEN is not set` during local testing.

### Pitfall 4: Banner Base64 Bloating JSON
**What goes wrong:** Storing base64 banner images (1–3 MB each, `data:image/png;base64,...`) inside the landing JSON means every landing read downloads 2–6 MB before rendering.
**Why it happens:** The current `/api/banner` returns base64 which flows through localStorage and ends up in the JSON.
**How to avoid:** Upload images to Blob as separate blobs, store only the URL in the JSON. Images are served from Vercel's CDN, not from function runtime.
**Warning signs:** `assets.backgroundUrl` or `assets.bannerUrl` values start with `data:image/`.

### Pitfall 5: Banner Route Timeout in Production
**What goes wrong:** Banner generation (2 parallel Gemini calls) takes 15–30 seconds. Vercel times out the function at 10s (Hobby) or 15s (Pro default).
**Why it happens:** No `maxDuration` export, so the function uses the plan default.
**How to avoid:** Add `export const maxDuration = 60;` to `app/api/banner/route.ts`. Verify the plan supports 60s (Pro required).
**Warning signs:** 504 errors during banner generation in production.

### Pitfall 6: `NEXT_PUBLIC_BASE_URL` Not Set in Production
**What goes wrong:** Logo fetches in the banner API fail because the URL resolves to `http://localhost:3000/public/brand/...` in production.
**Why it happens:** Fallback `|| "http://localhost:3000"` is used when `NEXT_PUBLIC_BASE_URL` is not set.
**How to avoid:** Use `VERCEL_PROJECT_PRODUCTION_URL` system variable instead. It's automatically available; no env var setup required.
**Warning signs:** Logos missing from generated banners in production (no error — just silent fetch failure).

---

## Code Examples

Verified patterns from official Vercel Blob SDK documentation:

### Save Landing JSON to Blob (replaces fs.writeFile)
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob';

await put(
  `landings/${landingId}.json`,
  JSON.stringify(landingData),
  {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
  }
);
```

### Read Landing JSON from Blob (replaces fs.readFile)
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { head } from '@vercel/blob';
import { BlobNotFoundError } from '@vercel/blob';

try {
  const meta = await head(`landings/${id}.json`);
  const res = await fetch(meta.url);
  if (!res.ok) return new Response('Not Found', { status: 404 });
  const landing = await res.json();
  return Response.json(landing);
} catch (err) {
  if (err instanceof BlobNotFoundError) {
    return new Response('Not Found', { status: 404 });
  }
  throw err;
}
```

### Upload Banner Image to Blob (inside create-landing)
```typescript
// Source: https://vercel.com/docs/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob';

// bannerBase64 = "data:image/png;base64,..."
const base64Data = bannerBase64.replace(/^data:image\/\w+;base64,/, '');
const bannerBuffer = Buffer.from(base64Data, 'base64');

const { url: bannerBlobUrl } = await put(
  `banners/${landingId}-banner.png`,
  bannerBuffer,
  { access: 'public', contentType: 'image/png', allowOverwrite: true }
);

const { url: backgroundBlobUrl } = await put(
  `banners/${landingId}-background.png`,
  Buffer.from(backgroundBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
  { access: 'public', contentType: 'image/png', allowOverwrite: true }
);
```

### Production Base URL (server-side)
```typescript
// Source: https://vercel.com/docs/environment-variables/system-environment-variables
function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}
```

### Banner Route Timeout
```typescript
// Source: https://vercel.com/docs/functions/configuring-functions/duration
export const maxDuration = 60; // requires Pro plan
export const runtime = "nodejs"; // already set in banner route
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fs.writeFile` to disk | `@vercel/blob` put/head | N/A (Vercel always had read-only FS) | Required for any persistent storage on serverless |
| Manual `NEXT_PUBLIC_BASE_URL` env var | `VERCEL_PROJECT_PRODUCTION_URL` system var | Vercel always provided system vars | No manual config needed |
| vercel.json `functions` timeout | `export const maxDuration` in route file | Next.js 13.5+ | Per-route control, no JSON config needed |

**Deprecated/outdated:**
- `fs.writeFile`/`fs.readFile` for landing data: not usable on Vercel serverless
- `process.env.NEXT_PUBLIC_BASE_URL` hardcoded fallback: brittle; use Vercel system vars

---

## Open Questions

1. **Vercel plan tier (Hobby vs Pro)**
   - What we know: Pro plan allows `maxDuration` up to 300s; Hobby caps at 10s
   - What's unclear: Is the `makeai12555s-projects` team on Hobby or Pro?
   - Recommendation: Check the Vercel dashboard. If Hobby, banner generation will timeout in production. Pro ($20/month) is required if banner gen takes >10s. The planner should add a verification step to confirm the plan before setting `maxDuration`.

2. **`instructorEmail` field in landing JSON**
   - What we know: STATE.md notes this field should be added in Phase 2 to avoid a later migration for Phase 5 (feedback emails to registrants)
   - What's unclear: Where does `instructorEmail` come from at create-landing time? The auth session exists but the route currently doesn't read the session.
   - Recommendation: Add `instructorEmail` as an optional field in the landing JSON schema during this phase. Extract it from the session cookie using `getSession()` from `lib/auth.ts` inside `create-landing`. Default to empty string if not available.

---

## Sources

### Primary (HIGH confidence)
- `https://vercel.com/docs/vercel-blob/using-blob-sdk` — Full `put`, `get`, `head`, `del`, `list` API with TypeScript examples
- `https://vercel.com/docs/environment-variables/system-environment-variables` — `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` definitions and availability
- `https://vercel.com/docs/functions/configuring-functions/duration` — `maxDuration` export syntax (verified via WebSearch + official Vercel docs URL)

### Secondary (MEDIUM confidence)
- WebSearch results for `@vercel/blob` npm confirming `put`/`head`/`list`/`del`/`get` methods and 1GB free tier

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official Vercel docs confirm `@vercel/blob` API
- Architecture: HIGH — patterns derived directly from official SDK docs
- Pitfalls: HIGH — EROFS is documented behavior, private URL expiry confirmed in official docs, timeout limits confirmed
- Open questions: MEDIUM — Vercel plan tier requires dashboard check

**Research date:** 2026-02-26
**Valid until:** 2026-05-26 (90 days — Vercel Blob is stable, GA product)
