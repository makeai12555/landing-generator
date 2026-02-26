import { getLanding } from "@/lib/storage";

// GET /api/landing/[id] - Fetch from Vercel Blob or Google Apps Script fallback
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // First, try to load from Vercel Blob
  const landing = await getLanding(id);
  if (landing) {
    console.log(`Loaded landing from Blob: ${id}`);
    return Response.json(landing);
  }

  console.log(`Landing ${id} not found in Blob, trying Apps Script...`);

  // Fallback to Apps Script
  const base = process.env.APPS_SCRIPT_URL;
  if (!base) {
    console.error("APPS_SCRIPT_URL missing and no Blob entry found");
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(base);
  url.searchParams.set("action", "getLanding");
  url.searchParams.set("id", id);

  try {
    const r = await fetch(url.toString(), { cache: "no-store" });
    const data = await r.json();

    if (!data?.success) {
      console.error(`Apps Script returned no success for ${id}:`, data);
      return new Response("Not Found", { status: 404 });
    }

    return Response.json(data.landing);
  } catch (error) {
    console.error(`Failed to fetch from Apps Script:`, error);
    return new Response("Not Found", { status: 404 });
  }
}
