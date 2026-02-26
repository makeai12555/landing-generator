import { put, head, BlobNotFoundError } from "@vercel/blob";
import type { LandingPageData } from "@/types/landing";

/**
 * Save landing JSON to Vercel Blob (private, overwrite allowed).
 */
export async function saveLanding(id: string, data: object): Promise<void> {
  await put(`landings/${id}.json`, JSON.stringify(data), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}

/**
 * Retrieve landing JSON from Vercel Blob.
 * Returns null if the blob does not exist.
 */
export async function getLanding(id: string): Promise<LandingPageData | null> {
  try {
    const meta = await head(`landings/${id}.json`);
    const response = await fetch(meta.url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as LandingPageData;
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    // Re-throw unexpected errors
    throw err;
  }
}

/**
 * Upload a base64 data-URI image to Vercel Blob as a public asset.
 * Returns the public blob URL.
 */
export async function saveImage(
  path: string,
  base64DataUri: string
): Promise<string> {
  // Strip the data:image/...;base64, prefix
  const base64 = base64DataUri.replace(/^data:image\/[a-z+]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const blob = await put(path, buffer, {
    access: "public",
    contentType: "image/png",
    allowOverwrite: true,
  });
  return blob.url;
}

/**
 * Return the base URL of the application.
 * Prefers VERCEL_PROJECT_PRODUCTION_URL (set automatically by Vercel),
 * then NEXT_PUBLIC_BASE_URL, then falls back to localhost.
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}
